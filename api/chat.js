const { guard } = require('./_lib/security');

const API = 'https://openrouter.ai/api/v1';
const MAX_PROMPT_CHARS = 60000;
const MAX_TOKENS_CAP = 8000;
const MAX_MODELS_TRIED = 5;
const TOTAL_BUDGET_MS = 45000;
const PER_MODEL_TIMEOUT_MS = 20000;

let cache = { at: 0, ids: [] };

// Ask OpenRouter which free text models exist right now, instead of hardcoding IDs that get retired.
async function liveFreeModels(key) {
  if (cache.ids.length && Date.now() - cache.at < 10 * 60 * 1000) return cache.ids;
  try {
    const r = await fetch(`${API}/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return cache.ids;
    const body = await r.json();
    const ids = (body.data || [])
      .filter(m => m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0)
      .filter(m => {
        const out = m.architecture && m.architecture.output_modalities;
        return !out || out.every(x => x === 'text');
      })
      .filter(m => !m.id.startsWith('stealth/') && !m.id.startsWith('openrouter/'))
      .sort((a, b) => (b.context_length || 0) - (a.context_length || 0))
      .map(m => m.id);
    if (ids.length) cache = { at: Date.now(), ids };
    return cache.ids;
  } catch (e) {
    return cache.ids;
  }
}

async function candidateModels(key) {
  // Optional override: set FREE_MODELS in Vercel to a comma-separated list to pin specific models.
  const pinned = (process.env.FREE_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
  const live = await liveFreeModels(key);
  const all = [...pinned, 'openrouter/free', ...live];
  return [...new Set(all)].slice(0, MAX_MODELS_TRIED);
}

module.exports = async function handler(req, res) {
  if (guard(req, res, 120)) return;

  const reqId = Math.random().toString(36).slice(2, 8);
  const { system, messages, max_tokens } = req.body || {};
  const key = process.env.OPENROUTER_API_KEY;

  if (!key) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not set in Vercel Environment Variables (check that it is enabled for this environment: Production/Preview).' });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided.' });
  }

  const prompt = [(system || ''), ...messages.map(m => m && m.content)]
    .filter(Boolean)
    .join('\n\n');

  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ error: 'Prompt too long.' });
  }

  const tokens = Math.min(Number(max_tokens) || 2000, MAX_TOKENS_CAP);
  const models = await candidateModels(key);
  const attempts = [];
  const started = Date.now();

  for (const model of models) {
    if (Date.now() - started > TOTAL_BUDGET_MS) {
      attempts.push('stopped: time budget used up');
      break;
    }
    console.log(JSON.stringify({ reqId, model, stage: 'attempt' }));
    try {
      const r = await fetch(`${API}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(PER_MODEL_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': 'https://wizgame-nine.vercel.app',
          'X-Title': 'WizGame',
        },
        body: JSON.stringify({
          model,
          max_tokens: tokens,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!r.ok) {
        let detail = '';
        try { detail = (await r.text()).replace(/\s+/g, ' ').slice(0, 140); } catch (e) {}
        attempts.push(`${model} -> HTTP ${r.status} ${detail}`);
        console.log(JSON.stringify({ reqId, model, stage: 'failed', status: r.status, detail }));
        if (r.status === 401 || r.status === 403) {
          return res.status(502).json({
            error: `OpenRouter rejected the API key (HTTP ${r.status}). Create a new key at openrouter.ai/keys and update OPENROUTER_API_KEY in Vercel, then redeploy.`,
            reqId,
          });
        }
        continue;
      }

      const data = await r.json();
      if (data.error) {
        const msg = (data.error.message || JSON.stringify(data.error)).slice(0, 140);
        attempts.push(`${model} -> ${msg}`);
        console.log(JSON.stringify({ reqId, model, stage: 'failed', error: msg }));
        continue;
      }

      const text = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : null;

      if (!text) {
        attempts.push(`${model} -> empty response`);
        console.log(JSON.stringify({ reqId, model, stage: 'failed', error: 'empty response' }));
        continue;
      }

      const usedModel = data.model || model;
      console.log(JSON.stringify({ reqId, model: usedModel, stage: 'success' }));
      return res.status(200).json({
        text,
        content: [{ type: 'text', text }],
        choices: [{ message: { role: 'assistant', content: text } }],
        model: usedModel,
        reqId,
      });
    } catch (err) {
      attempts.push(`${model} -> ${String(err).slice(0, 100)}`);
      console.log(JSON.stringify({ reqId, model, stage: 'failed', error: String(err) }));
    }
  }

  return res.status(502).json({
    error: 'All models failed. ' + (attempts.length ? attempts.join(' | ') : 'No models available.'),
    reqId,
  });
};
