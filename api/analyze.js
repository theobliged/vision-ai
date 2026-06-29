// api/analyze.js — Vercel serverless function
// Your ANTHROPIC_API_KEY is set in Vercel dashboard (never in code)

const https = require("https");

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      error: "API key not configured. Add ANTHROPIC_API_KEY in Vercel dashboard → Settings → Environment Variables.",
    });
  }

  return new Promise((resolve) => {
    const body = JSON.stringify(req.body);

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = "";
      apiRes.on("data", (chunk) => (data += chunk));
      apiRes.on("end", () => {
        try {
          res.status(apiRes.statusCode).json(JSON.parse(data));
        } catch {
          res.status(500).json({ error: "Invalid response from API" });
        }
        resolve();
      });
    });

    apiReq.on("error", (e) => {
      res.status(500).json({ error: e.message });
      resolve();
    });

    apiReq.write(body);
    apiReq.end();
  });
}
