const { guard } = require('./_lib/security');
const { pickModels, complete, orKey, hasAnyKey } = require('./_lib/openrouter');

const MAX_PROMPT_CHARS = 60000;
const MAX_TOKENS_CAP = 8000;

module.exports = async function handler(req, res) {
  if (guard(req, res, 120)) return;

  const reqId = Math.random().toString(36).slice(2, 8);
  const { system, messages, max_tokens } = req.body || {};

  if (!hasAnyKey()) {
    return res.status(500).json({
      error: 'No API key found in this deployment. Add OPENROUTER_API_KEY (or GROQ_API_KEY) in Vercel, tick Production AND Preview, then Redeploy. Open /api/health on this site to see which variables this deployment can see.',
    });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided.' });
  }

  // The page pings this endpoint on load to show the status badge.
  // Answer that locally so it doesn't spend a model request.
  if (system === 'Reply READY' && Number(max_tokens) <= 5) {
    return res.status(200).json({
      text: 'READY',
      content: [{ type: 'text', text: 'READY' }],
      choices: [{ message: { role: 'assistant', content: 'READY' } }],
      model: 'AI ready',
      reqId,
    });
  }

  const prompt = [(system || ''), ...messages.map(m => m && m.content)]
    .filter(Boolean)
    .join('\n\n');

  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ error: 'Prompt too long.' });
  }

  const tokens = Math.min(Number(max_tokens) || 2000, MAX_TOKENS_CAP);
  const key = orKey();
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
