module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { system, messages, max_tokens } = req.body;
  const prompt = (system ? system + '\n\n' : '') + messages.map(m => m.content).join('\n');

  // Try Gemini first
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${geminiKey}`,
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
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return res.status(200).json({ content: [{ text }], model: 'gemini-2.0-flash-lite' });
    } catch(e) {}
  }

  // Fallback: OpenRouter free model (no key needed for small quota)
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (process.env.OPENROUTER_API_KEY || ''),
        'HTTP-Referer': 'https://wizgame-nine.vercel.app',
        'X-Title': 'WizGame'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: max_tokens || 2000
      })
    });
    const d = await r.json();
    const text = d.choices?.[0]?.message?.content;
    if (text) return res.status(200).json({ content: [{ text }], model: 'mistral-7b-free' });
    throw new Error(JSON.stringify(d));
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
