# WizGame: Roblox AI Game Studio

Turn one game idea into a starting set of Roblox Lua scripts. A team of AI bots plans the levels, challenges the idea, writes the code, checks it with a real Lua parser, and tests it. **Every bot shows its verdict**, so you can see what each one found instead of trusting a black box.

**Live demo:** https://wizgame-nine.vercel.app

WizGame solves the blank-page problem, not the whole game. The output is a reviewed starting point you finish and polish in Roblox Studio.

## What you see when you use it

1. **Pick an idea.** Five ideator bots each pitch a different angle on your theme.
2. **Level Bot** lists the *proposed idea*, its levels and the reasons players come back. A **Walkthrough Bot** then explains, in about 200 plain words, how the game will look and play, level by level.
3. **Questioner and Betterment** run two rounds. The Questioner attacks the idea (pros, cons, hard questions, plus any of your own). Betterment answers from the player's point of view and rewrites the idea, showing **before vs new idea side by side with the changes as bullet points**. A final walkthrough describes the improved game.
4. **Designers and Coders** produce a layout, a shared naming "contract", and five scripts.
5. **Reviewers** run a real Lua parser plus placement and logic checks. Broken files get one automatic fix attempt.
6. **Wizard gate**: you approve before anything is tested.
7. **Testers and fix rounds** score the game and repeat until the average reaches 8/10. A fix that makes things worse is reverted.
8. **Files tab**: all scripts grouped by type (Script, LocalScript, ModuleScript), with the exact Studio location, full code, copy and per-file download.

Each bot card carries a colour-coded **Verdict** line (green ok, amber warning, red problem) with a "Full finding" panel. The **Verdicts** tab collects them all in one list.

## Engineering notes

- **Real syntax checking.** Generated code is parsed server-side with `luaparse` (`api/validate-lua.js`). It reports syntax errors, undeclared variables (catches typos such as `works` for `workspace`) and deprecated APIs (`wait`, `spawn`, `delay`). Luau-only syntax (`+=`, `continue`) is rewritten to plain Lua for parsing only; the user's code is never changed.
- **Machine facts outrank model opinions.** Testers are told a score above 5 is not allowed when the parser found a problem, and approval is blocked while critical problems remain.
- **No regressions.** Each fix round is compared with the best saved version and reverted if it has more critical problems or a lower score.
- **Model fallback.** `api/chat.js` tries free OpenRouter models, then Groq, then xAI, with per-model cooldowns, daily-limit detection and a time budget. Every attempt is logged.
- **Shared contract.** One architect step fixes the RemoteEvent, folder and Part names, so separately generated scripts agree with each other.
- **Fragile-output hardening.** Label parsing only accepts `LABEL:` followed by a colon, so words like "consistent" inside a bot's answer are not mistaken for the next section.
- **Small surface.** Plain HTML, CSS and JavaScript (no build step) plus four serverless functions. Rate limiting, an origin allow-list and security headers are included.

## Limitations

- The parser proves syntax, not behaviour. A script that parses can still fail in Studio.
- Generated scripts usually need manual fixes and game-specific polish.
- Free models are rate limited and inconsistent, so results vary between runs.
- Anatomy detection is a keyword scan.

## Setup

```bash
git clone https://github.com/k-kj0/wizgame.git
cd wizgame
cp env.example .env     # add your OPENROUTER_API_KEY
npm install
npm run dev             # needs the Vercel CLI: npm i -g vercel
```

Deploy: import the repo into Vercel and add `OPENROUTER_API_KEY` (and optionally `ALLOWED_ORIGINS`) under Environment Variables for Production and Preview, then redeploy. Open `/api/health` to see which variables the deployment can see.

## Tests and benchmark

```bash
npm test                                  # unit tests for the Lua checker
BASE_URL=https://your-app.vercel.app npm run bench   # asks the model for 5 scripts, reports how many parse
```

The benchmark writes `benchmark-results.json`. Free models vary, so treat one run as a sample.

## Project structure

```
wizgame/
├── api/
│   ├── _lib/
│   │   ├── security.js      CORS allow-list, rate limiting, method checks
│   │   └── openrouter.js    model discovery, fallback, cooldowns
│   ├── chat.js              LLM proxy with fallback, timeouts, logging
│   ├── health.js            shows which env vars the deployment sees
│   └── validate-lua.js      Lua syntax check + Roblox API warnings
├── scripts/benchmark.js     runs test prompts, records parse results
├── tests/validate.test.js   unit tests for the checker
├── index.html               page shell
├── styles.css               styles
├── app.js                   pipeline, bots, verdicts, rendering
├── env.example
├── package.json
└── vercel.json
```

## Roadmap

- Luau-aware parsing to remove false syntax errors
- Playtest-error diagnosis from screenshots or recordings
- Export a ready-to-import Studio project

> Never commit your `.env` file. Add keys only through Vercel's Environment Variables panel.
