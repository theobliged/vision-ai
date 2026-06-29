# VisionAI 👁️

A polished, production-ready image recognition chatbot powered by **Anthropic Claude claude-sonnet-4-6**. Upload any image and have a natural conversation about it — detect objects, extract text, analyze charts, describe scenes, and more.

![VisionAI Screenshot](assets/screenshot.png)

## ✨ Features

- 🖼️ **Drag & drop** image upload (JPG, PNG, WEBP, GIF)
- 💬 **Multi-turn conversation** — ask follow-up questions
- ⚡ **Quick actions** — one-click prompts for common tasks
- 🔍 Object detection, scene description, OCR, color analysis
- 📊 Live stats (images analyzed, queries run)
- 🌙 Dark mode UI
- 📱 Fully responsive

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) v16 or higher
- An [Anthropic API key](https://console.anthropic.com/)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/your-username/vision-ai.git
cd vision-ai

# 2. Set up your API key
cp .env.example .env
# Edit .env and add your Anthropic API key

# 3. Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

## 🔑 API Key Setup

1. Get your key at [console.anthropic.com](https://console.anthropic.com/)
2. Copy `.env.example` to `.env`
3. Replace `your_api_key_here` with your real key

> ⚠️ **Never commit `.env` to git.** It's already in `.gitignore`.

## 📁 Project Structure

```
vision-ai/
├── index.html          # Main app page
├── server.js           # Node.js proxy server (keeps API key secure)
├── package.json
├── .env.example        # Template for env vars (safe to commit)
├── .env                # Your real API key (DO NOT COMMIT)
├── .gitignore
├── css/
│   └── style.css       # All styles
├── js/
│   └── app.js          # Frontend logic
└── assets/
    └── screenshot.png  # (add your own)
```

## 🛡️ Security

The API key is **never exposed to the browser**. All requests go through the local Node.js server which proxies to Anthropic. This pattern is safe for demos and internal tools.

For production deployment, host the server on a platform like:
- [Railway](https://railway.app)
- [Render](https://render.com)
- [Fly.io](https://fly.io)
- [Heroku](https://heroku.com)

Set your `ANTHROPIC_API_KEY` as an environment variable on the platform (not in a file).

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript (no framework)
- **Backend**: Node.js (no npm dependencies — uses built-in `http` and `https`)
- **AI**: [Anthropic Claude claude-sonnet-4-6](https://www.anthropic.com/claude)

## 📝 License

MIT
