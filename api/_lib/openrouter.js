const API = 'https://openrouter.ai/api/v1';
const TTL_MS = 10 * 60 * 1000;
const BAD_MODEL_MS = 30 * 60 * 1000;
let modelCache = { at: 0, data: [] };
const badModels = new Map(); // model id -> time until which we skip it

// Fetch the live model list from OpenRouter (cached) instead of hardcoding IDs that get retired.
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

function isBad(id) {
  const until = badModels.get(id);
  if (!until) return false;
  if (Date.now() > until) { badModels.delete(id); return false; }
  return true;
}

// Returns an ordered list of model IDs to try.
// Optional Vercel env overrides: FREE_MODELS (chat) and VISION_MODELS (video), comma-separated.
async function pickModels(key, { vision = false, max = 5 } = {}) {
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

function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(p => (p && p.text) || '').join('');
  return '';
}

const DAILY_LIMIT_MSG =
  'Daily free-model limit reached on your OpenRouter account. It resets daily. ' +
  'To lift it now, add $10 in credits at openrouter.ai/settings/credits ' +
  '(free models stay free, and the limit rises to 1000 requests per day).';

// Tries each model in order.
// Stops early on a bad key (401) or on the account-wide daily free limit; otherwise moves to the next model.
async function complete({ key, models, messages, maxTokens, siteUrl, budgetMs = 45000, perModelMs = 20000 }) {
  const attempts = [];
  const started = Date.now();

  for (const model of models) {
    if (Date.now() - started > budgetMs) { attempts.push('stopped: time budget used up'); break; }
    try {
      const r = await fetch(`${API}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(perModelMs),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': siteUrl || 'https://wizgame-nine.vercel.app',
          'X-Title': 'WizGame',
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
      });

      if (!r.ok) {
        let bodyText = '';
        try { bodyText = await r.text(); } catch (e) {}
        const detail = bodyText.replace(/\s+/g, ' ').slice(0, 140);
        attempts.push(`${model} -> HTTP ${r.status} ${detail}`);

        if (r.status === 401) {
          return {
            ok: false, attempts,
            fatal: 'OpenRouter rejected the API key (HTTP 401). Create a new key at openrouter.ai/keys, update OPENROUTER_API_KEY in Vercel, then redeploy.',
          };
        }
        if (r.status === 429 && /free-models-per-day/i.test(bodyText)) {
          return { ok: false, attempts, fatal: DAILY_LIMIT_MSG };
        }
        if (r.status === 403 || r.status === 404) {
          badModels.set(model, Date.now() + BAD_MODEL_MS);
        }
        continue;
      }

      const data = await r.json();
      if (data.error) {
        attempts.push(`${model} -> ${(data.error.message || JSON.stringify(data.error)).slice(0, 140)}`);
        continue;
      }

      const msg = data.choices && data.choices[0] && data.choices[0].message;
      const text = msg ? contentToText(msg.content) : '';
      if (!text) { attempts.push(`${model} -> empty response`); continue; }

      return { ok: true, text, model: data.model || model, attempts };
    } catch (err) {
      attempts.push(`${model} -> ${String(err).slice(0, 100)}`);
    }
  }
  return { ok: false, attempts };
}

module.exports = { pickModels, complete };
