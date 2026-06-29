// server.js — lightweight proxy to keep your API key server-side
// Run: node server.js (or: npm start)

const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");

// Load .env manually (no extra dependencies needed)
function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8")
    .split("\n")
    .forEach((line) => {
      const [key, ...vals] = line.split("=");
      if (key && !key.startsWith("#")) {
        process.env[key.trim()] = vals.join("=").trim();
      }
    });
}
loadEnv();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

// Serve static files from project root
function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "text/plain" });
    res.end(data);
  });
}

// Proxy requests to Anthropic API
function proxyToAnthropic(req, res) {
  if (!API_KEY) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error:
          "API key not configured. Copy .env.example to .env and add your key.",
      })
    );
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
    };

    const apiReq = https.request(options, (apiRes) => {
      res.writeHead(apiRes.statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      apiRes.pipe(res);
    });

    apiReq.on("error", (e) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    });

    apiReq.write(body);
    apiReq.end();
  });
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" });
    res.end();
    return;
  }

  // API proxy endpoint
  if (req.method === "POST" && req.url === "/api/analyze") {
    proxyToAnthropic(req, res);
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, req.url === "/" ? "index.html" : req.url);
  serveStatic(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n🚀 VisionAI running at http://localhost:${PORT}`);
  console.log(`   API key: ${API_KEY ? "✅ configured" : "❌ missing (.env not set)"}\n`);
});
