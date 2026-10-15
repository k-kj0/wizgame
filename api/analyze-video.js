const { guard } = require('./_lib/security');
const { pickModels, complete, orKey, hasAnyKey } = require('./_lib/openrouter');

const MAX_FRAMES = 8;
const MAX_FRAME_CHARS = 600000;

module.exports = async function handler(req, res) {
  if (guard(req, res, 20)) return;

  const reqId = Math.random().toString(36).slice(2, 8);
  if (!hasAnyKey()) {
    return res.status(500).json({
      error: 'No API key found in this deployment. Add OPENROUTER_API_KEY (or GROQ_API_KEY) in Vercel, tick Production AND Preview, then Redeploy. Open /api/health on this site to see which variables this deployment can see.',
    });
  }

  const { frames, context } = req.body || {};
  if (!Array.isArray(frames) || frames.length === 0) {
    return res.status(400).json({ error: 'No frames provided.' });
  }
  const frameSlice = frames.slice(0, MAX_FRAMES);
  if (frameSlice.some(f => typeof f !== 'string' || f.length > MAX_FRAME_CHARS)) {
    return res.status(400).json({ error: 'Invalid or oversized frame.' });
  }

  const instructions =
    'You are an expert Roblox Studio debugger. Analyze this screen recording, shown as ' +
    frameSlice.length + ' frames in order.\n\n' +
    'User context: ' + ((typeof context === 'string' && context.trim()) || 'None provided.') + '\n\n' +
    'Respond with these sections:\n' +
    'WHAT I SEE:\n(frame by frame description)\n\n' +
    'THE PROBLEM:\n(exact error identified; say clearly if you cannot read the error text)\n\n' +
    'ROOT CAUSE:\n(why it happens)\n\n' +
    'THE FIX:\n(step-by-step, with corrected Lua code)\n\n' +
    'HOW TO PREVENT IT:\n(short tips)';

  const content = [{ type: 'text', text: instructions }];
  frameSlice.forEach(f => {
    content.push({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + f } });
  });

  const key = orKey();
  const models = await pickModels(key, { vision: true });
  const result = await complete({
    key,
    models,
    messages: [{ role: 'user', content }],
    maxTokens: 1500,
    siteUrl: process.env.SITE_URL || `https://${req.headers.host}`,
  });

  console.log(JSON.stringify({ reqId, route: 'analyze-video', ok: result.ok, model: result.model, attempts: result.attempts }));

  if (result.ok) {
    return res.status(200).json({ analysis: result.text, model: result.model, reqId });
  }

  return res.status(502).json({
    error: result.fatal || ('Video analysis failed. ' + (result.attempts.length ? result.attempts.join(' | ') : 'No vision-capable models available right now.')),
    reqId,
  });
};
