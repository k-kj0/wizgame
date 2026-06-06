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

  const { frames, context } = req.body || {};
  if (!frames || frames.length === 0) {
    return res.status(400).json({ error: "No frames provided." });
  }

  const parts = [{
    text: "You are an expert Roblox Studio debugger. Analyze this screen recording.\n\nUser context: " +
          (context || "None provided.") +
          "\n\nRespond with these sections:\n\nWHAT I SEE:\n(frame by frame description)\n\nTHE PROBLEM:\n(exact error identified)\n\nROOT CAUSE:\n(why it happens)\n\nFIX STEPS:\n1.\n2.\n3.\n\nPREVENTION:\n(how to avoid next time)"
  }];

  const frameSlice = frames.slice(0, 8);
  frameSlice.forEach(function(f, i) {
    parts.push({ text: "Frame " + (i + 1) + ":" });
    parts.push({ inline_data: { mime_type: "image/jpeg", data: f } });
  });

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.3 }
        })
      }
    );
    const data = await response.json();
    const text = data && data.candidates && data.candidates[0] &&
                 data.candidates[0].content && data.candidates[0].content.parts &&
                 data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    if (!text) {
      return res.status(500).json({ error: "Gemini Vision returned no result: " + JSON.stringify(data).substring(0, 200) });
    }
    return res.status(200).json({ analysis: text });
  } catch (e) {
    return res.status(500).json({ error: "Video analysis failed: " + e.message });
  }
};
