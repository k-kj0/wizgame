// api/analyze-video.js — Video frame analysis using Gemini Vision
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not set. Add it in Vercel environment variables." });
  }

  const { frames, context } = req.body; // frames = array of base64 JPEG strings
  if (!frames || frames.length === 0) {
    return res.status(400).json({ error: "No frames provided" });
  }

  // Build parts: interleave frames with description
  const parts = [
    { text: `You are an expert Roblox Studio debugger. The user has uploaded a screen recording showing a problem in Roblox Studio or their Roblox game. Analyze every frame carefully.\n\nUser context: ${context || "No additional context provided."}\n\nProvide:\n1. WHAT I SEE: describe exactly what's happening in the video frame by frame\n2. THE PROBLEM: identify the specific error or issue\n3. ROOT CAUSE: explain why this is happening\n4. FIX STEPS: numbered, specific steps to fix it (include exact Lua code if needed)\n5. PREVENTION: how to avoid this in future\n\nBe specific — mention exact error messages, line numbers, script names if visible.` }
  ];

  // Add up to 8 frames (Gemini supports multiple images)
  const frameSlice = frames.slice(0, 8);
  frameSlice.forEach((f, i) => {
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
      return res.status(500).json({ error: "Gemini Vision failed: " + JSON.stringify(data.error || data) });
    }
    return res.status(200).json({ analysis: data.candidates[0].content.parts[0].text });
  } catch (e) {
    return res.status(500).json({ error: "Video analysis failed: " + e.message });
  }
}
