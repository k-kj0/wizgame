const test = require('node:test');
const assert = require('node:assert');
const { checkOne, luauToPlain } = require('../api/validate-lua');

const check = (source) => checkOne({ name: 'Test', source });

test('accepts a valid script', () => {
  const r = check('local Players = game:GetService("Players")\nPlayers.PlayerAdded:Connect(function(p) print(p.Name) end)');
  assert.strictEqual(r.syntaxOk, true);
  assert.deepStrictEqual(r.undefinedGlobals, []);
});

test('reports a syntax error', () => {
  const r = check('local x = \nif then end');
  assert.strictEqual(r.syntaxOk, false);
  assert.ok(r.error);
});

test('flags a cut-off file as truncated', () => {
  const r = check('local function f()\n  print("hi")\n');
  assert.strictEqual(r.syntaxOk, false);
  assert.strictEqual(r.truncated, true);
});

test('catches a mistyped global such as "works"', () => {
  const r = check('local p = works:FindFirstChild("Part")');
  assert.strictEqual(r.syntaxOk, true);
  assert.ok(r.undefinedGlobals.includes('works'));
});

test('does not flag real Roblox globals', () => {
  const r = check('local t = os.clock()\nlocal v = Vector3.new(0,1,0)\nworkspace.Gravity = 100\ntask.wait(1)');
  assert.deepStrictEqual(r.undefinedGlobals, []);
});

test('warns about deprecated wait()/spawn()/delay()', () => {
  const r = check('wait(1)\nspawn(function() end)\ndelay(1, function() end)');
  assert.strictEqual(r.warnings.filter((w) => /deprecated/.test(w)).length, 3);
});

test('does not warn about task.wait() or comments', () => {
  const r = check('task.wait(1)\n-- wait(1) is old');
  assert.strictEqual(r.warnings.length, 0);
});

test('accepts Luau compound assignment and continue', () => {
  const r = check('local n = 0\nfor i = 1, 3 do\n  n += i\n  if i == 2 then continue end\nend');
  assert.strictEqual(r.syntaxOk, true);
});

test('rewrites compound assignment without changing line count', () => {
  const src = 'local a = 1\na += 2\nb.c -= 3';
  assert.strictEqual(luauToPlain(src).split('\n').length, src.split('\n').length);
});

test('rejects an empty file', () => {
  assert.strictEqual(check('   ').syntaxOk, false);
});

// ---- Luau-aware path ----
test('accepts real Luau: type annotations, casts and string interpolation', () => {
  const src = [
    'type Stats = { hp: number, name: string? }',
    'local function heal(s: Stats, n: number): Stats',
    '  s.hp += n',
    '  return s',
    'end',
    'local msg = `hp is {heal({ hp = 1 }, 2).hp}`',
    'local v = (workspace :: any).Gravity',
    'for i = 1, 3 do if i == 2 then continue end end',
  ].join('\n');
  const r = check(src);
  assert.strictEqual(r.syntaxOk, true, r.error);
  assert.strictEqual(r.engine, 'luau');
});

test('still rejects broken Luau and reports a line number', () => {
  const r = check('local x: number = = 3');
  assert.strictEqual(r.syntaxOk, false);
  assert.match(r.error, /\(1:\d+\)/);
});

test('flags a cut-off table as truncated', () => {
  const r = check('local t = {\n  a = 1,\n  b = ');
  assert.strictEqual(r.syntaxOk, false);
  assert.strictEqual(r.truncated, true);
});

test('says when the undeclared-variable check was skipped for Luau-only syntax', () => {
  const r = check('local function f(a: number): number return a end');
  assert.strictEqual(r.syntaxOk, true);
  assert.ok(r.notes.length >= 1);
});
