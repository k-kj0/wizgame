const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const MAXR = 4,
  QROUNDS = 2; // max automatic fix rounds, question rounds
const ICONS = {
  idea: ["..aaaa..", ".aawwaa.", ".aawaaa.", ".aaaaaa.", "..aaaa..", "...dd...", "...dd...", "..dddd.."],
  level: ["......aa", ".....aaa", "....aa..", "...aa...", "..aa....", ".aa.....", "aaaaaaaa", "dddddddd"],
  ask: ["..aaaa..", ".aa..aa.", "....aa..", "...aa...", "...aa...", "........", "...aa...", "...aa..."],
  better: ["...aa...", "..aaaa..", ".aaaaaa.", "aaaaaaaa", "...aa...", "...aa...", "...aa...", "...aa..."],
  design: ["......aa", ".....aaa", "....aaa.", "...aaa..", "..dda...", ".dddd...", ".ddd....", "..d....."],
  code: ["........", "..a..a..", ".a....a.", "a..aa..a", "a..aa..a", ".a....a.", "..a..a..", "........"],
  review: ["..aaaa..", ".a....a.", ".a....a.", ".a....a.", "..aaaa..", "....ddd.", ".....ddd", "......dd"],
  wizard: ["...a....", "..aa....", "..aaa...", ".aaaaa..", ".aawaa..", "aaaaaaaa", "dddddddd", "........"],
  test: ["..dddd..", "...aa...", "...aa...", "..aaaa..", ".aaaaaa.", "aawaaaaa", "aaaaaaaa", ".aaaaaa."],
  fix: ["..aa.aa.", ".aaaaaa.", ".aaaaa..", "..aaa...", "...dd...", "...dd...", "..dd....", ".dd....."],
  ship: ["..aaaa..", ".aaaaaa.", "aaaddaaa", "aaaddaaa", "aaaddaaa", "aaaddaaa", ".aaaaaa.", ".dddddd."],
  help: [".aaaaaa.", "aaaaaaaa", "aawaawaa", "aaaaaaaa", ".aaaaaa.", "..aa....", ".a......", "........"],
};
function px(n, c) {
  let r = "";
  ICONS[n].forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${ch === "a" ? c : ch === "w" ? "#fff" : "#3a3a52"}"/>`;
    }),
  );
  return `<svg class="px" viewBox="0 0 8 8" shape-rendering="crispEdges" style="animation-delay:-${((n.length * 0.37 + c.length * 0.11) % 2).toFixed(1)}s">${r}</svg>`;
}
const ST = [
  {
    id: "idea",
    ic: "idea",
    bg: "#fff6c2",
    col: "#b58900",
    t: "Ideators",
    role: "Five bots each pitch a different game idea (about 50 words, plain language). You choose one and can add your own questions.",
    bots: [
      ["ActionBot", "Fast action + skill"],
      ["PuzzleBot", "Puzzle + strategy"],
      ["CoopBot", "Teamwork"],
      ["GrindBot", "Progress + collecting"],
      ["PartyBot", "Party + rounds"],
    ],
  },
  {
    id: "level",
    ic: "level",
    bg: "#e4f5b0",
    col: "#6a8f00",
    t: "Level Bot",
    role: "Lists the proposed idea, plans the levels and the reasons a player comes back, then a Walkthrough Bot explains in about 200 simple words how the game will look and play.",
    bots: [
      ["Level Bot", "Proposed idea + levels + hooks"],
      ["Walkthrough Bot", "~200-word game preview"],
    ],
  },
  {
    id: "ask",
    ic: "ask",
    bg: "#ffc2c2",
    col: "#d33",
    t: "Questioner",
    role: "Keeps challenging the idea in rounds: pros, cons and sharp questions. Round 2 asks new follow-ups.",
    bots: [["Questioner", "Pros, cons, questions"]],
  },
  {
    id: "better",
    ic: "better",
    bg: "#e6b422",
    col: "#7a5c00",
    t: "Betterment",
    role: "Answers every question (including yours) from the player's point of view, rewrites the idea, and lists exactly what changed (before vs new) in bullet points.",
    bots: [
      ["Betterment", "Answers + before/after rewrite"],
      ["Walkthrough Bot", "Final ~200-word preview"],
    ],
  },
  {
    id: "design",
    ic: "design",
    bg: "#a9d4ff",
    col: "#2a6fb5",
    t: "Designers",
    role: "Decide what to build in Studio and generate a bird's-eye image of the game.",
    bots: [
      ["MapBot", "Parts + layout"],
      ["PlayerBot", "Player + rules"],
      ["UIBot", "HUD + lighting"],
      ["SketchBot", "Top-down layout (drawn by code)"],
    ],
  },
  {
    id: "code",
    ic: "code",
    bg: "#c9bcff",
    col: "#5b45d6",
    t: "Coders",
    role: "Write one Lua script per system, each with its Studio location.",
    bots: [
      ["GameManager", "Rounds + scoring"],
      ["NPCController", "Enemy AI"],
      ["PlayerCtrl", "Input + effects"],
      ["GUIScript", "HUD + timer"],
      ["MapBuilder", "Builds the arena"],
    ],
  },
  {
    id: "review",
    ic: "review",
    bg: "#9cf0d4",
    col: "#0e8a68",
    t: "Reviewers",
    role: "A real Lua parser checks syntax (auto-fixes once), then bots check placement and logic.",
    bots: [
      ["SyntaxBot", "Typos + bad API calls"],
      ["PlacementBot", "Server vs client"],
      ["LogicBot", "Does the loop work?"],
    ],
  },
  {
    id: "wiz",
    ic: "wizard",
    bg: "#f1b3ff",
    col: "#a02fc0",
    t: "Wizard Gate",
    role: "Explains every file in plain words. Nothing is checked or fixed until you approve.",
    bots: [["Wizard", "Plain-language walkthrough"]],
  },
  {
    id: "test",
    ic: "test",
    bg: "#ffc08a",
    col: "#c4601a",
    t: "Code Check",
    role: "Looks at the files that exist: is any required file missing, does every file have a name, type and Studio location, does it parse, do the shared names agree. It gives no scores, because nothing has been played yet. Then it lists your next steps.",
    bots: [
      ["FileCheck", "Any file missing?"],
      ["FormatCheck", "Name, type, location"],
      ["ParseCheck", "Luau syntax + typos"],
      ["ContractCheck", "Shared names agree"],
      ["NextSteps", "What you do next"],
    ],
  },
  {
    id: "fix",
    ic: "fix",
    bg: "#ffa8b8",
    col: "#c0304f",
    t: "Fix Rounds",
    role: "Runs only while blocking problems exist. The Planner turns each problem into a job, the Coders create the missing files or rewrite the broken ones, and the Checker re-runs every check. A round that is not better is reverted.",
    bots: [
      ["Planner", "Turns problems into jobs"],
      ["Coders", "Create or rewrite files"],
      ["Checker", "Re-run the checks"],
    ],
  },
  {
    id: "ship",
    ic: "ship",
    bg: "#b8f0a8",
    col: "#2d8a1c",
    t: "Ship + ProBot",
    role: "Ship it, and let ProBot list what you could add to make the game better.",
    bots: [["ProBot", "Add-on ideas"]],
  },
];
const S = (id) => ST.find((s) => s.id === id);
const PARTS = [
  ["Game loop and rounds", /PlayerAdded|round|match/i, "Add a GameManager script: rounds, win/lose, scoring"],
  ["Enemy / NPC bots", /Pathfinding|Humanoid|NPC/i, "Add an NPC controller script for the enemies"],
  ["Player controls", /UserInputService|Activated|Tool/i, "Add a player controller: input and weapon"],
  ["Timer", /timer|countdown|time ?left|os\.clock|tick\(/i, "Add a match timer script with a UI update"],
  ["GUI elements", /ScreenGui|TextLabel|Frame/i, "Add a GUI script: health bar, score and timer"],
  [
    "Map / arena",
    /Instance\.new\(["']Part|Terrain|Workspace/i,
    "Add a MapBuilder script that builds the arena",
  ],
  ["Score / leaderboard", /leaderstats|score/i, "Add a leaderboard / score script"],
  [
    "Remote events",
    /RemoteEvent|FireClient|FireServer/i,
    "Add a Remotes setup script in ServerScriptService that creates the RemoteEvents",
  ],
];
const kind = (p) =>
  /ModuleScript|Modules|ReplicatedStorage/i.test(p)
    ? "ModuleScript"
    : /ServerScriptService|ServerStorage/.test(p)
      ? "Script"
      : "LocalScript";
const FILE_TYPES = [
  [
    "Script",
    "Server Scripts",
    "Run on the server. In Studio insert a Script (not a LocalScript) at the location shown.",
  ],
  [
    "LocalScript",
    "LocalScripts (client)",
    "Run on each player's device. Insert a LocalScript at the location shown.",
  ],
  [
    "ModuleScript",
    "ModuleScripts",
    "Shared code that other scripts load with require(). Insert a ModuleScript.",
  ],
];
// "StarterPlayerScripts/X" really lives under StarterPlayer in the Explorer.
const studioPath = (p) =>
  p
    .split("/")
    .map((x) => (x === "StarterPlayerScripts" ? "StarterPlayer > StarterPlayerScripts" : x))
    .join(" > ");
const REQUIRED_FILES = [
  ["ServerScriptService/GameManager", "Game loop, rounds, match timer, scoring, RemoteEvents, win/lose."],
  ["ServerScriptService/NPCController", "Enemy or hazard spawning and behaviour, damage, respawn."],
  [
    "StarterPlayerScripts/PlayerController",
    "LocalScript: movement, weapon or tool input, effects, RemoteEvent listeners.",
  ],
  ["StarterGui/GameGui", "LocalScript: health bar, score, match timer, messages via RemoteEvents."],
  ["ServerScriptService/MapBuilder", "Build the arena Parts at runtime."],
];
const fileExt = (p) => ({ Script: ".server.lua", LocalScript: ".client.lua", ModuleScript: ".lua" })[kind(p)];
const words = (t) =>
  (
    String(t || "")
      .trim()
      .match(/\S+/g) || []
  ).length;
let GAMES = [],
  CUR = null;
let HP = {
  st: [
    ["Wizard", "idle"],
    ["Designer", "idle"],
    ["Coder", "idle"],
    ["Reviewer", "idle"],
    ["Checker", "idle"],
  ],
  msg: "",
};
$("logo").innerHTML = px("wizard", "#7c6af5") + "Roblox AI Studio";
$("hh").innerHTML = px("help", "#4a9eff") + "<b>Helper bot</b>";

let _active = 0;
const _queue = [];
function _slot() {
  return new Promise((res) => {
    const go = () => {
      if (_active < 2) {
        _active++;
        res();
      } else _queue.push(go);
    };
    go();
  });
}
function _free() {
  _active--;
  const n = _queue.shift();
  if (n) n();
}
const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ai(sys, user, max, g) {
  if (g && g.stopped) throw new Error("Stopped");
  await _slot();
  try {
    for (let t = 0; t < 3; t++) {
      if (g && g.stopped) throw new Error("Stopped");
      try {
        let r;
        try {
          r = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system: sys,
              messages: [{ role: "user", content: user }],
              max_tokens: max || 1500,
            }),
          });
        } catch (e) {
          const ne = new Error("Network error: is your deployment live?");
          ne.retry = true;
          throw ne;
        }
        const raw = await r.text();
        let d;
        try {
          d = JSON.parse(raw);
        } catch (e) {
          const je = new Error(
            "Server returned non-JSON (status " + r.status + "). Check Vercel function logs.",
          );
          je.retry = true;
          throw je;
        }
        if (!r.ok) {
          const he = new Error(d.error || "API error " + r.status);
          he.retry = r.status === 429 || r.status === 502 || r.status === 504;
          throw he;
        }
        if (!d.content) throw new Error(d.error || "No content in response.");
        return d.content.map((b) => b.text || "").join("");
      } catch (e) {
        if (!e.retry || t === 2) throw e;
        await _sleep(4000 * (t + 1));
      }
    }
  } finally {
    _free();
  }
}
async function validate(files) {
  try {
    const r = await fetch("/api/validate-lua", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    const d = await r.json();
    return r.ok && d.results ? d.results : null;
  } catch (e) {
    return null;
  }
}
const lst = (s, n) =>
  s
    ? s
        .split(/\n|;/)
        .map((x) => x.replace(/^\s*(?:[-*\u2022]+|\d+[.)])\s*/, "").trim())
        .filter((x) => x.length > 2)
        .slice(0, n || 5)
    : [];
// Reads "LABEL: text" up to the next "NEXT:" label. A label only counts when followed by a colon,
// so a word like "consistent" inside a pro can no longer be mistaken for the CONS label.
function sect(t, k, next) {
  const re = new RegExp("\\b" + k + "\\**\\s*:\\**\\s*([\\s\\S]*?)(?=\\b(?:" + next + ")\\**\\s*:|$)", "i");
  const m = re.exec(t);
  return m ? m[1].replace(/\*\*/g, "") : "";
}
const code0 = (t) => t.replace(/```lua|```/gi, "").trim();
const clone = (o) => JSON.parse(JSON.stringify(o));
function pg(id, el) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("on"));
  document.querySelectorAll(".nt").forEach((t) => t.classList.remove("on"));
  $("p-" + id).classList.add("on");
  el.classList.add("on");
  $("aside").style.display = id === "studio" ? "" : "none";
}

function mk(theme) {
  return {
    id: Date.now() + Math.random(),
    theme,
    name: theme.slice(0, 18),
    tab: "pipe",
    open: {},
    stopped: false,
    running: false,
    err: "",
    myq: "",
    ...blank(),
  };
}
function blank() {
  return {
    ideas: [],
    sel: -1,
    level: null,
    pros: [],
    cons: [],
    qs: [],
    cur: [],
    qa: [],
    changes: [],
    final: "",
    plan: "",
    design: "",
    svg: "",
    imgState: "",
    layout: null,
    artSrc: "",
    artState: "",
    chk: null,
    opinion: "",
    files: {},
    parser: null,
    fixed: {},
    rounds: [],
    round: 0,
    best: null,
    lastFail: "",
    note: "",
    v: {},
    st: {},
    bot: {},
    out: {},
    up: null,
    shipped: false,
    vb: {}, // bot verdicts: "stage:Bot" -> [{ head, tone, more }]
    dopen: {}, // which "full finding" panels are open
    walk0: "", // ~200-word preview after the Level Bot
    walk1: "", // ~200-word preview of the final, improved idea
    idea0: null, // the idea as first proposed (title, text, levels)
    ideaNow: null, // the idea after the latest Betterment round
    bRounds: [], // per round: { r, before, after, changes }
    botFile: {}, // coder bot name -> file path
    rewrote: {}, // file path -> fix rounds that rewrote it
  };
}
const setS = (g, id, v) => {
  g.st[id] = v;
  render();
};
const bs = (g, s, n, v) => {
  g.bot[s + ":" + n] = v;
  render();
};

// ---------- bot verdicts: what each bot found, shown on its card ----------
// tone: ok | warn | bad | info
const bv = (g, s, n, head, tone, more) => {
  const k = s + ":" + n;
  (g.vb[k] = g.vb[k] || []).push({
    head: String(head).slice(0, 240),
    tone: tone || "info",
    more: more ? String(more).trim() : "",
  });
};
const bset = (g, s, n, head, tone, more) => {
  g.vb[s + ":" + n] = [];
  bv(g, s, n, head, tone, more);
};
const firstLine = (t, max) => {
  const l =
    String(t || "")
      .split("\n")
      .map((x) => x.replace(/^\s*(?:[-*#\u2022]+|\d+[.)])\s*/, "").trim())
      .find((x) => x.length > 3) || "";
  return l.length > max ? l.slice(0, max - 1) + "\u2026" : l;
};
const sentence = (t) =>
  String(t || "")
    .trim()
    .split(/(?<=[.!?])\s/)[0];
const bullets = (t, n) => {
  let a = String(t || "")
    .split("\n")
    .map((x) => x.replace(/^\s*(?:[-*\u2022]+|\d+[.)])\s*/, "").trim())
    .filter((x) => x.length > 2);
  if (a.length < 2 && a[0] && a[0].includes(";")) a = lst(a[0], n || 8);
  return a.slice(0, n || 8);
};
const planText = (g) =>
  g.ideaNow.title +
  ": " +
  g.ideaNow.text +
  "\nLevels: " +
  g.ideaNow.levels.join("; ") +
  "\nReplay hooks: " +
  g.level.hooks.join("; ");

// One verdict per Coder bot: what it wrote, combined with the parser result once that has run.
function codeVerdicts(g) {
  Object.entries(g.botFile).forEach(([bot, p]) => {
    const c = g.files[p];
    if (c == null) return;
    const r = g.parser && g.parser[p];
    let head = `${p.split("/").pop()}: ${c.split("\n").length} lines (${kind(p)})`,
      tone = "info";
    if (r) {
      if (!r.syntaxOk) {
        head += ` \u00b7 does not parse: ${r.error}`;
        tone = "bad";
      } else if ((r.undefinedGlobals || []).length) {
        head += ` \u00b7 parses, but uses undeclared variable(s): ${r.undefinedGlobals.slice(0, 4).join(", ")}`;
        tone = "warn";
      } else if (r.warnings && r.warnings.length) {
        head += ` \u00b7 parses, ${r.warnings.length} Roblox API warning(s)`;
        tone = "warn";
      } else {
        head += " \u00b7 parses cleanly";
        tone = "ok";
      }
      if (g.fixed[p]) head += " (auto-fixed once)";
    }
    const rw = g.rewrote[p];
    if (rw && rw.length) head += ` \u00b7 rewritten in fix round ${rw.join(", ")}`;
    bset(
      g,
      "code",
      bot,
      head,
      tone,
      r && r.warnings && r.warnings.length ? "Warnings:\n- " + r.warnings.join("\n- ") : "",
    );
  });
}

// Reviewer bots are asked to open with "VERDICT: PASS|ISSUES - sentence". SyntaxBot also reports the
// real parser result, which outranks the model's opinion.
function reviewVerdict(g, bot, text, i) {
  const failed = /^\(this bot could not run/.test(text);
  const m = /VERDICT:\s*\**\s*(PASS|ISSUES|FAIL)\b\**\s*[-:\u2013\u2014]?\s*(.*)/i.exec(text);
  let head = m ? m[2].trim() || m[1].toUpperCase() : firstLine(text, 160) || "No verdict returned";
  let tone = failed ? "bad" : m ? (/PASS/i.test(m[1]) ? "ok" : "warn") : "info";
  if (i === 0 && g.parser) {
    const bad = Object.values(g.parser).filter((r) => !r.syntaxOk).length;
    const und = critList(g).filter((x) => /undefined/.test(x)).length;
    if (bad) {
      head = `Parser: ${bad} file(s) still fail to parse. ` + head;
      tone = "bad";
    } else if (und) {
      head = `Parser: undeclared variable(s) in ${und} file(s). ` + head;
      if (tone !== "bad") tone = "warn";
    } else head = "Parser: every file parses. " + head;
  }
  bset(g, "review", bot, head, tone, text);
}
function fan(g, sid, fn) {
  return Promise.all(
    S(sid).bots.map(async (b, i) => {
      bs(g, sid, b[0], "work");
      try {
        const r = await fn(b, i);
        bs(g, sid, b[0], "done");
        return r;
      } catch (e) {
        bs(g, sid, b[0], "err");
        throw e;
      }
    }),
  );
}
function fail(g, e) {
  if (e.message !== "Stopped") {
    g.err = e.message;
    const r = Object.keys(g.st).find((k) => g.st[k] === "run");
    if (r) g.st[r] = "err";
  }
}
function sel(id) {
  CUR = GAMES.find((g) => g.id == id);
  render();
}
function tg(id) {
  const g = CUR,
    st = g.st[id] || "idle";
  g.open[id] = !(g.open[id] !== undefined ? g.open[id] : st === "run" || st === "wait");
  render();
}
function jump(id) {
  CUR.tab = "pipe";
  CUR.open[id] = true;
  render();
  setTimeout(() => {
    const e = $("s-" + id);
    e && e.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 50);
}
async function go() {
  const t = $("gp").value.trim();
  if (!t) return;
  const g = mk(t);
  GAMES.push(g);
  CUR = g;
  g.running = true;
  render();
  try {
    await s1(g);
  } catch (e) {
    fail(g, e);
  }
  g.running = false;
  render();
}
async function pick(i) {
  const g = CUR;
  if (g.running) return;
  Object.assign(g, blank(), { ideas: g.ideas, sel: i });
  g.st.idea = "done";
  g.stopped = false;
  g.err = "";
  g.running = true;
  g.open.level = g.open.ask = g.open.better = true;
  render();
  try {
    await sLevel(g);
    for (let r = 1; r <= QROUNDS; r++) {
      await sAsk(g, r);
      await sBetter(g, r);
    }
    await s2(g);
    await s3(g);
    await s4(g);
    await s5(g);
  } catch (e) {
    fail(g, e);
  }
  g.running = false;
  render();
}

async function s1(g) {
  setS(g, "idea", "run");
  const A = [
    "fast action and skill",
    "puzzle and strategy",
    "co-op teamwork",
    "progression and collecting",
    "party and competitive rounds",
  ];
  const res = await fan(g, "idea", async (b, i) => {
    const t = await ai(
      "You are a Roblox game ideator. Write ONE game idea in simple language, about 50 words. Reply exactly:\nTITLE: 3-5 words\nIDEA: the idea",
      `Theme: "${g.theme}". Angle: ${A[i]}. Make it different from other angles.`,
      220,
      g,
    );
    const title = ((/TITLE:\s*(.+)/i.exec(t) || [])[1] || A[i]).trim();
    bset(g, "idea", b[0], "Pitched \u201c" + title + "\u201d (angle: " + A[i] + ")", "info", t);
    return t;
  });
  g.ideas = res.map((t, i) => ({
    n: S("idea").bots[i][0],
    title: (/TITLE:\s*(.+)/i.exec(t) || [])[1] || A[i],
    text: ((/IDEA:\s*([\s\S]+)/i.exec(t) || [])[1] || t).trim(),
  }));
  g.st.idea = "wait";
  g.open.idea = true;
  render();
}
async function sLevel(g) {
  setS(g, "level", "run");
  bs(g, "level", "Level Bot", "work");
  const it = g.ideas[g.sel];
  const t = await ai(
    "You are the Level Bot. Think like a player deciding whether to play this game again tomorrow. Reply exactly:\nLEVELS: level 1 name and twist; level 2; level 3; level 4\nHOOKS: reason to replay; reason; reason; reason\nCOMEBACK: the single strongest reason players return, one sentence",
    "Idea: " + it.title + ". " + it.text,
    450,
    g,
  );
  g.level = {
    levels: lst(sect(t, "LEVELS", "HOOKS"), 6),
    hooks: lst(sect(t, "HOOKS", "COMEBACK"), 6),
    why: sect(t, "COMEBACK", "$^").trim(),
  };
  g.idea0 = { title: it.title, text: it.text, levels: g.level.levels.slice() };
  g.ideaNow = clone(g.idea0);
  g.plan = planText(g);
  g.base = g.plan;
  const n = g.level.levels.length;
  bset(
    g,
    "level",
    "Level Bot",
    n >= 3
      ? `Proposed \u201c${it.title}\u201d with ${n} levels and ${g.level.hooks.length} replay hooks`
      : `Only ${n} level(s) came back. Choose the idea again to retry`,
    n >= 3 ? "ok" : "warn",
    g.level.why ? "Strongest reason to return: " + g.level.why : "",
  );
  bs(g, "level", "Level Bot", "done");
  await walkthrough(g, 0);
  setS(g, "level", "done");
}

// Plain-language preview (about 200 words) of how the game looks and plays.
// which = 0: right after the Level Bot. which = 1: for the final, improved idea.
// A failure here is not fatal: the pipeline carries on without the preview.
async function walkthrough(g, which) {
  const key = which ? "walk1" : "walk0",
    stage = which ? "better" : "level",
    bot = "Walkthrough Bot";
  bs(g, stage, bot, "work");
  const sys =
    "You are the Walkthrough Bot. Explain to a complete beginner, in simple everyday language, how this Roblox game will look and play. Write about 200 words (between 180 and 220) as 3 short paragraphs of plain text: no headings, no bullets, no markdown. Cover: what the player sees (the world, the screen, the controls); what happens in each level in order and how each level feels different from the last; what winning and losing look like; and why a player would come back tomorrow. Use only the idea and levels given.";
  const user = "Game:\n" + g.plan.slice(0, 1800);
  const clean = (x) => x.trim().replace(/\*+/g, "");
  try {
    let t = clean(await ai(sys, user, 450, g));
    let n = words(t);
    if (n < 150 || n > 260) {
      const t2 = clean(
        await ai(sys + ` Your last try was ${n} words. Aim for exactly 200 words.`, user, 450, g),
      );
      if (Math.abs(words(t2) - 200) < Math.abs(n - 200)) {
        t = t2;
        n = words(t2);
      }
    }
    g[key] = t;
    bset(
      g,
      stage,
      bot,
      `Wrote a ${n}-word walkthrough of how the game looks and plays`,
      n >= 150 && n <= 260 ? "ok" : "warn",
      "",
    );
    bs(g, stage, bot, "done");
  } catch (e) {
    if (e.message === "Stopped") throw e;
    bset(g, stage, bot, "Could not write the walkthrough: " + String(e.message).slice(0, 120), "bad", "");
    bs(g, stage, bot, "err");
  }
}
async function redoWalk(which) {
  const g = CUR;
  if (!g || g.running) return;
  g.running = true;
  g.err = "";
  g.stopped = false;
  render();
  try {
    await walkthrough(g, which);
  } catch (e) {
    fail(g, e);
  }
  g.running = false;
  render();
}
async function sAsk(g, r) {
  setS(g, "ask", "run");
  bs(g, "ask", "Questioner", "work");
  const t = await ai(
    r === 1
      ? "You are the Questioner. Challenge this Roblox game like a skeptical player and developer. Be tough, especially on replayability and levels. Reply exactly:\nPROS: item; item; item\nCONS: item; item; item\nQUESTIONS: 5 or 6 sharp questions separated by ;"
      : "You are the Questioner, round " +
          r +
          ". Ask 3 NEW follow-up questions about weaknesses that remain in the improved idea. Do not repeat earlier questions. Reply exactly:\nQUESTIONS: question; question; question",
    "Idea:\n" + g.plan + (r > 1 ? "\nAlready asked: " + g.qs.map((x) => x.q).join(" | ") : ""),
    480,
    g,
  );
  if (r === 1) {
    g.pros = lst(sect(t, "PROS", "CONS"));
    g.cons = lst(sect(t, "CONS", "QUESTIONS"));
  }
  const qs = lst(sect(t, "QUESTIONS", "$^"), 8).map((q) => ({ q, mine: false, r }));
  const asked = qs.length;
  if (r === 1)
    (g.myq || "")
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 2)
      .forEach((q) => qs.push({ q, mine: true, r }));
  g.cur = qs;
  g.qs.push(...qs);
  const mine = qs.length - asked;
  bv(
    g,
    "ask",
    "Questioner",
    !asked
      ? `Round ${r}: no questions came back`
      : r === 1
        ? `Round 1: found ${g.pros.length} strength(s) and ${g.cons.length} weakness(es); asked ${asked} question(s)${mine ? ` plus ${mine} of yours` : ""}`
        : `Round ${r}: asked ${asked} new follow-up question(s)`,
    !asked ? "bad" : r === 1 && g.cons.length > g.pros.length ? "warn" : "ok",
    (r === 1 && g.cons.length ? "Weaknesses found:\n- " + g.cons.join("\n- ") + "\n\n" : "") +
      "Questions:\n- " +
      qs.map((x) => x.q).join("\n- "),
  );
  bs(g, "ask", "Questioner", "done");
  setS(g, "ask", r < QROUNDS ? "run" : "done");
}
async function sBetter(g, r) {
  setS(g, "better", "run");
  bs(g, "better", "Betterment", "work");
  const items = g.cur.map((x, i) => ({ ...x, n: i + 1 }));
  const call = (list, sys) =>
    ai(
      sys,
      "Current idea:\n" +
        g.plan +
        "\n\n" +
        list.map((x) => `Q${x.n}${x.mine ? " (from the user)" : ""}: ${x.q}`).join("\n"),
      1500,
      g,
    );
  const get = (t, n) => {
    const m = new RegExp("(?:^|\\n)\\s*\\**A" + n + "\\**\\s*:\\s*(.+)").exec(t);
    return m ? m[1].trim() : "";
  };
  const t = await call(
    items,
    "You are the Betterment bot. Think from the PLAYER's point of view. Answer EVERY question, one line each, exactly 'A<number>: answer' (max 30 words). Then improve the idea so it fixes every problem the questions raised. Finish with exactly these labelled lines:\nTITLE: name\nIMPROVED IDEA: max 120 words, simple language\nCHANGES: 4 to 6 bullets, each on its own line starting with '- ', written as 'Before -> Now' (what the idea said before, and what it says now)\nLEVELS: level 1; level 2; level 3; level 4 (update them if the improvement changes them, otherwise repeat the current levels)",
  );
  items.forEach((x) => (x.a = get(t, x.n)));
  const miss = items.filter((x) => !x.a);
  if (miss.length) {
    const t2 = await call(
      miss,
      "Answer EVERY question below, one line each, exactly 'A<number>: answer' (max 30 words).",
    );
    miss.forEach((x) => (x.a = get(t2, x.n)));
  }
  items.forEach((x) => {
    if (!x.a) x.a = "(no answer returned)";
  });
  g.qa.push(...items.map((x) => ({ q: x.q, a: x.a, mine: x.mine, r })));

  // Before vs new: the idea going into this round, and what the Betterment bot turned it into.
  const fin = sect(t, "IMPROVED IDEA", "CHANGES").trim();
  const newTitle = sect(t, "TITLE", "IMPROVED IDEA").trim().split("\n")[0];
  const changes = bullets(sect(t, "CHANGES", "LEVELS"), 8);
  const lv = lst(sect(t, "LEVELS", "$^"), 6);
  const before = clone(g.ideaNow);
  const after = {
    title: (newTitle || before.title).slice(0, 60),
    text: fin || before.text,
    levels: lv.length >= 3 ? lv : before.levels,
  };
  g.ideaNow = after;
  g.level.levels = after.levels.slice();
  if (fin) {
    g.final = fin;
    g.plan = planText(g);
  }
  g.bRounds.push({ r, before, after, changes });
  g.changes = g.changes.concat(changes);

  const answered = items.filter((x) => !x.a.startsWith("(no answer")).length;
  bv(
    g,
    "better",
    "Betterment",
    `Round ${r}: answered ${answered} of ${items.length} question(s); ` +
      (fin ? `rewrote the idea with ${changes.length} listed change(s)` : "did not return a rewritten idea"),
    answered === items.length && fin ? "ok" : "warn",
    changes.length ? "What changed:\n- " + changes.join("\n- ") : "",
  );
  bs(g, "better", "Betterment", "done");
  if (r === QROUNDS) await walkthrough(g, 1);
  setS(g, "better", r < QROUNDS ? "run" : "done");
}

// ---------- layout drawing ----------
// The SketchBot no longer asks an image generator for a picture: free image models ignore the spec and
// return random art. It asks for the arena as numbers and this code draws them, so the picture always
// matches what was specified (and what the scripts will build).
const ZONE_KINDS = {
  floor: ["#3f6b4a", "Floor"],
  path: ["#9a8a62", "Path"],
  water: ["#2b6cb0", "Water"],
  safe: ["#2aa198", "Safe zone"],
  wall: ["#6b7280", "Wall"],
  hazard: ["#d64545", "Hazard"],
  goal: ["#d4a017", "Goal"],
  spawn: ["#3b82f6", "Spawn"],
};
const ZONE_ORDER = ["floor", "path", "water", "safe", "wall", "hazard", "goal", "spawn"];
function parseLayout(t) {
  const m = /\{[\s\S]*\}/.exec(String(t || ""));
  if (!m) throw new Error("no JSON found");
  const o = JSON.parse(m[0]);
  const num = (v, lo, hi, d) => {
    v = Number(v);
    return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
  };
  const arena = { w: num(o.arena && o.arena.w, 20, 2000, 100), d: num(o.arena && o.arena.d, 20, 2000, 100) };
  const zones = (Array.isArray(o.zones) ? o.zones : []).slice(0, 20).map((z) => ({
    name: String((z && z.name) || "Zone").slice(0, 32),
    kind: z && ZONE_KINDS[z.kind] ? z.kind : "floor",
    x: num(z && z.x, -2000, 2000, 0),
    z: num(z && z.z, -2000, 2000, 0),
    w: num(z && z.w, 1, 2000, 10),
    d: num(z && z.d, 1, 2000, 10),
  }));
  if (zones.length < 2) throw new Error("fewer than 2 zones");
  return { arena, zones };
}
// Only numbers go into the SVG (zone names are shown in the HTML table, escaped), so it is safe to embed.
function layoutSvg(L) {
  const W = 640,
    H = 480,
    M = 30;
  const s = Math.min((W - 2 * M) / L.arena.w, (H - 2 * M) / L.arena.d);
  const ox = (W - L.arena.w * s) / 2,
    oy = (H - L.arena.d * s) / 2;
  const f = (n) => Math.round(n * 10) / 10;
  const step = [5, 10, 20, 25, 50, 100, 200, 500].find((v) => L.arena.w / v <= 12) || 500;
  let grid = "";
  for (let x = 0; x <= L.arena.w; x += step)
    grid += `<line x1="${f(ox + x * s)}" y1="${f(oy)}" x2="${f(ox + x * s)}" y2="${f(oy + L.arena.d * s)}"/>`;
  for (let z = 0; z <= L.arena.d; z += step)
    grid += `<line x1="${f(ox)}" y1="${f(oy + z * s)}" x2="${f(ox + L.arena.w * s)}" y2="${f(oy + z * s)}"/>`;
  const shapes = L.zones
    .map((z, i) => ({ z, i }))
    .sort((a, b) => ZONE_ORDER.indexOf(a.z.kind) - ZONE_ORDER.indexOf(b.z.kind))
    .map(({ z, i }) => {
      const x = ox + (z.x + L.arena.w / 2 - z.w / 2) * s,
        y = oy + (z.z + L.arena.d / 2 - z.d / 2) * s;
      const cx = x + (z.w * s) / 2,
        cy = y + (z.d * s) / 2;
      return `<rect x="${f(x)}" y="${f(y)}" width="${f(z.w * s)}" height="${f(z.d * s)}" rx="3" fill="${ZONE_KINDS[z.kind][0]}" fill-opacity=".88" stroke="#fff" stroke-opacity=".55"/><circle cx="${f(cx)}" cy="${f(cy)}" r="9" fill="#0b0d12"/><text x="${f(cx)}" y="${f(cy + 3.5)}" text-anchor="middle" font-size="10" font-family="sans-serif" font-weight="700" fill="#fff">${i + 1}</text>`;
    })
    .join("");
  const aw = f(L.arena.w * s),
    ad = f(L.arena.d * s);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#10131a"/><rect x="${f(ox)}" y="${f(oy)}" width="${aw}" height="${ad}" fill="#1a1f2b"/><g stroke="#ffffff" stroke-opacity=".07">${grid}</g><clipPath id="a"><rect x="${f(ox)}" y="${f(oy)}" width="${aw}" height="${ad}"/></clipPath><g clip-path="url(#a)">${shapes}</g><rect x="${f(ox)}" y="${f(oy)}" width="${aw}" height="${ad}" fill="none" stroke="#8b93a7"/><text x="${f(ox)}" y="${f(oy + L.arena.d * s + 16)}" font-size="11" font-family="sans-serif" fill="#8b93a7">${L.arena.w} x ${L.arena.d} studs, top-down (one grid square = ${step} studs)</text></svg>`;
}
async function startLayout(g) {
  g.imgState = "load";
  g.layout = null;
  g.svg = "";
  g.vb["design:SketchBot"] = [];
  bs(g, "design", "SketchBot", "work");
  const sys =
    'You are the SketchBot. Turn the map spec into a top-down layout. Reply with ONLY one JSON object, no markdown, in exactly this shape: {"arena":{"w":120,"d":120},"zones":[{"name":"Cannon Ring","kind":"hazard","x":0,"z":0,"w":30,"d":30}]}. Units are Roblox studs, the arena centre is 0,0, and x and z are the CENTRE of each zone. kind must be one of: floor, path, water, safe, wall, hazard, goal, spawn. Use 6 to 14 zones, list the main floor first, and reuse the names and numbers from the map spec.';
  const user = "Game: " + g.plan.slice(0, 500) + "\nMap spec:\n" + g.design.slice(0, 1800);
  for (let k = 0; k < 2 && !g.layout; k++) {
    try {
      g.layout = parseLayout(await ai(sys, user, 900, g));
    } catch (e) {
      if (e.message === "Stopped") throw e;
    }
  }
  if (g.layout) {
    g.svg = layoutSvg(g.layout);
    g.imgState = "ok";
    bset(
      g,
      "design",
      "SketchBot",
      `Drew a top-down layout with ${g.layout.zones.length} zones. It is drawn by code from the MapBot numbers, so it matches the spec`,
      "ok",
      "",
    );
    bs(g, "design", "SketchBot", "done");
  } else {
    g.imgState = "fail";
    bset(
      g,
      "design",
      "SketchBot",
      "The model did not return a readable layout. Click Redo layout",
      "bad",
      "",
    );
    bs(g, "design", "SketchBot", "err");
  }
  render();
}
// Optional, on request only. Free image models cannot follow a spec, so this is mood art, never a plan.
function conceptArt(g) {
  g.artState = "load";
  g.artSrc = "";
  render();
  const url =
    "https://image.pollinations.ai/prompt/" +
    encodeURIComponent(
      "low-poly colorful game arena concept art, mood only. " +
        g.plan.split("\n")[0].replace(/\s+/g, " ").slice(0, 200),
    ) +
    "?width=768&height=512&nologo=true&seed=" +
    Math.floor(Math.random() * 1e6);
  const im = new Image();
  im.onload = () => {
    g.artSrc = url;
    g.artState = "ok";
    render();
  };
  im.onerror = () => {
    g.artState = "fail";
    render();
  };
  im.src = url;
  setTimeout(() => {
    if (g.artState === "load") {
      g.artState = "fail";
      render();
    }
  }, 60000);
}

async function s2(g) {
  setS(g, "design", "run");
  const T = [
    "Explorer folders and map Parts: exact Names, Sizes, Positions, Materials",
    "Player setup: WalkSpeed, MaxHealth, rules, win/lose, weapon or tool",
    "ScreenGui elements (health, score, timer) with Position, Size, Text, plus Lighting values",
  ];
  const res = await fan(g, "design", async (b, i) => {
    if (i >= 3) return "";
    const t = await ai(
      `You are ${b[0]}, a Roblox Studio designer. Give concrete values and exact names.`,
      `Game: ${g.plan.slice(0, 1500)}\nTask: ${T[i]}`,
      700,
      g,
    );
    bset(g, "design", b[0], "Specified: " + firstLine(t, 150), t.trim().length > 120 ? "ok" : "warn", t);
    return t;
  });
  g.design = res
    .slice(0, 3)
    .map((x, k) => `== ${S("design").bots[k][0]} ==\n${x.trim()}`)
    .join("\n\n");
  g.out.design = g.design;
  await startLayout(g);
  setS(g, "design", "done");
}

// Writes one script. Used for the first pass and again when a fix round has to create a missing file.
async function writeFile(g, f) {
  const c = await ai(
    `Expert Roblox Lua scripter. Write a COMPLETE RUNNABLE script. Plain Lua only: no type annotations, no continue, use task.wait/task.spawn, game:GetService(). Every variable must be declared before use and spelled exactly the same everywhere. Never leave a table, function or if-block unfinished: write the file from first line to last line and finish with all 'end's. Keep it compact so it fits. Follow the CONTRACT names exactly. Location: ${f[0]}. Output ONLY Lua code, no markdown.`,
    `Game:\n${g.plan.slice(0, 1500)}\nDesign:\n${g.design.slice(0, 2500)}\nCONTRACT (use these exact names):\n${g.contract}\nOther files in this game: ${REQUIRED_FILES.map((x) => x[0]).join(", ")}\nFile: ${f[0]}\nJob: ${f[1]}`,
    3500,
    g,
  );
  g.files[f[0]] = code0(c);
}
async function s3(g) {
  setS(g, "code", "run");
  // One shared "contract" so every script uses the SAME names for RemoteEvents, folders and Parts. This stops files from disagreeing with each other.
  g.contract = await ai(
    "You are the lead Roblox architect. Write a short CONTRACT that every script must follow. List: (1) RemoteEvent names, each with direction (server->client or client->server) and arguments; (2) names of Folders and key Parts in Workspace; (3) shared numbers (round length, speeds, max health); (4) which script owns what. Use exact names, one item per line, no code.",
    `Game:\n${g.plan.slice(0, 1500)}\nDesign:\n${g.design.slice(0, 2500)}`,
    700,
    g,
  );
  g.out.contract = g.contract;
  await fan(g, "code", async (b, i) => {
    await writeFile(g, REQUIRED_FILES[i]);
    g.botFile[b[0]] = REQUIRED_FILES[i][0];
  });
  g.out.code = Object.entries(g.files)
    .map(([p, c]) => `${p.split("/").join(" → ")}  (${kind(p)}, ${c.split("\n").length} lines)`)
    .join("\n");
  codeVerdicts(g);
  setS(g, "code", "done");
}

async function checkFiles(g) {
  const list = () => Object.entries(g.files).map(([n, s]) => ({ name: n, source: s }));
  let res = await validate(list());
  if (!res) {
    g.parser = null;
    return;
  }
  const bad = res.filter((r) => !r.syntaxOk || (r.undefinedGlobals || []).length);
  if (bad.length) {
    await Promise.all(
      bad.map(async (b) => {
        try {
          const why = b.syntaxOk
            ? `These variables are used but never declared (probably typos): ${b.undefinedGlobals.join(", ")}. Fix the spelling or declare them with local. Roblox globals like workspace and game are fine.`
            : `Parser error: ${b.error}${b.truncated ? " The file was CUT OFF. Rewrite the WHOLE script from the first line, shorter and simpler, and finish every table, function and if-block." : ""}`;
          const f = await ai(
            "Expert Roblox Lua scripter. Fix the problem. Plain Lua only. Output ONLY the complete corrected Lua file from the first line to the last line, never a partial patch.",
            `${why}\n\nCONTRACT:\n${g.contract || "(none)"}\n\nCode:\n${g.files[b.name]}`,
            4000,
            g,
          );
          g.files[b.name] = code0(f);
          g.fixed[b.name] = true;
        } catch (e) {}
      }),
    );
    res = (await validate(list())) || res;
  }
  g.parser = {};
  res.forEach((r) => (g.parser[r.name] = r));
  codeVerdicts(g);
}
const anatomy = (g) =>
  PARTS.map((p) => ({
    n: p[0],
    hint: p[2],
    f: Object.entries(g.files)
      .filter(([k, c]) => p[1].test(c) || p[1].test(k))
      .map(([k]) => k.split("/").pop()),
  }));
async function s4(g) {
  setS(g, "review", "run");
  const bots = S("review").bots;
  bots.forEach((b) => (g.bot["review:" + b[0]] = "work"));
  render();
  await checkFiles(g);
  const all = Object.entries(g.files)
    .map(([p, c]) => `-- ${p}\n${c}`)
    .join("\n---\n")
    .slice(0, 12000);
  const P = [
    "SyntaxBot: list Lua syntax errors, undefined variables and bad API calls, with file and fix. If none, say none.",
    "PlacementBot: check server vs client placement. Server scripts must not touch LocalPlayer or UI; LocalScripts cannot use server-only APIs. List problems.",
    "LogicBot: check gameplay logic: does the loop work, win/lose trigger, enemy behaviour? List gaps.",
  ];
  const R = [];
  for (let i = 0; i < P.length; i++) {
    let r;
    try {
      r = (
        await ai(
          P[i] +
            " Judge only the code given. Start your reply with one line: 'VERDICT: PASS - <one sentence>' or 'VERDICT: ISSUES - <one sentence naming the main problem>'. Then list the details.",
          "Code:\n" +
            all +
            "\n\nMachine check results (these are facts):\n" +
            (critList(g).join("\n") || "no parser problems"),
          700,
          g,
        )
      ).trim();
    } catch (e) {
      if (e.message === "Stopped") throw e;
      r = "(this bot could not run: " + String(e.message).slice(0, 120) + ")";
    }
    reviewVerdict(g, bots[i][0], r, i);
    bs(g, "review", bots[i][0], "done");
    R.push(r);
  }
  const pr = g.parser
    ? Object.values(g.parser)
        .map(
          (r) =>
            `${r.syntaxOk ? "OK  " : "FAIL"} ${r.name}${g.fixed[r.name] ? " (auto-fixed once)" : ""}${r.syntaxOk ? "" : " - " + r.error}${r.warnings && r.warnings.length ? "\n     warn: " + r.warnings.join("; ") : ""}`,
        )
        .join("\n")
    : "Parser check unavailable (could not reach /api/validate-lua).";
  g.out.review =
    "PARSER\n" + pr + "\n\nSyntaxBot:\n" + R[0] + "\n\nPlacementBot:\n" + R[1] + "\n\nLogicBot:\n" + R[2];
  const n = Object.keys(g.files).length,
    bad = g.parser ? Object.values(g.parser).filter((r) => !r.syntaxOk).length : 0,
    warn = g.parser
      ? Object.values(g.parser).reduce((a, r) => a + (r.warnings ? r.warnings.length : 0), 0)
      : 0,
    miss = anatomy(g)
      .filter((a) => !a.f.length)
      .map((a) => a.n);
  g.v.review = {
    good: g.parser
      ? [
          `${n - bad} of ${n} scripts parse`,
          Object.keys(g.fixed).length
            ? "auto-fixed " + Object.keys(g.fixed).length + " file(s)"
            : "no syntax errors found",
        ]
      : ["parser offline: bots only"],
    risks: [
      bad ? bad + " file(s) still fail to parse" : "",
      crit(g) - bad > 0
        ? crit(g) -
          bad +
          " undefined variable(s): " +
          critList(g)
            .filter((x) => /undefined/.test(x))
            .join(" | ")
        : "",
      warn ? warn + " Roblox API warning(s)" : "",
      !g.parser ? "syntax not machine-checked" : "",
    ].filter(Boolean),
    rec: bad || crit(g) || !g.parser ? "FIX" : "APPROVE",
  };
  g.v.code = {
    good: [n + " scripts with locations and script types"],
    risks: miss.length
      ? ["Missing parts: " + miss.join(", ") + " (use the Helper)"]
      : ["All 8 core parts detected (keyword scan)"],
    rec: miss.length > 2 ? "FIX" : "APPROVE",
  };
  setS(g, "review", "done");
}

async function s5(g) {
  setS(g, "wiz", "run");
  g.bot["wiz:Wizard"] = "work";
  render();
  const ex = Object.entries(g.files)
    .map(([p, c]) => `FILE ${p} (${kind(p)})\n${c.slice(0, 1200)}`)
    .join("\n\n");
  const t = await ai(
    "You are the Wizard. In plain language for a beginner, explain what each file does, where it goes in Studio and what to watch for. Use ONLY the code excerpts given. End with: RECOMMENDATION: APPROVE or NEEDS CHANGES.",
    `Game: ${g.plan.slice(0, 400)}\n\n${ex}\n\nReview notes:\n${g.out.review.slice(0, 1500)}`,
    900,
    g,
  );
  g.out.wiz = t.trim();
  const rec = /RECOMMENDATION:\s*\**\s*(APPROVE|NEEDS CHANGES)/i.exec(t);
  bset(
    g,
    "wiz",
    "Wizard",
    rec
      ? /APPROVE/i.test(rec[1])
        ? "Recommends approving. Every file is explained in plain words below"
        : "Recommends changes before approving. See the explanation below"
      : "Explained every file in plain words (no recommendation line was returned)",
    rec ? (/APPROVE/i.test(rec[1]) ? "ok" : "warn") : "info",
    "",
  );
  g.bot["wiz:Wizard"] = "done";
  setS(g, "wiz", "wait");
}
async function approve() {
  const g = CUR;
  g.st.wiz = "done";
  g.open.test = true;
  g.running = true;
  g.err = "";
  render();
  try {
    await s6(g);
  } catch (e) {
    fail(g, e);
  }
  g.running = false;
  render();
  if (!g.err && g.chk) await improve(g);
}

// Files that do not parse, or use a variable that does not exist (used by the SyntaxBot verdict and review summary).
const crit = (g) => critList(g).length;
const critList = (g) =>
  g.parser
    ? Object.values(g.parser)
        .filter((r) => !r.syntaxOk || (r.undefinedGlobals || []).length)
        .map(
          (r) =>
            `${r.name}: ${r.syntaxOk ? "undefined variable(s) " + r.undefinedGlobals.join(", ") : r.error}`,
        )
    : [];
// The Wizard may write a path slightly differently (".lua", arrows, other case, only the file name). Match it to a real file.
function resolvePath(g, raw) {
  const clean = String(raw || "")
    .replace(/[`*]/g, "")
    .replace(/\s*(→|->|>)\s*/g, "/")
    .replace(/\.lua$/i, "")
    .trim();
  if (!clean) return null;
  if (g.files[clean]) return clean;
  const keys = Object.keys(g.files),
    low = clean.toLowerCase();
  let k = keys.find((x) => x.toLowerCase() === low);
  if (k) return k;
  const base = low.split("/").pop();
  k = keys.find((x) => x.toLowerCase().split("/").pop() === base);
  return k || null;
}
// ---------- deterministic checks: no AI opinions, no scores ----------
// These look only at the files that actually exist. Nothing here guesses how fun the game is,
// because nothing has been played yet.
const PATH_OK = /^(ServerScriptService|StarterPlayerScripts|StarterGui|ReplicatedStorage)(\/[A-Za-z0-9_]+)+$/;
const stripComments = (c) => c.replace(/--\[(=*)\[[\s\S]*?\]\1\]/g, "").replace(/--.*$/gm, "");
const isStub = (c) => c.split("\n").filter((l) => l.trim() && !/^\s*--/.test(l)).length < 6;

// Name / type / location problems in one file. sev "bad" blocks approval, "warn" is advice.
function fileIssues(g, p) {
  const c = g.files[p] || "",
    code = stripComments(c),
    k = kind(p),
    out = [];
  const add = (sev, text) => out.push({ file: p, sev, text });
  if (!PATH_OK.test(p))
    add(
      "bad",
      "location is not under ServerScriptService, StarterPlayerScripts, StarterGui or ReplicatedStorage",
    );
  if (/```/.test(c)) add("bad", "contains markdown code fences, which are not Lua");
  if (k === "LocalScript" && /\b(ServerStorage|ServerScriptService|DataStoreService)\b/.test(code))
    add("bad", "LocalScript uses a server-only service, which errors on the client");
  if (k === "LocalScript" && /Instance\.new\(\s*["']RemoteEvent["']/.test(code))
    add("bad", "LocalScript creates a RemoteEvent; only a server Script should create them");
  if (k === "Script" && /\bLocalPlayer\b|UserInputService/.test(code))
    add("warn", "server Script uses client-only APIs (LocalPlayer / UserInputService)");
  if (k === "ModuleScript" && !/\breturn\b/.test(code)) add("bad", "ModuleScript never returns a value");
  return out;
}

function nextSteps(g, bad, warn) {
  const n = Object.keys(g.files).length,
    s = [];
  if (bad)
    s.push(
      `Fix the ${bad} blocking problem(s) listed above first. Use the button below, or fix them by hand.`,
    );
  s.push("Open Roblox Studio and start a new Baseplate place.");
  s.push(
    `Create the ${n} scripts exactly as listed in the Files tab (same type, same location, same name), then paste each script's code in.`,
  );
  s.push(
    "Press Play (F5) and keep the Output window open. Red text is an error: copy it into the Helper bot.",
  );
  s.push("Test with two players: Test tab, Clients and Servers, Start with 2 players.");
  ((g.ideaNow && g.ideaNow.levels) || []).forEach((l, i) =>
    s.push(
      `Playtest level ${i + 1} ("${l.slice(0, 80)}"): confirm it starts, the timer and score update, and it ends correctly.`,
    ),
  );
  if (g.contract)
    s.push("Tune the shared numbers in the CONTRACT (speeds, health, round length) until it feels right.");
  if (warn)
    s.push("Review the warnings above. Replace wait/spawn/delay with task.wait/task.spawn/task.delay.");
  s.push("Publish a private test place and have a friend play it before you share it widely.");
  return s;
}

function runChecks(g) {
  const items = [],
    issues = [],
    files = Object.keys(g.files);

  // 1) FileCheck: is any required file missing or just an empty stub?
  const missing = REQUIRED_FILES.filter((f) => !g.files[f[0]] || isStub(g.files[f[0]]));
  missing.forEach((f) =>
    issues.push({
      file: f[0],
      sev: "bad",
      kind: "missing",
      text: g.files[f[0]] ? "file is almost empty" : "file is missing",
    }),
  );
  items.push({
    bot: "FileCheck",
    tone: missing.length ? "bad" : "ok",
    head: missing.length
      ? `${missing.length} of ${REQUIRED_FILES.length} required file(s) missing or empty: ${missing.map((f) => f[0].split("/").pop()).join(", ")}`
      : `All ${REQUIRED_FILES.length} required files are present`,
    more: REQUIRED_FILES.map(
      (f) => `${missing.includes(f) ? "MISSING " : "present "} ${studioPath(f[0])} (${kind(f[0])}): ${f[1]}`,
    ).join("\n"),
  });

  // 2) FormatCheck: valid name, type and Studio location, and the right kind of code for that type.
  const fmt = [];
  files.forEach((p) =>
    fileIssues(g, p).forEach((i) => {
      issues.push(i);
      fmt.push(i);
    }),
  );
  items.push({
    bot: "FormatCheck",
    tone: fmt.some((i) => i.sev === "bad") ? "bad" : fmt.length ? "warn" : "ok",
    head: fmt.length
      ? `${fmt.length} name / type / location problem(s)`
      : `All ${files.length} files have a valid name, type and Studio location`,
    more: fmt.map((i) => `${studioPath(i.file)}: ${i.text}`).join("\n"),
  });

  // 3) ParseCheck: the Luau parser (syntax) and the undeclared-variable check, both run on the server.
  if (!g.parser) {
    items.push({
      bot: "ParseCheck",
      tone: "warn",
      head: "The syntax checker did not respond, so syntax was NOT verified",
      more: "",
    });
  } else {
    const prs = Object.values(g.parser);
    prs.forEach((r) => {
      if (!r.syntaxOk)
        issues.push({ file: r.name, sev: "bad", kind: "parse", text: "does not parse: " + r.error });
      else if ((r.undefinedGlobals || []).length)
        issues.push({
          file: r.name,
          sev: "bad",
          kind: "parse",
          text: "uses undeclared variable(s): " + r.undefinedGlobals.join(", "),
        });
      (r.warnings || [])
        .filter((w) => !/undefined variable/.test(w))
        .forEach((w) => issues.push({ file: r.name, sev: "warn", kind: "api", text: w }));
    });
    const badP = prs.filter((r) => !r.syntaxOk || (r.undefinedGlobals || []).length).length;
    const skipped = prs.filter((r) => (r.notes || []).length).length;
    items.push({
      bot: "ParseCheck",
      tone: badP ? "bad" : "ok",
      head:
        `${prs.length - badP} of ${prs.length} files parse cleanly (${(prs[0] && prs[0].engine) || "unknown"} parser)` +
        (skipped
          ? `; ${skipped} file(s) use Luau-only syntax so the undeclared-variable check was skipped`
          : ""),
      more: prs
        .map(
          (r) =>
            `${r.name}: ${r.syntaxOk ? "parses" : r.error}${(r.notes || []).length ? " | " + r.notes.join(" ") : ""}`,
        )
        .join("\n"),
    });
  }

  // 4) ContractCheck: do the RemoteEvent names the contract promised actually appear, and is every looked-up name created somewhere?
  const all = files.map((p) => stripComments(g.files[p])).join("\n");
  const STOP =
    /^(RemoteEvents?|RemoteFunctions?|Server|Client|server|client|event|events|from|args|arguments|and|the)$/i;
  const cNames = [
    ...new Set(
      (g.contract || "")
        .split("\n")
        .filter((l) => /->/.test(l))
        .map((l) => (l.match(/[A-Za-z_][A-Za-z0-9_]{2,}/g) || []).find((w) => !STOP.test(w)))
        .filter(Boolean),
    ),
  ];
  const unused = cNames.filter((n) => !new RegExp("[\"']" + n + "[\"']").test(all));
  const made = new Set(cNames);
  [
    /\.Name\s*=\s*["']([A-Za-z0-9_]+)["']/g,
    /(?:[Gg]etOrCreate|[Cc]reate|[Mm]ake|[Gg]et)\w*Remote\w*\(\s*["']([A-Za-z0-9_]+)["']/g,
  ].forEach((re) => {
    let m;
    while ((m = re.exec(all))) made.add(m[1]);
  });
  const looked = new Set();
  const reU =
    /(?:ReplicatedStorage|[Rr]emotes?\w*|[Ee]vents?\w*)\s*[:.]\s*(?:WaitForChild|FindFirstChild)\(\s*["']([A-Za-z0-9_]+)["']/g;
  let mm;
  while ((mm = reU.exec(all))) looked.add(mm[1]);
  const orphan = [...looked].filter((n) => !made.has(n));
  unused.forEach((n) =>
    issues.push({
      file: "(contract)",
      sev: "warn",
      kind: "contract",
      text: `the contract names "${n}" but no script uses it`,
    }),
  );
  orphan.forEach((n) =>
    issues.push({
      file: "(all scripts)",
      sev: "warn",
      kind: "contract",
      text: `"${n}" is looked up but no script creates it (check the spelling by hand)`,
    }),
  );
  items.push({
    bot: "ContractCheck",
    tone: !cNames.length ? "info" : unused.length || orphan.length ? "warn" : "ok",
    head: !cNames.length
      ? "The contract lists no RemoteEvents, so there was nothing to cross-check"
      : unused.length || orphan.length
        ? `${unused.length + orphan.length} shared-name mismatch(es) between the contract and the scripts`
        : `All ${cNames.length} contract name(s) are used, and every looked-up name is created`,
    more: [...unused.map((n) => "Unused: " + n), ...orphan.map((n) => "Never created: " + n)].join("\n"),
  });

  const bad = issues.filter((i) => i.sev === "bad").length,
    warn = issues.filter((i) => i.sev === "warn").length;
  const next = nextSteps(g, bad, warn);
  items.push({
    bot: "NextSteps",
    tone: "info",
    head: `${next.length} tentative steps for you, listed below`,
    more: "",
  });
  return { items, issues, bad, warn, missing: missing.map((f) => f[0]), next };
}
function applyChecks(g) {
  const c = g.chk;
  c.items.forEach((x) => {
    bset(g, "test", x.bot, x.head, x.tone, x.more);
    bs(g, "test", x.bot, "done");
  });
  g.v.test = {
    good: c.items.filter((x) => x.tone === "ok").map((x) => x.head),
    risks: c.issues
      .slice(0, 6)
      .map((i) => `${i.sev === "bad" ? "Blocking" : "Warning"}: ${studioPath(i.file)}: ${i.text}`),
    rec: c.bad ? "FIX" : "APPROVE",
  };
}
const snap = (g) => ({
  files: clone(g.files),
  parser: g.parser ? clone(g.parser) : null,
  fixed: { ...g.fixed },
  chk: clone(g.chk),
  bad: g.chk.bad,
  warn: g.chk.warn,
});
async function s6(g) {
  setS(g, "test", "run");
  S("test").bots.forEach((b) => bs(g, "test", b[0], "work"));
  g.chk = runChecks(g);
  applyChecks(g);
  g.best = snap(g);
  g.st.test = "wait";
  g.st.ship = "wait";
  render();
}
// Optional and kept clearly apart from the checks: one AI opinion about playtest risks. Not a score, not a test.
async function aiOpinion() {
  const g = CUR;
  if (!g || g.running) return;
  g.running = true;
  g.err = "";
  g.stopped = false;
  render();
  try {
    const sample = Object.entries(g.files)
      .map(([p, c]) => `--${p}\n${c.slice(0, 1800)}`)
      .join("\n---\n")
      .slice(0, 9000);
    g.opinion = (
      await ai(
        "You are a Roblox developer reading generated scripts that have NOT been run. List the 3 most likely problems a player would hit when playtesting, one line each starting with '- '. Be specific to this code. Do not give a score and do not claim that anything works.",
        sample,
        300,
        g,
      )
    ).trim();
  } catch (e) {
    fail(g, e);
  }
  g.running = false;
  render();
}

async function fixOnce(g) {
  g.round++;
  const before = g.chk;
  g.open.fix = true;
  g.st.fix = "run";
  ["Planner", "Coders", "Checker"].forEach((n) => (g.bot["fix:" + n] = "idle"));
  g.bot["fix:Planner"] = "work";
  render();

  // Planner (no AI): every blocking problem becomes a job. Missing files are created, broken files are rewritten.
  const byFile = {};
  before.issues
    .filter((i) => i.sev === "bad" && g.files[i.file] !== undefined)
    .forEach((i) => (byFile[i.file] = byFile[i.file] || []).push(i));
  before.missing.forEach((p) => (byFile[p] = byFile[p] || [{ kind: "missing", text: "file is missing" }]));
  const jobs = Object.entries(byFile)
    .map(([file, list]) => {
      const req = REQUIRED_FILES.find((f) => f[0] === file);
      return {
        file,
        create: !!req && list.some((i) => i.kind === "missing"),
        job: req ? req[1] : "",
        text: list.map((i) => i.text).join("; "),
      };
    })
    .sort((a, b) => b.create - a.create)
    .slice(0, 4);
  if (!jobs.length)
    throw new Error("No file could be matched to the blocking problems. Fix them by hand (see Next steps).");
  const names = jobs.map((j) => j.file.split("/").pop()).join(", ");
  bv(
    g,
    "fix",
    "Planner",
    `Round ${g.round}: ${before.bad} blocking problem(s), ${jobs.length} job(s): ${names}`,
    "info",
    jobs.map((j) => `${j.create ? "CREATE" : "FIX"} ${studioPath(j.file)}\n   because: ${j.text}`).join("\n"),
  );
  g.out.fix =
    "Round " +
    g.round +
    ":\n" +
    jobs.map((j) => `${j.create ? "Create" : "Fix"} ${studioPath(j.file)}: ${j.text}`).join("\n");
  g.bot["fix:Planner"] = "done";
  g.bot["fix:Coders"] = "work";
  render();

  await Promise.all(
    jobs.map(async (j) => {
      if (j.create) return writeFile(g, [j.file, j.job]);
      const c = await ai(
        "Expert Roblox Lua scripter. Apply the requested fix to this script and keep everything else working. Plain Lua only. Output ONLY the COMPLETE corrected file from the first line to the last line. Never output a partial patch, never write 'rest unchanged', and finish every table, function and if-block.",
        `Problems found by the checker: ${j.text}\n${g.lastFail || ""}\n\nCONTRACT:\n${g.contract || "(none)"}\n\nOther files: ${Object.keys(g.files).join(", ")}\n\nScript ${j.file}:\n${g.files[j.file]}`,
        4000,
        g,
      );
      g.files[j.file] = code0(c);
    }),
  );
  g.bot["fix:Coders"] = "done";
  g.bot["fix:Checker"] = "work";
  await checkFiles(g);
  const after = runChecks(g);
  // Keep the new version only if it has fewer blocking problems, or the same number and fewer warnings.
  const kept = after.bad < before.bad || (after.bad === before.bad && after.warn < before.warn);
  g.rounds.push({
    n: g.round,
    before: { bad: before.bad, warn: before.warn },
    after: { bad: after.bad, warn: after.warn },
    kept,
    jobs: jobs.map((j) => ({ file: j.file, create: j.create })),
  });
  if (kept) {
    g.chk = after;
    g.best = snap(g);
    g.lastFail = "";
    jobs.forEach((j) => (g.rewrote[j.file] = (g.rewrote[j.file] || []).concat(g.round)));
  } else {
    g.files = clone(g.best.files);
    g.parser = g.best.parser ? clone(g.best.parser) : null;
    g.fixed = { ...g.best.fixed };
    g.chk = clone(g.best.chk);
    g.lastFail = `The last attempt had ${after.bad} blocking problem(s) and ${after.warn} warning(s), which was not better than the saved version (${before.bad} and ${before.warn}), so it was reverted. Try a different approach.`;
  }
  g.bot["fix:Checker"] = "done";
  bv(
    g,
    "fix",
    "Coders",
    `Round ${g.round}: ${jobs.some((j) => j.create) ? "created/rewrote" : "rewrote"} ${names}; ${kept ? "kept the new versions" : "reverted, they were not better"}`,
    kept ? "ok" : "warn",
    "",
  );
  bv(
    g,
    "fix",
    "Checker",
    `Round ${g.round}: blocking problems ${before.bad} \u2192 ${after.bad}, warnings ${before.warn} \u2192 ${after.warn} (${kept ? "kept" : "reverted"})`,
    kept ? "ok" : "warn",
    "",
  );
  codeVerdicts(g);
  applyChecks(g);
  g.st.fix = "done";
  render();
}
async function improve(g) {
  g.running = true;
  g.err = "";
  g.stopped = false;
  g.note = "";
  render();
  try {
    while (g.chk.bad > 0 && g.round < MAXR && !g.stopped) await fixOnce(g);
    g.note =
      g.chk.bad === 0
        ? `All blocking problems are fixed${g.chk.warn ? `; ${g.chk.warn} warning(s) remain (advice only)` : ""}.`
        : `Stopped after ${g.round} fix round(s) with ${g.chk.bad} blocking problem(s) left. Click Fix again, or fix them by hand in Studio (see Next steps).`;
  } catch (e) {
    fail(g, e);
  }
  g.running = false;
  render();
}

function keepImproving() {
  const g = CUR;
  g.round = Math.max(0, g.round - 2);
  improve(g);
}
function ship() {
  const g = CUR;
  g.stopped = true;
  g.shipped = true;
  g.st.test = "done";
  g.st.ship = "done";
  g.tab = "files";
  render();
}
async function pro() {
  const g = CUR;
  g.bot["ship:ProBot"] = "work";
  render();
  try {
    const t = await ai(
      "You are ProBot. Suggest 6 concrete add-ons that would make this Roblox game better. One per line, format: TITLE | impact (High/Med/Low) | effort (Easy/Med/Hard) | one sentence.",
      `Game: ${g.plan.slice(0, 700)}\nFiles: ${Object.keys(g.files).join(", ")}`,
      500,
    );
    g.up = t
      .split("\n")
      .filter((l) => l.split("|").length >= 4)
      .slice(0, 6)
      .map((l) => l.split("|").map((x) => x.replace(/^[\s\d.*-]+/, "").trim()));
    bset(
      g,
      "ship",
      "ProBot",
      g.up.length
        ? `Suggested ${g.up.length} add-on(s); top pick: ${g.up[0][0]}`
        : "No usable add-on list came back. Run ProBot again",
      g.up.length ? "ok" : "warn",
      "",
    );
    g.bot["ship:ProBot"] = "done";
  } catch (e) {
    g.err = e.message;
    bset(g, "ship", "ProBot", "Could not run: " + String(e.message).slice(0, 120), "bad", "");
    g.bot["ship:ProBot"] = "err";
  }
  render();
}

async function helper(text) {
  text = (text || "").trim();
  const g = CUR;
  if (!g || !g.plan || !Object.keys(g.files).length || !text) {
    HP.msg = "Wait until the game has files, then describe the missing file.";
    return render();
  }
  HP.st.forEach((s) => (s[1] = "idle"));
  HP.msg = "";
  render();
  $("hb").disabled = true;
  const step = (i, v) => {
    HP.st[i][1] = v;
    render();
  };
  const ctx = `Game: ${g.plan.slice(0, 500)}\nExisting files: ${Object.keys(g.files).join(", ")}`;
  try {
    step(0, "run");
    const w = await ai(
      "You are the Wizard. Decide the single file to add. PATH must start with ServerScriptService/, StarterPlayerScripts/, StarterGui/ or ReplicatedStorage/ (files in ReplicatedStorage are ModuleScripts that return a table). Reply exactly:\nPATH: ServiceName/FileName\nPURPOSE: one sentence",
      ctx + "\nRequest: " + text,
      150,
    );
    const path = ((/PATH:\s*([^\n]+)/i.exec(w) || [])[1] || "ServerScriptService/NewScript")
      .replace(/\.lua$/i, "")
      .replace(/[`*]/g, "")
      .trim();
    step(0, "done");
    if (g.files[path]) {
      HP.st[0][1] = "err";
      HP.msg =
        path +
        " already exists in this game. The Helper only adds NEW files. Describe a different file, or edit that one in Studio.";
      $("hb").disabled = false;
      return render();
    }
    step(1, "run");
    const d = await ai(
      "You are the Designer. List the objects, RemoteEvents, services and exact names this script needs. Short.",
      ctx + "\nFile: " + path + "\n" + w,
      300,
    );
    step(1, "done");
    step(2, "run");
    let c = code0(
      await ai(
        `Expert Roblox Lua scripter. Write a COMPLETE RUNNABLE script. Plain Lua only: no type annotations, no continue. Location: ${path}. Every variable must be declared and spelled consistently. Write the whole file and finish every 'end'. Output ONLY Lua code.`,
        ctx +
          "\nCONTRACT (use these exact names):\n" +
          (g.contract || "(none)") +
          "\n" +
          w +
          "\nDesign:\n" +
          d,
        3500,
      ),
    );
    step(2, "done");
    step(3, "run");
    const r = await validate([{ name: path, source: c }]);
    if (r && r[0] && !r[0].syntaxOk) {
      c = code0(
        await ai(
          "Fix the syntax error. Plain Lua only. Output ONLY the complete corrected file.",
          "Error: " + r[0].error + "\n\n" + c,
          3500,
        ),
      );
      g.fixed[path] = true;
    }
    step(3, "done");
    step(4, "run");
    step(4, "done");
    g.files[path] = c;
    const v = await validate([{ name: path, source: c }]);
    if (v && v[0]) {
      g.parser = g.parser || {};
      g.parser[path] = v[0];
    }
    const found = [
      ...fileIssues(g, path),
      ...(v && v[0] && !v[0].syntaxOk ? [{ sev: "bad", text: "does not parse: " + v[0].error }] : []),
    ];
    HP.msg = `Added ${path}. Checker: ${
      found.length
        ? found
            .map((i) => i.text)
            .join("; ")
            .slice(0, 200)
        : "name, type, location and syntax all look fine"
    }`;
    g.tab = "files";
    $("hin").value = "";
  } catch (e) {
    const i = HP.st.findIndex((s) => s[1] === "run");
    if (i >= 0) HP.st[i][1] = "err";
    HP.msg = e.message;
  }
  $("hb").disabled = false;
  render();
}

const cols = (t, a) =>
  `<div class="vd APPROVE" style="border-left-color:${t}"><div class="c">${a.map((x) => `<div><h5>${x[0]}</h5><${x[2] || "ul"}>${x[1].map((y) => `<li>${esc(y)}</li>`).join("") || "<li>-</li>"}</${x[2] || "ul"}></div>`).join("")}</div></div>`;
const ul = (a) => `<ul>${a.map((y) => `<li>${esc(y)}</li>`).join("") || "<li>-</li>"}</ul>`;
const walkBox = (title, text, which) =>
  text
    ? `<div class="walk"><div class="lbl" style="margin-top:0">${title} \u00b7 ${words(text)} words</div>${text
        .split(/\n+/)
        .filter(Boolean)
        .map((p) => `<p>${esc(p)}</p>`)
        .join(
          "",
        )}<div class="act"><button class="btn ol sm" ${CUR && CUR.running ? "disabled" : ""} onclick="redoWalk(${which})">Rewrite walkthrough</button></div></div>`
    : "";
const ideaBox = (h, o, cls) =>
  `<div class="cb ${cls || ""}"><h5>${h}</h5><b>${esc(o.title)}</b><p>${esc(o.text)}</p><h5>Levels</h5><ol>${o.levels.map((l) => `<li>${esc(l)}</li>`).join("") || "<li>-</li>"}</ol></div>`;
const compare = (label, before, after, changes) =>
  `<div class="lbl">${label}</div><div class="cmpg">${ideaBox("Before", before)}${ideaBox("New idea", after, "new")}</div>${
    JSON.stringify(before.levels) === JSON.stringify(after.levels)
      ? '<div class="mut" style="margin-top:4px">Levels were not changed.</div>'
      : ""
  }<div class="vd APPROVE" style="border-left-color:#e6b422"><div class="c"><div><h5>What changed</h5>${ul(changes)}</div></div></div>`;
// One verdict line (plus an optional "full finding" panel) for each time a bot ran.
function botVerdicts(g, sid, bot) {
  const k = sid + ":" + bot;
  return (g.vb[k] || [])
    .map((v, j) => {
      const id = (k + ":" + j).replace(/\W/g, "_");
      const more = v.more
        ? `<details ${g.dopen[id] ? "open" : ""} ontoggle="CUR.dopen['${id}']=this.open"><summary>Full finding</summary><pre class="out">${esc(v.more)}</pre></details>`
        : "";
      return `<div class="bv ${v.tone}"><span class="bvl">Verdict</span>${esc(v.head)}${more}</div>`;
    })
    .join("");
}
function verdictsTab(g) {
  const rows = ST.map((s) => {
    const items = s.bots
      .map((x) => ({ n: x[0], v: g.vb[s.id + ":" + x[0]] || [] }))
      .filter((x) => x.v.length);
    if (!items.length) return "";
    return `<div class="lbl">${esc(s.t)}</div>${items.map((x) => x.v.map((v) => `<div class="bv ${v.tone}"><b>${esc(x.n)}</b> ${esc(v.head)}</div>`).join("")).join("")}`;
  }).join("");
  return (
    rows ||
    `<div class="mut">Each bot's verdict shows up here as soon as it finishes. They also appear on the bot's card in the Pipeline tab.</div>`
  );
}
function filesTab(g) {
  const entries = Object.entries(g.files).map(([p, c], i) => ({ p, c, i, k: kind(p) }));
  if (!entries.length) return `<div class="mut">No files yet.</div>`;
  const status = (p) => {
    const r = g.parser && g.parser[p];
    if (!r) return "";
    if (!r.syntaxOk) return `<span class="chip bad">${esc(r.error)}</span>`;
    return r.warnings && r.warnings.length
      ? `<span class="chip w">${r.warnings.length} warning(s)</span>`
      : '<span class="chip ok">parses</span>';
  };
  const card = (e) =>
    `<div class="file"><div class="crumb">${esc(studioPath(e.p))} <em>\u2192</em> <span class="chip">${e.k}</span>${status(e.p)}${g.fixed[e.p] ? '<span class="chip w">auto-fixed</span>' : ""}</div><pre class="code">${esc(e.c)}</pre><div class="row" style="margin-top:6px"><button class="btn ol sm" onclick="cp(${e.i},this)">Copy code</button><button class="btn ol sm" onclick="dlOne(${e.i})">Download ${esc(e.p.split("/").pop() + fileExt(e.p))}</button><span class="mut">${e.c.split("\n").length} lines</span></div></div>`;
  const table = `<div class="lbl">All files at a glance</div><table class="cmp"><tr><th>#</th><th>Type</th><th>Where it goes in Studio</th><th>Lines</th><th>Check</th></tr>${entries.map((e, n) => `<tr><td>${n + 1}</td><td>${e.k}</td><td class="mono">${esc(studioPath(e.p))}</td><td>${e.c.split("\n").length}</td><td>${status(e.p)}</td></tr>`).join("")}</table>`;
  const groups = FILE_TYPES.map(([k, title, how]) => {
    const list = entries.filter((e) => e.k === k);
    return list.length
      ? `<div class="lbl" style="margin-top:1.1rem">${title} (${list.length})</div><div class="mut" style="margin-bottom:6px">${how}</div>${list.map(card).join("")}`
      : "";
  }).join("");
  return (
    table +
    groups +
    `<div class="row"><button class="btn ol" onclick="cpAll()">Copy all code</button><button class="btn ol" onclick="dl()">Download all (.txt)</button><button class="btn ol" onclick="dlReport()">Download run report (.json)</button></div><div class="card" style="margin-top:.9rem"><div class="lbl" style="margin-top:0">Put it in Studio</div><div class="mut">In the Explorer, create each script of the type shown, at the location shown, and paste the code in. Press Play and watch the Output window. If something breaks, ask the Helper or fix it by hand.</div></div>`
  );
}
const vd = (v) =>
  `<div class="vd ${v.rec}"><div class="h">Verdict: ${v.rec === "APPROVE" ? "APPROVE" : "FIX BEFORE APPROVING"}</div><div class="c"><div><h5>What is good</h5><ul>${v.good.map((x) => `<li>${esc(x)}</li>`).join("") || "<li>-</li>"}</ul></div><div><h5>Watch out</h5><ul>${v.risks.map((x) => `<li>${esc(x)}</li>`).join("") || "<li>nothing major</li>"}</ul></div></div></div>`;
const rtab = (r) =>
  `<div class="lbl">Round ${r.n}: blocking problems ${r.before.bad} \u2192 ${r.after.bad}, warnings ${r.before.warn} \u2192 ${r.after.warn} (${r.kept ? "kept" : "reverted to the better version"})</div>${ul(r.jobs.map((j) => `${j.create ? "Created" : "Rewrote"} ${studioPath(j.file)}`))}`;
function stg(g, s) {
  const st = g.st[s.id] || "idle";
  if (s.id === "fix" && !g.st.fix) return "";
  const op = g.open[s.id] !== undefined ? g.open[s.id] : st === "run" || st === "wait",
    lab = { idle: "Waiting", run: "Working", wait: "Needs you", done: "Done", err: "Error" }[st];
  let b = `<p class="role">${esc(s.role)}</p><div class="bots">${s.bots
    .map((x) => {
      const k = g.bot[s.id + ":" + x[0]] || "idle";
      return `<div class="bc ${k}"><i></i><b>${x[0]}</b><span>${esc(x[1])}</span>${botVerdicts(g, s.id, x[0])}</div>`;
    })
    .join("")}</div>`;
  if (s.id === "idea" && g.ideas.length) {
    b += `<div class="lbl">${st === "wait" ? "Choose one idea" : "Ideas"}</div><div class="ideas">${g.ideas.map((x, i) => `<div class="idc ${g.sel === i ? "sel" : ""}"><b>${esc(x.title)}</b><p>${esc(x.text)}</p><button class="btn sm ${g.sel === i ? "gr" : ""}" ${g.running ? "disabled" : ""} onclick="pick(${i})">${g.sel === i ? "Chosen" : "Choose this idea"}</button></div>`).join("")}</div>`;
    b +=
      st === "wait"
        ? `<div class="lbl">Your own questions for the Betterment bot (optional, one per line)</div><textarea class="myq" oninput="CUR.myq=this.value" placeholder="e.g. Will it work on mobile? How long is a round?">${esc(g.myq)}</textarea>`
        : g.myq.trim()
          ? `<div class="lbl">Your questions</div><pre class="out">${esc(g.myq)}</pre>`
          : "";
  }
  if (s.id === "level" && g.level) {
    const i0 = g.idea0 || g.ideas[g.sel];
    b +=
      `<div class="vd APPROVE" style="border-left-color:#6a8f00"><div class="h">Proposed idea: ${esc(i0.title)}</div><div class="mut" style="color:var(--t2)">${esc(i0.text)}</div></div>` +
      cols("#6a8f00", [
        ["Proposed levels", i0.levels, "ol"],
        ["Why players come back", g.level.hooks],
      ]) +
      (g.level.why
        ? `<div class="mut" style="margin-top:6px">Strongest hook: ${esc(g.level.why)}</div>`
        : "") +
      walkBox("How the game will look and play (first preview, before questions)", g.walk0, 0);
  }
  if (s.id === "ask" && g.qs.length)
    b +=
      (g.pros.length
        ? cols("#d33", [
            ["Pros", g.pros],
            ["Cons", g.cons],
          ])
        : "") +
      `<div class="lbl">Questions asked (${g.qs.length})</div>` +
      g.qs
        .map(
          (x) =>
            `<div class="qa"><b>${x.mine ? '<span class="chip w">your question</span> ' : ""}<span class="chip">round ${x.r}</span> ${esc(x.q)}</b></div>`,
        )
        .join("");
  if (s.id === "better" && g.qa.length) {
    const n = g.qa.filter((x) => !x.a.startsWith("(no answer")).length;
    b +=
      `<div class="lbl">Answers (${n} of ${g.qa.length} answered)</div>` +
      g.qa
        .map(
          (x) =>
            `<div class="qa"><b>${x.mine ? '<span class="chip w">your question</span> ' : ""}${esc(x.q)}</b><span>${esc(x.a)}</span></div>`,
        )
        .join("");
    g.bRounds.forEach((r) => {
      b += compare(
        `Round ${r.r}: before idea vs new idea`,
        r.before,
        r.after,
        r.changes.length ? r.changes : ["The bot did not list its changes"],
      );
    });
    if (g.bRounds.length > 1)
      b += compare("Overall: the idea you chose vs the final idea", g.idea0, g.ideaNow, g.changes);
    b += walkBox("How the final game will look and play (after improvements)", g.walk1, 1);
  }
  if (s.id === "design") {
    if (g.imgState === "load")
      b += `<div class="lbl">Top-down layout</div><div class="mut">Drawing the layout from the MapBot's numbers...</div>`;
    else if (g.imgState === "ok" && g.layout) {
      b += `<div class="lbl">Top-down layout (drawn by code from the MapBot spec, not an AI picture)</div><img class="sketch" alt="Top-down layout of the arena" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(g.svg)}">`;
      b += `<table class="cmp"><tr><th>#</th><th>Zone</th><th>Kind</th><th>Centre x, z</th><th>Size w x d</th></tr>${g.layout.zones.map((z, i) => `<tr><td>${i + 1}</td><td>${esc(z.name)}</td><td>${ZONE_KINDS[z.kind][1]}</td><td>${z.x}, ${z.z}</td><td>${z.w} x ${z.d}</td></tr>`).join("")}</table>`;
    } else if (g.imgState === "fail")
      b += `<div class="lbl">Top-down layout</div><div class="mut">The layout could not be read from the model's answer. Click Redo layout.</div>`;
    if (g.imgState && g.imgState !== "load")
      b += `<div class="act"><button class="btn ol sm" onclick="startLayout(CUR)">Redo layout</button><button class="btn ol sm" ${g.artState === "load" ? "disabled" : ""} onclick="conceptArt(CUR)">Generate AI concept art (experimental)</button></div>`;
    if (g.artState === "load")
      b += `<div class="mut">Generating concept art, this can take up to a minute...</div>`;
    if (g.artState === "ok")
      b += `<div class="lbl">AI concept art (mood only. It does NOT match the scripts or the numbers)</div><img class="sketch" alt="AI concept art" src="${esc(g.artSrc)}">`;
    if (g.artState === "fail")
      b += `<div class="mut">The free image service did not respond. The layout above is unaffected.</div>`;
  }
  if (g.out[s.id] && s.id !== "better")
    b += `<div class="lbl">Output</div><pre class="out">${esc(g.out[s.id])}</pre>`;
  if (s.id === "test" && g.chk) {
    const c = g.chk;
    b += `<div class="lbl">Checks on the files you actually have (no AI scores)</div><table class="cmp"><tr><th></th><th>Check</th><th>Result</th></tr>${c.items.map((x) => `<tr><td><span class="dot ${x.tone}"></span></td><td>${esc(x.bot)}</td><td>${esc(x.head)}</td></tr>`).join("")}</table>`;
    b += `<div class="lbl">Required files</div><table class="cmp"><tr><th>File</th><th>Type</th><th>Where it goes in Studio</th><th>Status</th></tr>${REQUIRED_FILES.map((f) => `<tr><td>${esc(f[0].split("/").pop())}</td><td>${kind(f[0])}</td><td class="mono">${esc(studioPath(f[0]))}</td><td>${c.missing.includes(f[0]) ? '<span class="chip bad">missing</span>' : '<span class="chip ok">present</span>'}</td></tr>`).join("")}</table>`;
    if (c.issues.length)
      b += `<div class="lbl">Problems found</div>${ul(c.issues.map((i) => `${i.sev === "bad" ? "Blocking" : "Warning"}: ${studioPath(i.file)}: ${i.text}`))}`;
    b += `<div class="walk"><div class="lbl" style="margin-top:0">Next steps for you (tentative)</div><ol>${c.next.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></div>`;
    b += `<div class="act"><button class="btn ol sm" ${g.running ? "disabled" : ""} onclick="aiOpinion()">Ask AI for playtest risks (an opinion, not a test)</button></div>`;
    if (g.opinion)
      b += `<div class="vd" style="border-left-color:#8b93a7"><div class="h">AI opinion, not a test</div><pre class="out">${esc(g.opinion)}</pre></div>`;
  }
  if (s.id === "fix" && g.rounds.length)
    b +=
      `<div class="mut">${g.rounds.filter((r) => !r.kept).length} of ${g.rounds.length} fix round(s) were reverted because they were not better.</div>` +
      g.rounds.map(rtab).join("");
  if (g.v[s.id]) b += vd(g.v[s.id]);
  if (s.id === "wiz" && st === "wait")
    b += `<div class="act"><button class="btn gr" onclick="approve()">Approve, run the checks</button><button class="btn ol" onclick="jump('idea')">Choose a different idea</button></div>`;
  if (s.id === "test" && g.chk && !g.shipped) {
    b +=
      (g.note ? `<div class="mut" style="margin-top:8px">${esc(g.note)}</div>` : "") +
      `<div class="act">${g.chk.bad > 0 ? `<button class="btn" ${g.running ? "disabled" : ""} onclick="keepImproving()">Fix ${g.chk.bad} blocking problem(s) automatically</button>` : ""}<button class="btn gr" ${g.running ? "disabled" : ""} onclick="ship()">Ship it (stops all bots)</button></div>`;
  }
  if (s.id === "ship" && (st === "wait" || st === "done"))
    b +=
      (g.shipped
        ? `<div class="vd APPROVE"><div class="h">Shipped. Copy the scripts from the Files tab.</div></div>`
        : "") +
      `<div class="act"><button class="btn ol sm" onclick="pro()">${g.up ? "Re-run" : "Run"} ProBot</button></div>` +
      (g.up
        ? `<div class="upg">${g.up.map((u) => `<div><b>${esc(u[0])}</b>${esc(u[1])} impact · ${esc(u[2])} effort<br>${esc(u[3])}</div>`).join("")}</div>`
        : "");
  return `<div class="stg ${st === "err" ? "err" : ""}" id="s-${s.id}"><div class="sh" style="background:${s.bg}" onclick="tg('${s.id}')">${px(s.ic, s.col)}<b>${s.t}</b><span class="bd">${lab}</span><em>${op ? "▲" : "▼"}</em></div><div class="sb ${op ? "o" : ""}">${b}</div></div>`;
}
function view(g) {
  const flow = ST.filter((s) => s.id !== "fix" || g.st.fix)
    .map(
      (s, i, a) =>
        `<div class="fs ${g.st[s.id] || ""}" style="background:${s.bg}" onclick="jump('${s.id}')">${px(s.ic, s.col)}${s.t}</div>${i < a.length - 1 ? '<span class="ar">→</span>' : ""}`,
    )
    .join("");
  const n = Object.keys(g.files).length,
    tabs = [
      ["pipe", "Pipeline"],
      ["files", "Files (" + n + ")"],
      ["anat", "Anatomy"],
      ["verd", "Verdicts"],
    ]
      .map(
        (t) =>
          `<div class="st ${g.tab === t[0] ? "on" : ""}" onclick="CUR.tab='${t[0]}';render()">${t[1]}</div>`,
      )
      .join("");
  let body = "";
  if (g.tab === "pipe") body = ST.map((s) => stg(g, s)).join("");
  else if (g.tab === "files") body = filesTab(g);
  else if (g.tab === "verd") body = verdictsTab(g);
  else
    body = n
      ? anatomy(g)
          .map(
            (a) =>
              `<div class="part"><b>${a.n}</b><span>${a.f.length ? "in " + a.f.map(esc).join(", ") : esc(a.hint)}</span>${a.f.length ? '<span class="chip ok" style="flex:0">found</span>' : `<button class="btn sm" onclick="helper('${a.hint.replace(/'/g, "")}')">Ask Helper</button>`}</div>`,
          )
          .join("") +
        `<div class="mut" style="margin-top:6px">Detection is a keyword scan, not a guarantee.</div>`
      : `<div class="mut">Anatomy appears after the Coders finish.</div>`;
  return (
    (g.err ? `<div class="err">${esc(g.err)}</div>` : "") +
    `<div class="flow">${flow}</div><div class="stabs">${tabs}</div>` +
    body
  );
}
function render() {
  $("gtabs").innerHTML = GAMES.map(
    (g) =>
      `<div class="gt ${g === CUR ? "on" : ""}" onclick="sel(${g.id})">${px("idea", g === CUR ? "#e6b422" : "#6a6a85")}${esc(g.name)}${g.running ? " ..." : ""}</div>`,
  ).join("");
  const ae = document.activeElement,
    keep = ae && ae.classList && ae.classList.contains("myq");
  if (!keep)
    $("gview").innerHTML = CUR
      ? view(CUR)
      : `<div class="mut">Enter a theme above. Each game gets its own tab.</div>`;
  $("hlog").innerHTML =
    HP.st.map((s) => `<div class="step ${s[1]}"><i></i>${s[0]}</div>`).join("") +
    (HP.msg ? `<div class="mut" style="margin-top:6px">${esc(HP.msg)}</div>` : "");
}
const txt = (g) =>
  Object.entries(g.files)
    .map(([p, c]) => `-- ===== ${studioPath(p)} (${kind(p)}) =====\n${c}`)
    .join("\n\n\n");
function flash(btn, msg) {
  if (!btn) return;
  const old = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => (btn.textContent = old), 1300);
}
async function toClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    flash(btn, "Copied \u2713");
  } catch (e) {
    flash(btn, "Copy blocked: select the text instead");
  }
}
function cp(i, btn) {
  const p = Object.keys(CUR.files)[i];
  toClipboard(CUR.files[p], btn);
}
function cpAll() {
  toClipboard(txt(CUR));
}
function save(name, text) {
  const a = document.createElement("a");
  a.href = "data:text/plain;charset=utf-8," + encodeURIComponent(text);
  a.download = name;
  a.click();
}
function dlOne(i) {
  const p = Object.keys(CUR.files)[i];
  save(p.split("/").pop() + fileExt(p), CUR.files[p]);
}
// Everything needed to reproduce and compare a run: the idea, every check result, every fix round and the regression count.
function runReport(g) {
  return {
    tool: "wizgame",
    generatedAt: new Date().toISOString(),
    theme: g.theme,
    chosenIdea: g.idea0,
    finalIdea: g.ideaNow,
    checks: g.chk && {
      blockingProblems: g.chk.bad,
      warnings: g.chk.warn,
      items: g.chk.items.map((x) => ({ bot: x.bot, tone: x.tone, head: x.head })),
      issues: g.chk.issues,
    },
    fixRounds: g.rounds,
    regression: { rounds: g.rounds.length, reverted: g.rounds.filter((r) => !r.kept).length },
    parser: g.parser,
    files: Object.fromEntries(
      Object.entries(g.files).map(([p, c]) => [
        p,
        { type: kind(p), studioLocation: studioPath(p), lines: c.split("\n").length },
      ]),
    ),
  };
}
function dlReport() {
  save(CUR.name.replace(/\W+/g, "_") + "-run-report.json", JSON.stringify(runReport(CUR), null, 2));
}
function dl() {
  save(CUR.name.replace(/\W+/g, "_") + ".txt", txt(CUR));
}

(async () => {
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "Reply READY",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d) {
      $("ail").textContent = "AI offline, check keys";
      $("aid").style.background = "var(--rd)";
    } else $("ail").textContent = "AI ready";
  } catch (e) {
    $("ail").textContent = "Cannot reach server";
    $("aid").style.background = "var(--rd)";
  }
})();
render();
