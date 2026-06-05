// api/chat.js — Dual AI backend: tries Gemini first, falls back to Grok
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { system, messages, preferGrok } = req.body;
  const geminiKey = process.env.GEMINI_API_KEY;
  const grokKey   = process.env.GROK_API_KEY;

  if (!geminiKey && !grokKey) {
    return res.status(500).json({ error: "No API keys configured on server. Add GEMINI_API_KEY or GROK_API_KEY in Vercel environment variables." });
  }

  // Build unified prompt (both APIs take system + user)
  const userContent = messages?.[0]?.content || "";

  // ── Try Gemini first (unless caller prefers Grok) ──
  if (geminiKey && !preferGrok) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system || "" }] },
            contents: [{ role: "user", parts: [{ text: userContent }] }],
            generationConfig: { maxOutputTokens: req.body.max_tokens || 2000, temperature: 0.7 }
          })
        }
      );
      const gData = await geminiRes.json();
      if (geminiRes.ok && gData.candidates?.[0]?.content?.parts?.[0]?.text) {
        return res.status(200).json({
          content: [{ type: "text", text: gData.candidates[0].content.parts[0].text }],
          model: "gemini-1.5-flash"
        });
      }
      console.error("Gemini error:", JSON.stringify(gData));
    } catch (e) {
      console.error("Gemini fetch failed:", e.message);
    }
  }

  // ── Fall back to Grok ──
  if (grokKey) {
    try {
      const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${grokKey}`
        },
        body: JSON.stringify({
          model: "grok-beta",
          max_tokens: req.body.max_tokens || 2000,
          messages: [
            { role: "system", content: system || "" },
            { role: "user",   content: userContent }
          ]
        })
      });
      const xData = await grokRes.json();
      if (grokRes.ok && xData.choices?.[0]?.message?.content) {
        return res.status(200).json({
          content: [{ type: "text", text: xData.choices[0].message.content }],
          model: "grok-beta"
        });
      }
      console.error("Grok error:", JSON.stringify(xData));
    } catch (e) {
      console.error("Grok fetch failed:", e.message);
    }
  }

  return res.status(500).json({ error: "Both AI APIs failed. Check your API keys in Vercel environment variables." });
}
