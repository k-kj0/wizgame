# WizGame: Roblox AI Game Studio

Turn one game idea into a **structured starting point** for a Roblox game: a reviewed set of Lua scripts with the exact type and Studio location of every file, plus a checklist of what to do next. A team of AI bots plans the levels, challenges the idea, designs the arena, writes the code and fixes problems, and **every bot shows its verdict** so you can see what each one found.

**Live demo:** https://wizgame-nine.vercel.app

WizGame is not a game generator and does not produce production-ready games. It automates the first scaffolding of the workflow so you can spend your time on the game itself.

## What you see when you use it

1. **Pick an idea.** Five ideator bots each pitch a different angle on your theme.
2. **Level Bot** lists the proposed idea, its levels and the reasons players come back. A **Walkthrough Bot** explains in about 200 plain words how the game will look and play, level by level.
3. **Questioner and Betterment** run two rounds. Betterment shows the **before idea next to the new idea, with the changes as bullet points**, then a final walkthrough describes the improved game.
4. **Designers and Coders.** The arena layout is drawn by code from numbers the MapBot specifies, so the picture always matches the spec (details below). Five scripts are written against one shared contract of names.
5. **Reviewers** run the Luau parser plus placement and logic checks. Broken files get one automatic fix attempt.
6. **You approve** before anything is checked or fixed.
7. **Code Check** (no AI scores): is any required file missing, does each file have a valid name, type and location, does it parse, do the shared RemoteEvent names agree. It ends with a tentative list of next steps built from your levels.
8. **Fix rounds** run only while blocking problems exist. Missing files are created, broken files rewritten, every check re-run. A round that is not better is reverted.
9. **Files tab:** scripts grouped by type (Script, LocalScript, ModuleScript) with the Studio location, full code, copy, per-file download and a downloadable run report.

Each bot card carries a colour-coded **Verdict** with a "Full finding" panel, and the **Verdicts** tab collects them all.

## Design decisions

- **Deterministic checks, not AI scores.** An earlier version asked five AI "testers" to rate the game out of 10, but nothing had been played, so the numbers had no meaning. The checks now look only at files that exist and are reproducible. An AI "playtest risks" opinion is available on request and is labelled as an opinion, not a test.
- **Luau-aware parsing.** Syntax is decided by a Luau parser (`luau-parser`, pinned to an exact version), because Luau is what Roblox runs. Type annotations, `+=`, `continue` and string interpolation are accepted. `luaparse` is still used for the undeclared-variable check on plain-Lua code; for Luau-only files that check is skipped and the report says so. If the Luau parser fails to load, the checker falls back to `luaparse` alone.
- **Layout drawn from numbers.** Free image generators ignore the spec and return random art. The SketchBot returns the arena as JSON (zones, kinds, positions, sizes) and the browser draws a top-down plan from it, with a table of the same numbers. Optional "concept art" is available on request, labelled as mood only.
- **No regressions.** Each fix round is compared with the best saved version and reverted unless it has fewer blocking problems, or the same number and fewer warnings. Reverted rounds are counted in the run report.
- **Shared contract.** One architect step fixes RemoteEvent, folder and Part names so separately generated scripts agree. ContractCheck verifies that the names it promised are used and that looked-up names are created.
- **Model fallback with measurements.** `api/chat.js` tries free OpenRouter models, then Groq, with cooldowns and a time budget, and returns the model used and the latency of every request. The benchmark aggregates both per model.
- **Rate limiting.** Per-instance memory by default. Set the optional Upstash variables for a shared counter across all serverless instances. If the shared store is unreachable it falls back to memory rather than blocking users.

## Evidence

`npm run bench` sends 10 fixed prompts to a deployment, parses every result, gives each failure one automatic fix attempt, and writes `docs/BENCHMARK.md`: prompts run, scripts that parsed, failed cases, average time per generation, per-model latency and quality, and a bad-output versus corrected-output example when a failure occurred. Every number is measured in that run. See [`docs/BENCHMARK.md`](docs/BENCHMARK.md) once you have run it.

**Self-assessed estimate (not measured):** I estimate WizGame saves roughly 30 to 40 percent of the time I would spend on the first scaffolding of a small Roblox game. This is my own judgement from using it, not a controlled measurement, and it does not cover polish, balancing or playtesting.

## Known limitations and what is next

| Area | Today | Next |
|---|---|---|
| Correctness | Parsing proves syntax, not behaviour. No Roblox Studio runtime or playtesting. | Run scripts in a Studio/Open Cloud test place and report runtime errors. |
| Requirements | A fixed set of five required files, a contract cross-check, and placement rules. The anatomy panel is still a keyword scan. | Structured project requirements and a real dependency graph between scripts. |
| Quality signal | Deterministic checks plus the benchmark. AI opinions are labelled as opinions. | Track benchmark results over time per model. |
| Models | Free models only, so results vary between runs and are rate limited. | Keep reports from several runs; compare models. |
| Luau coverage | The Luau parser is a small third-party package. Undeclared-variable checking is skipped for Luau-only syntax. | Full scope analysis for Luau. |

## Setup

```bash
git clone https://github.com/k-kj0/wizgame.git
cd wizgame
cp env.example .env     # add your OPENROUTER_API_KEY
npm install
npm run dev             # needs the Vercel CLI: npm i -g vercel
```

Deploy: import the repo into Vercel and add `OPENROUTER_API_KEY` (and optionally `GROQ_API_KEY`, `ALLOWED_ORIGINS`, and the Upstash pair) under Environment Variables for Production and Preview, then redeploy. Open `/api/health` to see which variables the deployment can see.

## Tests

```bash
npm test                                           # unit tests: Luau checker, rate limiter
BASE_URL=https://your-app.vercel.app npm run bench # benchmark against a deployment
```

## Project structure

```
wizgame/
├── api/
│   ├── _lib/security.js     CORS allow-list, shared or in-memory rate limiting
│   ├── _lib/openrouter.js   model discovery, fallback, cooldowns
│   ├── chat.js              LLM proxy with fallback, timeouts, latency
│   ├── health.js            shows which env vars the deployment sees
│   └── validate-lua.js      Luau syntax check, undeclared variables, Roblox API warnings
├── scripts/benchmark.js     fixed prompts, parse rate, fix attempt, report
├── tests/                   validate.test.js, security.test.js
├── index.html, styles.css, app.js
├── env.example, package.json, vercel.json
```

> Never commit your `.env` file. Add keys only through Vercel's Environment Variables panel.
