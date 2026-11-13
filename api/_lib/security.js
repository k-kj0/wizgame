const hits = new Map(); // fallback when no shared store is configured: per-instance memory
const ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Shared counter for all serverless instances. Optional: set UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN (Upstash has a free tier). Returns null when not configured or on any error,
// so the caller falls back to the per-instance memory counter instead of blocking real users.
async function sharedCount(ip, windowMs) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const slot = Math.floor(Date.now() / windowMs);
  const key = `wizgame:rl:${ip}:${slot}`;
  try {
    const r = await fetch(url.replace(/\/$/, '') + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['EXPIRE', key, Math.ceil(windowMs / 1000) * 2]]),
      signal: AbortSignal.timeout(1500),
    });
    const data = await r.json();
    const n = Number(data && data[0] && data[0].result);
    return Number.isFinite(n) ? n : null;
  } catch (e) {
    return null;
  }
}

async function rateLimited(req, limit, windowMs = 60_000) {
  const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const shared = await sharedCount(ip, windowMs);
  if (shared !== null) return shared > limit;
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > limit;
}

// returns true if the request was fully handled (caller should return)
async function guard(req, res, limit = 60) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return true; }
  if (await rateLimited(req, limit)) { res.status(429).json({ error: 'Too many requests, slow down.' }); return true; }
  return false;
}

module.exports = { guard, rateLimited };
