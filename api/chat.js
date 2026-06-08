module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { system, messages, max_tokens } = req.body || {};
  const key = process.env.OPENROUTER_API_KEY;
  const prompt = [(system || ''), ...(messages || []).map(m => m.content)].filter(Boolean).join('\n\n');

  const models = [
    'google/gemini-2.0-flash-exp:free',
    'google/gemini-flash-1.5-8b',
    'meta-llama/llama-3.1-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
  ];

  for (const model of models) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': 'https://wizgame-nine.vercel.app',
          'X-Title': 'WizGame'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: max_tokens || 2000
        })
      });
      const d = await r.json();
      const text = d.choices?.[0]?.message?.content;
      if (text) return res.status(200).json({ content: [{ text }], model });
    } catch(e) { continue; }
  }

  return res.status(500).json({ error: 'All models failed. Check OPENROUTER_API_KEY in Vercel env vars.' });
};
