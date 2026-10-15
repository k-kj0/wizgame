const { guard } = require('./_lib/security');
const { pickModels, complete } = require('./_lib/openrouter');

const MAX_PROMPT_CHARS = 60000;
const MAX_TOKENS_CAP = 8000;

module.exports = async function handler(req, res) {
  if (guard(req, res, 120)) return;

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
  const models = await pickModels(key);
  const result = await complete({
    key,
    models,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: tokens,
    siteUrl: process.env.SITE_URL || `https://${req.headers.host}`,
  });

  console.log(JSON.stringify({ reqId, ok: result.ok, model: result.model, attempts: result.attempts }));

  if (result.ok) {
    const text = result.text;
    return res.status(200).json({
      text,
      content: [{ type: 'text', text }],
      choices: [{ message: { role: 'assistant', content: text } }],
      model: result.model,
      reqId,
    });
  }

  return res.status(502).json({
    error: result.fatal || ('All models failed. ' + (result.attempts.length ? result.attempts.join(' | ') : 'No models available.')),
    reqId,
  });
};
