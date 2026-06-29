const https = require("https");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "API key not configured." });
  try {
    const messages = req.body.messages || [];
    const parts = [];
    for (const msg of messages) {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === "image") {
            parts.push({ inline_data: { mime_type: block.source.media_type, data: block.source.data } });
          } else if (block.type === "text") {
            parts.push({ text: block.text });
          }
        }
      } else if (typeof msg.content === "string") {
        parts.push({ text: msg.content });
      }
    }
    const geminiBody = JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: 1000 } });
    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(geminiBody) }
    };
    return new Promise((resolve) => {
      const apiReq = https.request(options, (apiRes) => {
        let data = "";
        apiRes.on("data", (chunk) => (data += chunk));
        apiRes.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "Could not analyze image.";
            res.status(200).json({ content: [{ type: "text", text }] });
          } catch (e) { res.status(500).json({ error: "Invalid response: " + data }); }
          resolve();
        });
      });
      apiReq.on("error", (e) => { res.status(500).json({ error: e.message }); resolve(); });
      apiReq.write(geminiBody);
      apiReq.end();
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
};