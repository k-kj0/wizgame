// api/analyze-video.js — Video frame analysis using Gemini Vision
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not set in Vercel Environment Variables." });
  }

  const { frames, context } = req.body;
  if (!frames || frames.length === 0) {
    return res.status(400).json({ error: "No frames provided" });
  }

  const parts = [
    { text: `You are an expert Roblox Studio debugger. Analyze this screen recording carefully.\n\nUser context: ${context || "No additional context."}\n\nProvide your response in this exact format:\n\nWHAT I SEE:\n(describe what's happening frame by frame)\n\nTHE PROBLEM:\n(identify the specific error)\n\nROOT CAUSE:\n(explain why this is happening)\n\nFIX STEPS:\n1. (step one with exact Lua code if needed)\n2. (step two)\n3. (etc)\n\nPREVENTION:\n(how to avoid this in future)` }
  ];

  frames.slice(0, 8).forEach((f, i) => {
    parts.push({ text: `Frame ${i + 1}:` });
    parts.push({ inline_data: { mime_type: "image/jpeg", data: f } });
  });

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.3 }
        })
      }
    );
    const data = await geminiRes.json();
    if (!geminiRes.ok || !data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return res.status(500).json({ error: "Gemini Vision error: " + JSON.stringify(data.error || data) });
    }
    return res.status(200).json({ analysis: data.candidates[0].content.parts[0].text });
  } catch (e) {
    return res.status(500).json({ error: "Video analysis failed: " + e.message });
  }
};
