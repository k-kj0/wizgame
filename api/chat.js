module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const geminiKey = process.env.GEMINI_API_KEY;
  const grokKey   = process.env.GROK_API_KEY;

  if (!geminiKey && !grokKey) {
    return res.status(500).json({
      error: "No API keys found. Go to Vercel Dashboard → Your Project → Settings → Environment Variables and add GEMINI_API_KEY"
    });
  }

  const { system, messages, max_tokens, preferGrok } = req.body || {};
  const userContent = (messages && messages[0] && messages[0].content) || "";

  // Try Gemini first
  if (geminiKey && !preferGrok) {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system || "You are a helpful assistant." }] },
            contents: [{ role: "user", parts: [{ text: userContent }] }],
            generationConfig: { maxOutputTokens: max_tokens || 2000, temperature: 0.7 }
          })
        }
      );
      const data = await response.json();
      const text = data && data.candidates && data.candidates[0] &&
                   data.candidates[0].content && data.candidates[0].content.parts &&
                   data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
      if (text) {
        return res.status(200).json({ content: [{ type: "text", text }], model: "gemini-1.5-flash" });
      }
      console.error("Gemini no text:", JSON.stringify(data).substring(0, 300));
    } catch (e) {
      console.error("Gemini error:", e.message);
    }
  }

  // Fall back to Grok
  if (grokKey) {
    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + grokKey },
        body: JSON.stringify({
          model: "grok-beta",
          max_tokens: max_tokens || 2000,
          messages: [
            { role: "system", content: system || "You are a helpful assistant." },
            { role: "user",   content: userContent }
          ]
        })
      });
      const data = await response.json();
      const text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if (text) {
        return res.status(200).json({ content: [{ type: "text", text }], model: "grok-beta" });
      }
      console.error("Grok no text:", JSON.stringify(data).substring(0, 300));
    } catch (e) {
      console.error("Grok error:", e.message);
    }
  }

  return res.status(500).json({ error: "AI request failed. Check Vercel Function Logs for details." });
};
