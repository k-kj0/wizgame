module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { system, messages, max_tokens } = req.body || {};
  const key = process.env.GEMINI_API_KEY;

  if (!key) return res.status(200).json({ content: [{ text: 'no key' }], model: 'error' });

  const prompt = [(system || ''), ...(messages || []).map(m => m.content)].join('\n\n');

  const models = [
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: max_tokens || 2000 }
          })
        }
      );
      const d = await r.json();
      if (d.error) continue;
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return res.status(200).json({ content: [{ text }], model });
    } catch(e) { continue; }
  }

  return res.status(500).json({ error: 'All Gemini models failed. Key may be quota-limited.' });
};
