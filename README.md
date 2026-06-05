# 🎮 Roblox AI Game Studio

A full AI-powered game studio pipeline that generates complete Roblox Lua scripts from a single prompt.
Built with Gemini 1.5 Flash + Grok as dual AI backends, deployed on Vercel (free).

## Features
- 23 AI bots across 7 stages: Ideators → Designers → Coders → Reviewers → Wizard Gate → Testers → Final Files
- 🎬 **Video Error Analyzer** — screen record your Roblox error, upload it, AI watches and fixes it
- Wizard approval gate — review every file before accepting
- Excellent Work button — stops all bots, fires confetti, ships the game
- Dual AI: Gemini 1.5 Flash (primary, free) + Grok (fallback)

## Setup

### 1. Get free API keys
- **Gemini** (recommended, free): https://aistudio.google.com/app/apikey
- **Grok** (optional fallback): https://console.x.ai/

### 2. Clone & configure
```bash
git clone https://github.com/YOUR_USERNAME/roblox-ai-studio
cd roblox-ai-studio
cp .env.example .env
# Edit .env and add your real API keys
```

### 3. Deploy to Vercel (free)
1. Push to GitHub (keys stay in .env, which is gitignored)
2. Go to vercel.com → New Project → Import repo
3. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` = your Gemini key
   - `GROK_API_KEY` = your Grok key (optional)
4. Deploy → done

### 4. Local development
```bash
npm install
npm run dev
# Opens at http://localhost:3000
```

## Project structure
```
roblox-ai-studio/
├── api/
│   ├── chat.js           # Dual AI proxy (Gemini + Grok)
│   └── analyze-video.js  # Gemini Vision video analyzer
├── public/
│   └── index.html        # Full frontend app
├── .env.example          # Key template (safe to commit)
├── .gitignore            # Keeps .env out of git
├── vercel.json           # Routing config
└── package.json
```

## How to use
1. Type a game idea → click Generate Game
2. Watch 23 bots work through 7 stages
3. Wizard shows every file before you approve
4. Testers rate the game — approve or request changes
5. Click "Excellent Work" to stop all bots
6. Copy scripts → paste into Roblox Studio
7. If you get an error in Studio → screen record it → Video Analyzer tab → upload → AI fixes it

## ⚠️ Never commit your .env file
The `.gitignore` already blocks it. Always add keys via Vercel's Environment Variables panel.
