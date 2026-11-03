const luaparse = require('luaparse');
const { guard } = require('./_lib/security');

const MAX_FILES = 20;
const MAX_SOURCE_CHARS = 60000;

// Names that really exist in Roblox's Luau. Anything else used as a global is
// almost certainly a typo (for example "works" instead of "workspace").
const ROBLOX_GLOBALS = new Set([
  'game', 'workspace', 'script', 'plugin', 'shared', '_G', '_VERSION',
  'Instance', 'Vector3', 'Vector2', 'Vector3int16', 'Vector2int16', 'CFrame',
  'Color3', 'BrickColor', 'UDim', 'UDim2', 'Rect', 'Region3', 'Region3int16',
  'Ray', 'Enum', 'TweenInfo', 'Random', 'NumberRange', 'NumberSequence',
  'NumberSequenceKeypoint', 'ColorSequence', 'ColorSequenceKeypoint',
  'PhysicalProperties', 'Axes', 'Faces', 'DateTime', 'Font', 'OverlapParams',
  'RaycastParams', 'PathWaypoint', 'CatalogSearchParams', 'SharedTable',
  'task', 'math', 'string', 'table', 'os', 'coroutine', 'utf8', 'bit32',
  'debug', 'buffer',
  'print', 'warn', 'error', 'assert', 'pcall', 'xpcall', 'select', 'type',
  'typeof', 'tostring', 'tonumber', 'ipairs', 'pairs', 'next', 'unpack',
  'require', 'setmetatable', 'getmetatable', 'rawget', 'rawset', 'rawequal',
  'rawlen', 'newproxy', 'collectgarbage', 'tick', 'time', 'elapsedTime',
  'wait', 'spawn', 'delay', 'settings', 'stats', 'version', 'UserSettings',
  'loadstring',
]);

const DEPRECATED = [
  [/(^|[^\w.:])wait\s*\(/, 'wait() is deprecated, use task.wait()'],
  [/(^|[^\w.:])spawn\s*\(/, 'spawn() is deprecated, use task.spawn()'],
  [/(^|[^\w.:])delay\s*\(/, 'delay() is deprecated, use task.delay()'],
];

// luaparse understands plain Lua, not Luau. Roblox code often uses "x += 1" and
// "continue". Rewrite those into plain Lua with the SAME line structure, only so
// the parser can check everything else. The user's real code is never changed.
function luauToPlain(src) {
  return src.split('\n').map(rawLine => {
    let line = rawLine;
    line = line.replace(/(^|[\s;])continue(?=\s*($|;|--|\bend\b|\belse\b|\belseif\b))/g, '$1do end');
    const m = /^(\s*)([A-Za-z_][\w.\[\]"':]*)\s*(\+|-|\*|\/|%|\^|\.\.)=\s*(.+)$/.exec(line);
    if (m) return `${m[1]}${m[2]} = ${m[2]} ${m[3]} ${m[4]}`;
    return line;
  }).join('\n');
}

function checkOne(file) {
  const name = String(file && file.name || 'unnamed');
  const source = String(file && file.source || '');
  const out = { name, syntaxOk: true, error: null, warnings: [], undefinedGlobals: [], truncated: false };

  if (!source.trim()) {
    out.syntaxOk = false;
    out.error = 'File is empty';
    return out;
  }
  if (source.length > MAX_SOURCE_CHARS) {
    out.syntaxOk = false;
    out.error = 'File is too large to check';
    return out;
  }

  let ast = null;
  try {
    ast = luaparse.parse(luauToPlain(source), { luaVersion: '5.3', scope: true, comments: false });
  } catch (e) {
    out.syntaxOk = false;
    out.error = String(e.message || e).slice(0, 200);
    // "near <eof>" means the file ended too early: the AI ran out of space mid-script.
    if (/<eof>/.test(out.error)) {
      out.truncated = true;
      out.error += ' (the file looks cut off: the AI stopped before finishing it)';
    }
    return out;
  }

  // Undefined globals: catches typos like "works" or "charact".
  const seen = new Set();
  (ast.globals || []).forEach(g => {
    if (g && g.name && !ROBLOX_GLOBALS.has(g.name) && !seen.has(g.name)) {
      seen.add(g.name);
      out.undefinedGlobals.push(g.name);
    }
  });
  if (out.undefinedGlobals.length) {
    out.warnings.push('undefined variable(s): ' + out.undefinedGlobals.slice(0, 6).join(', '));
  }

  // Deprecated Roblox functions (checked line by line, comments skipped).
  const found = new Set();
  source.split('\n').forEach(line => {
    const code = line.replace(/--.*$/, '');
    DEPRECATED.forEach(([re, msg]) => { if (re.test(code)) found.add(msg); });
  });
  found.forEach(m => out.warnings.push(m));

  return out;
}

module.exports = function handler(req, res) {
  if (guard(req, res, 120)) return;

  const files = req.body && req.body.files;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Send { files: [{ name, source }] }.' });
  }
  if (files.length > MAX_FILES) {
    return res.status(400).json({ error: 'Too many files (max ' + MAX_FILES + ').' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ results: files.map(checkOne) });
};
