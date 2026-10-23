# WizGame: Roblox AI Game Studio

Turn one game idea into a starting set of Roblox Lua scripts, review each file, then finish and polish in Roblox Studio. WizGame solves the blank-page problem, not the whole game.

**Live demo:** https://wizgame-nine.vercel.app

## What it does

- **Multi-stage pipeline:** ideas, then a Level Bot, Questioner and Betterment pass, then Designers, Coders, Reviewers, Testers and a fix loop until the game scores 8/10.
- **Approval gate:** every generated file is shown for review before you accept it.
- **Lua syntax pre-check:** generated code is parsed server-side with `luaparse` and flagged for syntax errors and deprecated Roblox APIs (`wait`, `spawn`, `delay`). Failing files get one automatic fix attempt.
- **Helper bot:** ask for a missing file (e.g. "add a leaderboard script") and it is generated and added to the current game.
- **Model fallback:** `api/chat.js` tries several free models via OpenRouter (with Groq as backup), skipping rate-limited ones and logging each attempt.

## Limitations

- The syntax check uses a plain-Lua parser. It catches syntax errors but does not prove a script runs in Roblox Studio, and Luau-only syntax (type annotations, `continue`) can be flagged as false errors.
- Generated scripts usually still need manual fixes and game-specific polish.
- Free models can be rate-limited or inconsistent.

## Setup

1. Get an API key from [OpenRouter](https://openrouter.ai/keys).
2. Clone and configure:
```bash
   git clone https://github.com/k-kj0/wizgame.git
   cd wizgame
   cp env.example .env
   # edit .env and add your key
```
3. Run locally:
```bash
   npm install
   npm run dev
```
4. Deploy: import the repo into Vercel and add `OPENROUTER_API_KEY` and `ALLOWED_ORIGINS` under Environment Variables.

## Project structure
