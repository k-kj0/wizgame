# 🎮 WizGame: Roblox AI Game Studio

Generate a starting set of Roblox Lua scripts from a single game idea, review each file, then finish and polish the game in Roblox Studio. WizGame handles the blank-page problem, not the whole game.

**Live demo:** https://wizgame-nine.vercel.app

## What it does

- **Prompt-to-scripts pipeline:** a multi-stage prompt workflow (ideation, design, coding, review, testing) turns a game idea into Lua scripts.
- **Approval gate:** every generated file is shown for review before you accept it.
- **Lua syntax pre-check:** generated code is parsed server-side (`api/validate-lua.js`) and flagged for syntax errors and deprecated Roblox APIs (`wait`, `spawn`, `delay`).
- **Video error analyzer:** upload a screen recording of a Roblox Studio error and get a diagnosis and suggested fix (Gemini Vision via `api/analyze-video.js`).
- **Model fallback:** `api/chat.js` tries several free models through OpenRouter in order and logs each attempt.

## Results

Measured with `npm run bench` against the deployed app.

| Metric | Result |
|---|---|
| Test prompts | 5 |
| Prompts where all scripts parse | _fill in_ / 5 |
| Average generation time | _fill in_ s |

## Limitations (honest version)

- The syntax check uses a plain-Lua parser. It catches syntax errors but does **not** prove a script runs correctly in Roblox Studio, and Luau-only syntax (type annotations, `continue`) can be flagged as false errors.
- Generated scripts usually still need manual fixes and game-specific polish.
- Free models can be rate-limited or inconsistent.
- The video analyzer has not been tested across a wide range of Studio errors.

## Setup

1. Get API keys: [OpenRouter](https://openrouter.ai/keys) and [Gemini](https://aistudio.google.com/app/apikey).
2. Clone and configure:
```bash
   git clone https://github.com/k-kj0/wizgame.git
   cd wizgame
   cp env.example .env
   # edit .env and add your keys
```
3. Deploy to Vercel: import the repo and add `OPENROUTER_API_KEY`, `GEMINI_API_KEY` and `ALLOWED_ORIGINS` under Environment Variables.
4. Run locally:
```bash
   npm install
   npm run dev
```

## Project structure

```
wizgame/
├── api/
│   ├── _lib/security.js    # CORS allow-list, rate limiting, method checks
│   ├── chat.js             # LLM proxy with model fallback, timeouts, logging
│   ├── analyze-video.js    # Gemini Vision screen-recording analyzer
│   └── validate-lua.js     # Lua syntax check + Roblox API warnings
├── scripts/
│   └── benchmark.js        # runs test prompts and records parse results
├── index.html              # frontend app
├── validator-ui.js         # shows validation results in the UI
├── env.example
├── package.json
└── vercel.json
```

## How to use

1. Type a game idea and click Generate.
2. Review each generated file at the approval gate.
3. Check the validation badge on each file.
4. Copy the scripts into Roblox Studio.
5. If Studio shows an error, screen-record it and upload it in the Video Analyzer tab.

> Never commit your `.env` file. Add keys only through Vercel's Environment Variables panel.
