// Benchmark: asks the deployed model to write Roblox scripts for a fixed set of prompts, runs the project's
// own Luau checker on every result, gives each failure ONE automatic fix attempt, and writes a report.
//
//   BASE_URL=https://your-deployment.vercel.app npm run bench
//
// Output: docs/BENCHMARK.md (human-readable) and benchmark-results.json (raw, including the generated code).
// Every number in the report is measured in that run. Free models vary from run to run, so run it a few
// times and keep the reports. It measures whether scripts PARSE, not whether the game works in Studio.
const fs = require('node:fs');
const path = require('node:path');

const BASE = (process.env.BASE_URL || 'https://wizgame-nine.vercel.app').replace(/\/$/, '');
const PROMPTS = [
  'A round timer that counts down from 60 and fires a RemoteEvent when it reaches zero.',
  'A leaderboard that gives each player a Coins value and adds 1 per second.',
  'An NPC that chases the nearest player with PathfindingService and damages on touch.',
  'A tool that fires a projectile toward the mouse position using a RemoteEvent.',
  'A GUI script that shows health, score and the match timer, updated by RemoteEvents.',
  'A checkpoint system: touching a numbered part saves the spawn point for that player.',
  'A shop script: a ProximityPrompt opens a purchase for 50 Coins and grants a speed boost.',
  'A wave spawner that spawns more enemies each wave and announces the wave number to all players.',
  'A health pickup that heals 25 HP, then respawns after 10 seconds.',
  'A round manager that picks a random map from a Folder, teleports players, and ends when one player is left.',
];
const SYSTEM =
  'Expert Roblox Lua scripter. Write a COMPLETE RUNNABLE script. Plain Lua only: no type annotations, no continue, ' +
  'use task.wait, game:GetService(). Declare every variable. Finish every end. Output ONLY Lua code, no markdown.';
const FIX_SYSTEM =
  'Expert Roblox Lua scripter. Fix the problem in this script and keep everything else working. Plain Lua only. ' +
  'Output ONLY the COMPLETE corrected file from the first line to the last line, no markdown.';

const strip = (t) => String(t || '').replace(/```(?:lua|luau)?/gi, '').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(p, body) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(BASE + p, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return data;
    if (attempt === 0 && (r.status === 429 || r.status >= 500)) { await sleep(5000); continue; }
    throw new Error(data.error || 'HTTP ' + r.status);
  }
}
const generate = (system, content) => post('/api/chat', { system, messages: [{ role: 'user', content }], max_tokens: 3000 });
const check = async (source) => (await post('/api/validate-lua', { files: [{ name: 'bench', source }] })).results[0];

// ~10 lines around the error so a reader can see what went wrong.
function excerpt(source, error) {
  const lines = source.split('\n');
  const m = /\((\d+):\d+\)/.exec(error || '');
  const at = m ? Math.max(0, +m[1] - 1) : 0;
  const from = Math.max(0, at - 4), to = Math.min(lines.length, from + 10);
  return lines.slice(from, to).map((l, i) => `${String(from + i + 1).padStart(3)}  ${l}`).join('\n');
}
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : 'n/a');

(async () => {
  const rows = [];
  for (const prompt of PROMPTS) {
    const row = { prompt };
    try {
      const t0 = Date.now();
      const g = await generate(SYSTEM, prompt);
      row.ms = Date.now() - t0;
      row.model = g.model || 'unknown';
      row.source = strip(g.text);
      const r = await check(row.source);
      row.parses = r.syntaxOk;
      row.engine = r.engine;
      row.error = r.error;
      row.undefinedGlobals = r.undefinedGlobals || [];
      row.warnings = r.warnings || [];
      if (!r.syntaxOk) {
        const t1 = Date.now();
        const f = await generate(FIX_SYSTEM, `Problem: ${r.error}\n\nScript:\n${row.source}`);
        row.fixMs = Date.now() - t1;
        row.fixedSource = strip(f.text);
        const r2 = await check(row.fixedSource);
        row.fixedParses = r2.syntaxOk;
        row.fixedError = r2.error;
      }
    } catch (e) {
      row.parses = false;
      row.error = String(e.message || e).slice(0, 200);
      row.requestFailed = true;
    }
    rows.push(row);
    console.log((row.parses ? 'PASS ' : row.fixedParses ? 'FIXED' : 'FAIL ') + ' ' + prompt.slice(0, 70));
    await sleep(1500); // stay under the rate limit
  }

  const done = rows.filter((r) => !r.requestFailed);
  const first = done.filter((r) => r.parses).length;
  const fixedToo = done.filter((r) => !r.parses && r.fixedParses).length;
  const stillBad = done.filter((r) => !r.parses && !r.fixedParses);
  const byModel = {};
  done.forEach((r) => {
    const m = (byModel[r.model] = byModel[r.model] || { n: 0, ok: 0, ms: [] });
    m.n++; if (r.parses) m.ok++; m.ms.push(r.ms);
  });
  const stamp = new Date().toISOString();

  const md = [];
  md.push('# WizGame benchmark results', '');
  md.push(`Run: ${stamp}  `, `Deployment: ${BASE}  `, `Checker: ${(done[0] && done[0].engine) || 'unknown'} parser (Luau)`, '');
  md.push('Everything in this file was measured in this run. It measures whether generated scripts **parse**. It does not prove they run correctly in Roblox Studio.', '');
  md.push('## Summary', '');
  md.push('| Measure | Result |', '|---|---|');
  md.push(`| Test prompts | ${PROMPTS.length} |`);
  md.push(`| Requests that failed (no model answer) | ${rows.length - done.length} |`);
  md.push(`| Scripts that parsed on the first try | ${first} of ${done.length} (${pct(first, done.length)}) |`);
  md.push(`| Failed first try, parsed after one automatic fix | ${fixedToo} |`);
  md.push(`| Still failing after one fix | ${stillBad.length} |`);
  md.push(`| Average time per generation | ${avg(done.map((r) => r.ms)) === null ? 'n/a' : (avg(done.map((r) => r.ms)) / 1000).toFixed(1) + ' s'} |`);
  md.push(`| Cost | $0 (free models only) |`, '');
  md.push('## By model (latency and quality)', '', '| Model | Scripts | Parsed first try | Avg time |', '|---|---|---|---|');
  Object.entries(byModel).forEach(([m, v]) => md.push(`| ${m} | ${v.n} | ${v.ok} (${pct(v.ok, v.n)}) | ${(avg(v.ms) / 1000).toFixed(1)} s |`));
  md.push('', '## Every prompt', '', '| # | Prompt | Result | Model | Time |', '|---|---|---|---|---|');
  rows.forEach((r, i) =>
    md.push(`| ${i + 1} | ${r.prompt} | ${r.requestFailed ? 'request failed' : r.parses ? 'parsed' : r.fixedParses ? 'fixed' : 'FAILED'} | ${r.model || '-'} | ${r.ms ? (r.ms / 1000).toFixed(1) + ' s' : '-'} |`));
  md.push('', '## Failed cases', '');
  const failed = rows.filter((r) => !r.parses);
  if (!failed.length) md.push('None in this run.');
  failed.forEach((r) => md.push(`- **${r.prompt}**: ${r.requestFailed ? 'request failed: ' : ''}${r.error}${r.fixedParses ? ' (parsed after one automatic fix)' : r.fixedParses === false ? ' (still failing after one fix)' : ''}`));
  md.push('', '## Example: bad output and the corrected output', '');
  const ex = failed.filter((r) => r.source && r.fixedSource).slice(0, 2);
  if (!ex.length) md.push('No failure with a fix attempt in this run, so there is no example to show. Run the benchmark again to collect one.');
  ex.forEach((r, i) => {
    md.push(`### Example ${i + 1}: ${r.prompt}`, '', `Checker said: \`${r.error}\``, '', 'Bad output (lines around the error):', '', '```lua', excerpt(r.source, r.error), '```', '');
    md.push(r.fixedParses ? 'Corrected output (first lines, parses):' : `Corrected output (first lines, STILL failing: \`${r.fixedError}\`):`, '', '```lua', excerpt(r.fixedSource, r.fixedParses ? '' : r.fixedError), '```', '');
  });
  md.push('## Self-assessed estimate (not measured)', '');
  md.push('My own estimate is that WizGame saves roughly 30 to 40 percent of the time I would spend on the first scaffolding of a small Roblox game: folder layout, boilerplate, RemoteEvent wiring and first-draft scripts. This is a self-assessment from my own use, **not** a controlled measurement, and it does not cover polish, balancing or playtesting.', '');
  md.push('## What this does not measure', '', '- Whether the game runs or is fun in Roblox Studio (no runtime playtesting yet).', '- Quality of design decisions, balance or art.', '- Results from other models or prompts. Free models change over time.', '');

  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync(path.join('docs', 'BENCHMARK.md'), md.join('\n'));
  fs.writeFileSync('benchmark-results.json', JSON.stringify({ base: BASE, at: stamp, rows }, null, 2));
  console.log(`\n${first}/${done.length} parsed first try, ${fixedToo} more after one fix (${BASE})`);
  console.log('Wrote docs/BENCHMARK.md and benchmark-results.json');
  process.exitCode = stillBad.length || rows.length !== done.length ? 1 : 0;
})();
