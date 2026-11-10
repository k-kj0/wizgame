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
