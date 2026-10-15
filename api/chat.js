const { guard } = require('./_lib/security');

const MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'google/gemini-flash-1.5-8b',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
];

const MAX_PROMPT_CHARS = 60000;
const MAX_TOKENS_CAP = 8000;

module.exports = async function handler(req, res) {
  if (guard(req, res)) return;

  const reqId = Math.random().toString(36).slice(2, 8);
  const { system, messages, max_tokens } = req.body || {};
  const key = process.env.OPENROUTER_API_KEY;

  if (!key) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY not set in Vercel Environment Variables.' });
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
  let lastError = 'unknown error';

  for (const model of MODELS) {
    console.log(JSON.stringify({ reqId, model, stage: 'attempt' }));
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(25000),
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
        lastError = `${model} returned HTTP ${r.status}`;
        console.log(JSON.stringify({ reqId, model, stage: 'failed', error: lastError }));
        continue;
      }

      const data = await r.json();
      const text = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : null;

      if (!text) {
        lastError = `${model} returned an empty response`;
        console.log(JSON.stringify({ reqId, model, stage: 'failed', error: lastError }));
        continue;
      }

      console.log(JSON.stringify({ reqId, model, stage: 'success' }));
      return res.status(200).json({
        text,
        content: [{ type: 'text', text }],
        choices: [{ message: { role: 'assistant', content: text } }],
        model,
        reqId,
      });
    } catch (err) {
      lastError = `${model}: ${String(err)}`;
      console.log(JSON.stringify({ reqId, model, stage: 'failed', error: lastError }));
    }
  }

  return res.status(502).json({ error: 'All models failed.', detail: lastError, reqId });
};
