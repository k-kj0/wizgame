// Benchmark: asks the deployed model to write Roblox scripts for a few prompts, then runs the
// project's own Lua checker on each result and prints how many parsed cleanly.
//
//   BASE_URL=https://your-deployment.vercel.app npm run bench
//
// Results are also written to benchmark-results.json. Free models are rate limited and vary run to run,
// so treat one run as a sample, not a guarantee.
const fs = require('node:fs');

const BASE = (process.env.BASE_URL || 'https://wizgame-nine.vercel.app').replace(/\/$/, '');
const PROMPTS = [
  'A round timer that counts down from 60 and fires a RemoteEvent when it reaches zero.',
  'A leaderboard that gives each player a Coins value and adds 1 per second.',
  'An NPC that chases the nearest player with PathfindingService and damages on touch.',
  'A tool that fires a projectile toward the mouse position using a RemoteEvent.',
  'A GUI script that shows health, score and the match timer, updated by RemoteEvents.',
];
const SYSTEM =
  'Expert Roblox Lua scripter. Write a COMPLETE RUNNABLE script. Plain Lua only: no type annotations, no continue, ' +
  'use task.wait, game:GetService(). Declare every variable. Finish every end. Output ONLY Lua code, no markdown.';

async function post(path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'HTTP ' + r.status);
  return data;
}

(async () => {
  const rows = [];
  for (const prompt of PROMPTS) {
    const t0 = Date.now();
    try {
      const chat = await post('/api/chat', { system: SYSTEM, messages: [{ role: 'user', content: prompt }], max_tokens: 3000 });
      const source = String(chat.text || '').replace(/```lua|```/gi, '').trim();
      const { results } = await post('/api/validate-lua', { files: [{ name: 'bench', source }] });
      const r = results[0];
      rows.push({ prompt, model: chat.model, ms: Date.now() - t0, parses: r.syntaxOk, undefinedGlobals: r.undefinedGlobals, warnings: r.warnings, error: r.error });
    } catch (e) {
      rows.push({ prompt, ms: Date.now() - t0, parses: false, error: String(e.message || e).slice(0, 160) });
    }
    console.log((rows[rows.length - 1].parses ? 'PASS ' : 'FAIL ') + prompt.slice(0, 70));
    await new Promise((res) => setTimeout(res, 1500)); // stay under the rate limit
  }
  const ok = rows.filter((r) => r.parses).length;
  console.log(`\n${ok}/${rows.length} scripts parsed (${BASE})`);
  fs.writeFileSync('benchmark-results.json', JSON.stringify({ base: BASE, at: new Date().toISOString(), rows }, null, 2));
  process.exitCode = ok === rows.length ? 0 : 1;
})();
