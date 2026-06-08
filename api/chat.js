module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { system, messages, max_tokens } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set in Vercel env vars' });

  try {
    const prompt = (system ? system + '\n\n' : '') + messages.map(m => m.content).join('\n');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: max_tokens || 2000 }
        })
      }
    );
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'Gemini error' });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ content: [{ text }], model: 'gemini-1.5-flash' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
