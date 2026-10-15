const API = 'https://openrouter.ai/api/v1';
const GROQ_API = 'https://api.groq.com/openai/v1';
const XAI_API = 'https://api.x.ai/v1';
const TTL_MS = 10 * 60 * 1000;
const BAD_MODEL_MS = 30 * 60 * 1000;
const DAILY_BLOCK_MS = 30 * 60 * 1000;
const MINUTE_COOLDOWN_MS = 60 * 1000;
const MAX_RETRY_WAIT_S = 8;

let modelCache = { at: 0, data: [] };
let groqCache = { at: 0, data: [] };
const badModels = new Map();   // model id -> time until which we skip it
let orBlockedUntil = 0;        // set when OpenRouter's daily free limit is hit

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ---------- keys ----------
// Keys are sorted by their format first (gsk_ = Groq, xai- = xAI, sk-or- = OpenRouter),
// so a key saved under the wrong variable name still gets used correctly.
function env(name) { return (process.env[name] || '').trim(); }

function classifyKeys() {
  const out = { openrouter: null, groq: null, xai: null };
  const sources = [
    ['OPENROUTER_API_KEY', 'openrouter'],
    ['GROQ_API_KEY', 'groq'],
    ['XAI_API_KEY', 'xai'],
    ['GROK_API_KEY', null], // ambiguous name: decide by prefix only
  ];
  sources.forEach(([name, defaultKind]) => {
    const v = env(name);
    if (!v) return;
    let kind = defaultKind;
    if (v.startsWith('gsk_')) kind = 'groq';
    else if (v.startsWith('xai-')) kind = 'xai';
    else if (v.startsWith('sk-or-')) kind = 'openrouter';
    if (kind && !out[kind]) out[kind] = v;
  });
  return out;
}

function orKey() { return classifyKeys().openrouter; }
function groqKey() { return classifyKeys().groq; }
function xaiKey() { return classifyKeys().xai; }
function hasAnyKey() { const k = classifyKeys(); return !!(k.openrouter || k.groq || k.xai); }

// ---------- shared helpers ----------
function isBad(id) {
  const until = badModels.get(id);
  if (!until) return false;
  if (Date.now() > until) { badModels.delete(id); return false; }
  return true;
}

function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(p => (p && p.text) || '').join('');
  return '';
}

function hasImages(messages) {
  return messages.some(m => Array.isArray(m.content) && m.content.some(p => p && p.type === 'image_url'));
}

// Groq accepts a limited number of images per request, so keep the first few.
function limitImages(messages, maxImages) {
  return messages.map(m => {
    if (!Array.isArray(m.content)) return m;
    let n = 0;
    const content = m.content.filter(p => {
      if (p && p.type === 'image_url') { n += 1; return n <= maxImages; }
      return true;
    });
    return Object.assign({}, m, { content });
  });
}

// One request to any OpenAI-compatible chat endpoint (OpenRouter, Groq or xAI).
async function callOnce({ url, key, model, messages, maxTokens, headers, timeoutMs }) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      }, headers || {}),
      body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
    });
    const bodyText = await r.text();
    if (!r.ok) {
      const ra = parseFloat(r.headers.get('retry-after'));
      return {
        ok: false, status: r.status, bodyText,
        retryAfter: Number.isFinite(ra) ? ra : null,
        detail: bodyText.replace(/\s+/g, ' ').slice(0, 140),
      };
    }
    let data;
    try { data = JSON.parse(bodyText); }
    catch (e) { return { ok: false, status: r.status, bodyText, detail: 'non-JSON response' }; }
    if (data.error) {
      const msg = (data.error.message || JSON.stringify(data.error)).slice(0, 140);
      return { ok: false, status: r.status, bodyText: JSON.stringify(data.error), detail: msg };
    }
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    const text = msg ? contentToText(msg.content) : '';
    if (!text) return { ok: false, status: r.status, bodyText: '', detail: 'empty response' };
    return { ok: true, text, model: data.model || model };
  } catch (err) {
    return { ok: false, status: 0, bodyText: '', detail: String(err).slice(0, 100) };
  }
}

// ---------- OpenRouter model discovery ----------
async function loadModels(key) {
  if (modelCache.data.length && Date.now() - modelCache.at < TTL_MS) return modelCache.data;
  try {
    const r = await fetch(`${API}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return modelCache.data;
    const body = await r.json();
    if (Array.isArray(body.data) && body.data.length) modelCache = { at: Date.now(), data: body.data };
  } catch (e) { /* fall back to whatever is cached */ }
  return modelCache.data;
}

function isFreeTextModel(m) {
  const p = m.pricing || {};
  const out = m.architecture && m.architecture.output_modalities;
  return Number(p.prompt) === 0
    && Number(p.completion) === 0
    && (!out || out.every(x => x === 'text'))
    && !m.id.startsWith('stealth/')
    && !m.id.startsWith('openrouter/');
}

// Ordered OpenRouter model IDs to try. Returns [] if there is no OpenRouter key.
// Optional Vercel env overrides: FREE_MODELS (chat) and VISION_MODELS (video), comma-separated.
async function pickModels(key, { vision = false, max = 5 } = {}) {
  if (!key) return [];
  const pinned = (process.env[vision ? 'VISION_MODELS' : 'FREE_MODELS'] || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const data = await loadModels(key);
  const live = data
    .filter(isFreeTextModel)
    .filter(m => !vision || ((m.architecture && m.architecture.input_modalities) || []).includes('image'))
    .sort((a, b) => (b.context_length || 0) - (a.context_length || 0))
    .map(m => m.id);
  return [...new Set([...pinned, 'openrouter/free', ...live])]
    .filter(id => !isBad(id))
    .slice(0, max);
}

// ---------- Groq model discovery ----------
async function loadGroqModels(key) {
  if (groqCache.data.length && Date.now() - groqCache.at < TTL_MS) return groqCache.data;
  try {
    const r = await fetch(`${GROQ_API}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return groqCache.data;
    const body = await r.json();
    if (Array.isArray(body.data) && body.data.length) groqCache = { at: Date.now(), data: body.data };
  } catch (e) { /* fall back to whatever is cached */ }
  return groqCache.data;
}

// Ordered Groq model IDs. Plain (non-reasoning) chat models first, because reasoning models
// can spend a small token budget on thinking and return an empty answer.
// Optional Vercel env override: GROQ_MODELS, comma-separated.
async function groqModels(key, vision, max = 4) {
  const pinned = (process.env.GROQ_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
  const data = await loadGroqModels(key);
  const usable = data.filter(m =>
    m.active !== false && !/whisper|tts|guard|embed|playai|orpheus|safeguard|compound/i.test(m.id));
  const pool = vision ? usable.filter(m => /scout|maverick|vision/i.test(m.id)) : usable;
  const prefs = [/llama-3\.3-70b/i, /llama-3\.1-8b/i, /llama/i, /gemma/i];
  const rank = id => { const i = prefs.findIndex(r => r.test(id)); return i === -1 ? 99 : i; };
  const ids = pool
    .sort((a, b) => rank(a.id) - rank(b.id) || (b.context_window || 0) - (a.context_window || 0))
    .map(m => m.id);
  return [...new Set([...pinned, ...ids])].filter(id => !isBad(id)).slice(0, max);
}

// ---------- messages ----------
const DAILY_LIMIT_MSG =
  'Daily free-model limit reached on your OpenRouter account (it is per account, so a new key does not help). ' +
  'It resets daily. To lift it now, add $10 in credits at openrouter.ai/settings/credits.';

const BAD_KEY_MSG =
  'OpenRouter rejected the API key (HTTP 401). Create a new key at openrouter.ai/keys, update OPENROUTER_API_KEY in Vercel, then redeploy.';

// Order: 1) OpenRouter models  2) Groq  3) xAI Grok (paid, needs an xai- key).
// `key` is the OpenRouter key and may be empty. Env switches: USE_GROQ=false, USE_GROK=false.
// Optional: GROK_MODEL (default "grok-latest").
async function complete({ key, models, messages, maxTokens, siteUrl, budgetMs = 45000, perModelMs = 20000 }) {
  const attempts = [];
  const extra = []; // failures from Groq / xAI, appended to the final error
  const started = Date.now();
  let fatal = null;

  // 1) OpenRouter
  if (!key) {
    attempts.push('openrouter skipped: no OpenRouter key in this deployment');
  } else if (Date.now() < orBlockedUntil) {
    attempts.push('openrouter skipped: daily free limit hit recently');
    fatal = DAILY_LIMIT_MSG;
  } else {
    for (const model of models) {
      if (Date.now() - started > budgetMs) { attempts.push('stopped: time budget used up'); break; }
      const r = await callOnce({
        url: `${API}/chat/completions`,
        key, model, messages, maxTokens,
        timeoutMs: perModelMs,
        headers: { 'HTTP-Referer': siteUrl || 'https://wizgame-nine.vercel.app', 'X-Title': 'WizGame' },
      });
      if (r.ok) return { ok: true, text: r.text, model: r.model, attempts };

      attempts.push(`${model} -> HTTP ${r.status} ${r.detail}`);
      if (r.status === 401) { fatal = BAD_KEY_MSG; break; }
      if (r.status === 429 && /free-models-per-day/i.test(r.bodyText)) {
        orBlockedUntil = Date.now() + DAILY_BLOCK_MS;
        fatal = DAILY_LIMIT_MSG;
        break;
      }
      if (r.status === 403 || r.status === 404) badModels.set(model, Date.now() + BAD_MODEL_MS);
      else if (r.status === 429) badModels.set(model, Date.now() + MINUTE_COOLDOWN_MS);
    }
  }

  // 2) Groq (waits and retries once on a short per-minute rate limit)
  const gk = groqKey();
  if (gk && process.env.USE_GROQ !== 'false') {
    const vision = hasImages(messages);
    const gModels = await groqModels(gk, vision);
    if (!gModels.length) extra.push('groq -> no usable models available right now (check the Groq key)');
    for (const model of gModels) {
      if (Date.now() - started > budgetMs + 15000) { extra.push('groq stopped: time budget used up'); break; }

      let r = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        r = await callOnce({
          url: `${GROQ_API}/chat/completions`,
          key: gk, model,
          messages: vision ? limitImages(messages, 5) : messages,
          maxTokens,
          timeoutMs: perModelMs,
        });
        if (r.ok) return { ok: true, text: r.text, model: r.model, attempts };

        const perMinute429 = r.status === 429 && !/per day|TPD|RPD/i.test(r.bodyText);
        if (perMinute429 && attempt === 0 && r.retryAfter && r.retryAfter <= MAX_RETRY_WAIT_S) {
          await sleep(r.retryAfter * 1000 + 250);
          continue;
        }
        break;
      }

      const line = `groq/${model} -> HTTP ${r.status} ${r.detail}`;
      attempts.push(line);
      extra.push(line);
      if (r.status === 401) break; // bad Groq key, no point trying other Groq models
      if (r.status === 429) {
        const daily = /per day|TPD|RPD/i.test(r.bodyText);
        badModels.set(model, Date.now() + (daily ? DAILY_BLOCK_MS : MINUTE_COOLDOWN_MS));
      } else if (r.status === 403 || r.status === 404) {
        badModels.set(model, Date.now() + BAD_MODEL_MS);
      }
    }
  }

  // 3) xAI Grok (paid)
  const xk = xaiKey();
  if (xk && process.env.USE_GROK !== 'false') {
    const model = process.env.GROK_MODEL || 'grok-latest';
    const r = await callOnce({
      url: `${XAI_API}/chat/completions`,
      key: xk, model, messages,
      maxTokens: Math.max(maxTokens, 1200), // reasoning models need room to think
      timeoutMs: 30000,
    });
    if (r.ok) return { ok: true, text: r.text, model: r.model, attempts };
    const line = `xai/${model} -> HTTP ${r.status} ${r.detail}`;
    attempts.push(line);
    extra.push(line);
  }

  if (fatal && extra.length) fatal += ' | ' + extra.join(' | ');
  return { ok: false, attempts, fatal };
}

module.exports = { pickModels, complete, orKey, hasAnyKey };
