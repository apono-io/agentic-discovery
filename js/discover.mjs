#!/usr/bin/env node
/*
 * Agentic Access Discovery -- per-machine report (JS runner v0.9)
 *
 * One codebase, two channels:
 *   Node:    node discover.mjs   (or: npx @apono-io/agentic-discovery)
 *   Binary:  deno compile -o agentic-discovery --allow-read --allow-write --allow-env \
 *              --include rules.json discover.mjs      (or: bun build --compile)
 *
 * Lean runner: all host paths, extraction rules, category maps and copy live in rules.json.
 *
 * READ-ONLY, NO NETWORK. The report contains derived identifiers only -- never prompts,
 * content, commands, arguments or files. You review it first; sharing is your choice.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const VERSION = "0.9";
const HOME = os.homedir();
const R = JSON.parse(fs.readFileSync(new URL("./rules.json", import.meta.url), "utf-8"));

// ---------------------------------------------------------------- small fs helpers
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const MAX_READ_BYTES = 256 * 1024 * 1024;   // larger files are skipped, not truncated
const readText = (p) => {
  try {
    if (fs.statSync(p).size > MAX_READ_BYTES) return null;
    return fs.readFileSync(p, "utf-8");
  } catch { return null; }
};
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; } };
const listDir = (p) => { try { return fs.readdirSync(p); } catch { return []; } };
function* walkFiles(dir, suffix, depth = 0) {
  if (depth > 16) return;                      // defense against pathological nesting
  for (const e of listDir(dir)) {
    const p = path.join(dir, e);
    let st; try { st = fs.lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) continue;         // never follow symlinks while walking
    if (st.isDirectory()) yield* walkFiles(p, suffix, depth + 1);
    else if (e.endsWith(suffix)) yield p;
  }
}

// ---------------------------------------------------------------- scan profiles
function isWsl() {
  if (process.platform !== "linux") return false;
  if (process.env.WSL_DISTRO_NAME) return true;
  return (readText("/proc/version") || "").toLowerCase().includes("microsoft");
}
function buildProfiles() {
  const profs = [];
  const mk = (label, home, roaming) => ({ label, home, roaming,
    tag: (s) => (label ? `${s} [${label}]` : s) });
  if (process.platform === "darwin") {
    profs.push(mk("", HOME, path.join(HOME, "Library", "Application Support")));
  } else if (process.platform === "win32") {
    profs.push(mk("", HOME, process.env.APPDATA || path.join(HOME, "AppData", "Roaming")));
  } else {
    profs.push(mk("", HOME, path.join(HOME, ".config")));
    const roots = [];
    if (isWsl())
      for (const drive of listDir("/mnt"))
        for (const u of listDir(path.join("/mnt", drive, "Users")))
          roots.push(path.join("/mnt", drive, "Users", u));
    if (process.env.DISCOVERY_WIN_ROOT) roots.push(process.env.DISCOVERY_WIN_ROOT); // test hook
    for (const base of roots) {
      const name = path.basename(base);
      if (["public", "default", "default user", "all users", "desktop.ini"].includes(name.toLowerCase())) continue;
      const roaming = path.join(base, "AppData", "Roaming");
      if (isDir(roaming)) profs.push(mk(`windows-profile:${name}`, base, roaming));
    }
  }
  return profs;
}
const PROFILES = buildProfiles();
/* Called once the salt is known: a Windows profile name is a username, so redact it too. */
function redactProfileLabels() {
  if (!REDACT) return;
  for (const p of PROFILES) {
    const m = /^windows-profile:(.+)$/.exec(p.label);
    if (!m) continue;
    const h = crypto.createHash("sha256")
      .update(`agentic-discovery/machine\u0000${SALT}\u0000${m[1]}`).digest("hex").slice(0, 8);
    p.label = `Windows profile ${h} (via WSL)`;
  }
}

// ---------------------------------------------------------------- classification
const SQL_CATS = R.sqlCats.map(([c, rx]) => [c, new RegExp(rx, "i")]);
function categorize(toolName, args) {
  if (args && typeof args === "object") {
    if (R.verbOrder.includes(args.intent_category)) return args.intent_category;
    for (const k of R.sqlArgKeys) {
      const v = args[k];
      if (typeof v === "string")
        for (const [cat, rx] of SQL_CATS) if (rx.test(v)) return cat;
    }
  }
  const t = (toolName || "").toLowerCase().replace(/[^a-z]/g, " ");
  const words = t.split(/\s+/).filter(Boolean);
  const joined = t.replace(/ /g, "");
  for (const cat of R.verbOrder) {
    const verbs = R.verbs[cat];
    if (words.some((w) => verbs.includes(w)) || verbs.some((v) => joined.startsWith(v))) return cat;
  }
  return "unknown";
}
function planeOf(toolName, rid, rtype) {
  const parts = `${toolName} ${rid} ${rtype}`.toLowerCase().split(/[^a-z]+/);
  return R.controlHints.some((h) => parts.includes(h)) ? "control" : "data";
}
function cliCat(op, extraWrite = []) {
  op = (op || "").toLowerCase();
  if (extraWrite.includes(op)) return "create";
  for (const [cat, prefixes] of Object.entries(R.cliVerbCats))
    if (prefixes.some((p) => op.startsWith(p))) return cat;
  return "unknown";
}

// ---------------------------------------------------------------- data model
const RES = new Map(), MCP = new Map(), AGENTS = new Map();
const STATS = { external: 0, resolved: 0 };
const UNRESOLVED = new Map();   // label -> count, for --unresolved
const TYPE_GROUP = {};
for (const [g, types] of Object.entries(R.resourceGroups)) for (const t of types) TYPE_GROUP[t] = g;
const resGroup = (t) => TYPE_GROUP[t] || "Other";
const isReported = (t) => R.reportGroups.includes(resGroup(t));

function emit(rtype, rid, agent, via, tool, cat, ts) {
  if (!rid) return null;
  rid = String(rid).slice(0, 80);
  const k = `${rtype} ${rid}`;
  const r = RES.get(k) || { rtype, rid, calls: 0, cats: new Set(), planes: new Set(),
                            agents: new Set(), via: new Set(), first: null, last: null };
  RES.set(k, r);
  r.calls++; r.cats.add(cat); r.agents.add(agent); if (via) r.via.add(via);
  r.planes.add(planeOf(tool, rid, rtype));
  if (ts) { if (!r.first || ts < r.first) r.first = ts; if (!r.last || ts > r.last) r.last = ts; }
  return rtype;
}
/* Count one externally-reaching action, given the resource types it resolved to.
   Actions that resolve ONLY to non-reported groups (web browsing, code hosting)
   are left out of both numerator and denominator so the rate stays meaningful. */
function countAction(types, label) {
  if (types.length && !types.some(isReported)) return;
  STATS.external++;
  if (types.some(isReported)) STATS.resolved++;
  else if (label) UNRESOLVED.set(label, (UNRESOLVED.get(label) || 0) + 1);
}
function mcpRec(agent, server) {
  const k = `${agent} ${server}`;
  const r = MCP.get(k) || { agent, server, configured: false, used: 0, last: null,
                            tools: new Set(), source: new Set() };
  MCP.set(k, r); return r;
}
function agentRec(agent) {
  const a = AGENTS.get(agent) || { installed: false, sessions: 0, actions: 0,
                                   first: null, last: null, gaps: [], evidence: new Set() };
  AGENTS.set(agent, a); return a;
}
const addGap = (agent, gap) => { const a = agentRec(agent); if (!a.gaps.includes(gap)) a.gaps.push(gap); };
function noteTs(agent, ts) {
  const a = agentRec(agent);
  if (ts) { if (!a.first || ts < a.first) a.first = ts; if (!a.last || ts > a.last) a.last = ts; }
}

// ---------------------------------------------------------------- arg extraction
function domainOf(url) {
  const m = /^(?:https?:\/\/)?([\w.-]+\.[a-z]{2,})(?::\d+)?(?:\/|$)/.exec(String(url).trim());
  return m ? m[1].toLowerCase().split("@").pop() : null;
}
function walkObj(d, out) {
  if (Array.isArray(d)) for (const v of d) walkObj(v, out);
  else if (d && typeof d === "object")
    for (const [k, v] of Object.entries(d))
      (v && typeof v === "object") ? walkObj(v, out) : out.push([k, v]);
}
/* Argument keys vary by vendor spelling: pageId / page_id / pageid all mean the same thing. */
const normKey = (k) => String(k).toLowerCase().replace(/[_-]/g, "");
const KEY_RULES = R.keyRules.map((r) => ({ ...r,
                                           fromValue: (r.typeFromValue || []).map((v) => ({ ...v, rx: new RegExp(v.match) })),
                                           normKeys: r.keys.map(normKey),
                                           toolRx: r.whenTool ? new RegExp(r.whenTool) : null,
                                           serverRx: r.whenServer ? new RegExp(r.whenServer) : null,
                                           extractRx: r.valueExtract ? new RegExp(r.valueExtract) : null }));
const SERVICE_RULES = (R.serviceRules || []).map((r) => ({ ...r,
                                           rx: r.toolPattern ? new RegExp(r.toolPattern) : null,
                                           serverRx: r.serverPattern ? new RegExp(r.serverPattern) : null }));
const FINGERPRINTS = (R.connectorFingerprints || []).map((f) => ({ ...f, rx: new RegExp(f.toolPattern) }));
const CONNECTOR_NAMES = new Map();

/* Returns the list of resource types emitted (empty = nothing resolved). */
function extractArgs(args, agent, via, tool, cat, ts, server = "") {
  const flat = []; walkObj(args, flat); const types = [];
  for (const [k, v] of flat) {
    if (v === null || v === undefined || v === "") continue;
    const kl = k.toLowerCase(), vs = String(v);
    if (R.jiraIssueKeys.includes(kl)) {
      const m = /^([A-Z][A-Z0-9]+)-\d+/.exec(vs);
      if (m) { const t = emit("jira-project", m[1], agent, via, tool, cat, ts); if (t) types.push(t); continue; }
    }
    const nk = normKey(kl);
    const rule = KEY_RULES.find((r) => (!r.toolRx || r.toolRx.test(tool))
                                    && (!r.serverRx || r.serverRx.test(server))
                                    && r.normKeys.includes(nk));
    if (rule) {
      let val = vs;
      if (rule.extractRx) {                    // e.g. pull a page id out of a full URL
        const m = rule.extractRx.exec(vs);
        if (!m) continue;
        val = m[1];
      }
      if (rule.stripChars) val = val.split(new RegExp(`[${rule.stripChars}]`, "g")).join("");
      // some identifiers name their own vendor -- "snowflake-snowflake-prod" is a Snowflake resource
      const rtype = (rule.fromValue.find((v) => v.rx.test(val)) || {}).type || rule.type;
      const t = emit(rtype, val, agent, via, tool, cat, ts);
      if (t) types.push(t);
      continue;
    }
    if (R.urlKeys.includes(kl)) {
      const dom = domainOf(vs);
      if (dom) { const t = emit("web-domain", dom, agent, via, tool, cat, ts); if (t) types.push(t); }
    }
  }
  return types;
}

// ---------------------------------------------------------------- shell parsing
/* Remove heredoc bodies: their contents are data (scripts, text), not commands run here. */
function stripHeredocs(cmd) {
  const lines = String(cmd).split(/\n/);
  const out = [];
  let delim = null;
  for (const line of lines) {
    if (delim !== null) {
      if (line.trim() === delim) delim = null;
      continue;
    }
    const m = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(line);
    if (m) { out.push(line.slice(0, m.index)); delim = m[2]; continue; }
    out.push(line);
  }
  return out.join("\n");
}
const NESTED_SHELL_RE = new RegExp(R.shellInterpreterRegex);
/* Split into command segments, honouring quotes: a CLI only counts as invoked when it
   sits at a command position. Recurses into real shell -c bodies (which do execute). */
function commandSegments(cmd, depth = 0) {
  const segs = [];
  let cur = "", q = null, i = 0;
  const push = () => { const s = cur.trim(); if (s) segs.push(s); cur = ""; };
  while (i < cmd.length) {
    const ch = cmd[i];
    if (q) {
      cur += ch;
      if (ch === q && cmd[i - 1] !== "\\") q = null;
      i++; continue;
    }
    if (ch === "'" || ch === '"') { q = ch; cur += ch; i++; continue; }
    if (ch === "$" && cmd[i + 1] === "(") { push(); i += 2; continue; }
    if (ch === "(" || ch === ")" || ch === "`" || ch === "\n") { push(); i++; continue; }
    const two = cmd.slice(i, i + 2);
    if (two === "&&" || two === "||" || two === ";;") { push(); i += 2; continue; }
    if (ch === ";" || ch === "|" || ch === "&") { push(); i++; continue; }
    cur += ch; i++;
  }
  push();
  const out = [];
  for (const s of segs) {
    out.push(s);
    if (depth < R.maxNestedShellDepth) {
      const m = NESTED_SHELL_RE.exec(s);
      if (m) out.push(...commandSegments(m[2], depth + 1));
    }
  }
  return out;
}
/* "CLI: aws", "MCP: server > tool" -- tool type plus the tool itself. */
const viaStr = (type, detail) => `${R.viaLabels[type] || type}: ${detail}`;
const PREFIX_SKIP = new Set(R.commandPrefixSkip);
function firstToken(seg) {
  for (const tok of seg.split(/\s+/)) {
    if (!tok) continue;
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tok)) continue;   // VAR=value prefix
    const base = tok.replace(/^.*\//, "").replace(/^["']/, "");
    if (PREFIX_SKIP.has(base)) continue;
    return base;
  }
  return "";
}
function sqlPayload(seg) {
  const m = /(?:-c|-e|--command|--execute)\s*=?\s*(['"])([\s\S]*?)\1/.exec(seg);
  if (m) return m[2];
  const h = /<<<\s*(['"]?)([\s\S]*?)\1\s*$/.exec(seg);
  return h ? h[2] : null;
}
const SHELL_RULES = R.shellRules.map((r) => ({ ...r, rx: new RegExp(r.regex, "g") }));
function ridFromTemplate(tpl, m) {
  for (const alt of tpl.split("||")) {
    let ok = true;
    const s = alt.replace(/\$(\d+)/g, (_, n) => { const v = m[+n]; if (!v) ok = false; return v || ""; });
    if (ok && s) return s;
  }
  return null;
}
function handleShell(cmd, agent, ts) {
  const types = [];
  for (const seg of commandSegments(stripHeredocs(cmd || ""))) {
    const bin = firstToken(seg);
    if (!bin) continue;
    for (const rule of SHELL_RULES) {
      if (rule.bin !== bin) continue;
      rule.rx.lastIndex = 0;
      for (const m of seg.matchAll(rule.rx)) {
        let rtype, rid, cat;
        if (rule.kind === "cloud") {
          rtype = rule.type; rid = ridFromTemplate(rule.rid, m);
          const verb = (rule.verbGroups || []).map((g) => m[g]).find(Boolean) || rule.verbDefault;
          cat = verb ? cliCat(verb, rule.extraWrite || []) : "unknown";
          if (rule.sqlFromSegment) {
            // classify DB access from the SQL passed in the same command segment
            const sql = sqlPayload(seg);
            if (sql) for (const [c, rx] of SQL_CATS) if (rx.test(sql)) { cat = c; break; }
          }
        } else if (rule.kind === "gitremote") {
          rtype = "git-remote";
          rid = domainOf(m[2].replace("git@", "https://").replace(".com:", ".com/"));
          cat = m[1] === "push" ? "update" : "read";
        } else if (rule.kind === "curl") {
          rtype = "web-domain"; rid = domainOf(m[2]);
          const meth = (/-X\s*(\w+)/i.exec(m[1] || "") || [null, "get"])[1].toLowerCase();
          cat = { post: "create", put: "update", patch: "update", delete: "delete" }[meth] || "read";
        } else continue;
        if (rid) { const t = emit(rtype, rid, agent, viaStr("cli", rule.via), "shell", cat, ts); if (t) types.push(t); }
      }
    }
  }
  if (types.length) countAction(types);
}

// ---------------------------------------------------------------- tool handling
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WRAPPER_RE = new RegExp(R.gatewayWrapperRegex);
function handleTool(agent, name, args, ts) {
  agentRec(agent).actions++; noteTs(agent, ts);
  const lname = (name || "").toLowerCase();
  if (R.shellToolNames.includes(lname) || lname.endsWith("__bash"))
    return handleShell((args && (args.command || args.cmd)) || "", agent, ts);
  if (R.webFetchToolNames.includes(lname)) {
    const dom = domainOf((args && args.url) || "");
    const types = [];
    if (dom) { const t = emit("web-domain", dom, agent, viaStr("builtin", name), name, "read", ts); if (t) types.push(t); }
    countAction(types, `builtin: ${name}`);
    return;
  }
  let server = null, tool = null;
  if (name && name.startsWith("mcp__")) {
    const p = name.split("__"); server = p[1]; tool = p.slice(2).join("__") || "?";
  } else if (name && name.includes(".") && !name.startsWith("_")) {
    const i = name.indexOf("."); server = name.slice(0, i); tool = name.slice(i + 1);
  }
  if (!server) return; // built-in / local tool
  const sl = server.toLowerCase();
  let base = server;
  if (UUID_RE.test(server)) {
    if (!CONNECTOR_NAMES.has(server)) {
      const fp = FINGERPRINTS.find((f) => f.rx.test(tool));
      if (fp) CONNECTOR_NAMES.set(server, `${fp.name} (claude.ai connector)`);
    }
    base = CONNECTOR_NAMES.get(server) || `connector:${server.slice(0, 8)}... (unidentified)`;
  }
  const label = base + (R.infraServers.includes(sl) ? " (session tooling)" : "");
  const rec = mcpRec(agent, label);
  rec.used++; rec.tools.add(tool.slice(0, 40));
  if (ts && (!rec.last || ts > rec.last)) rec.last = ts;
  if (R.infraServers.includes(sl)) {
    if (tool === "bash") handleShell((args && args.command) || "", agent, ts);
    else if (tool === "web_fetch") {
      const dom = domainOf((args && args.url) || "");
      const types = [];
      if (dom) { const t = emit("web-domain", dom, agent, viaStr("builtin", `${server} > ${tool}`), tool, "read", ts); if (t) types.push(t); }
      countAction(types, `${server} > ${tool}`);
    }
    return;
  }
  if (R.browserServers.includes(sl)) {
    const flat = []; walkObj(args || {}, flat); const types = [];
    for (const [k, v] of flat)
      if (k === "url" && domainOf(v)) {
        const t = emit("web-domain", domainOf(v), agent, viaStr("browser", `${server} > ${tool}`), tool, "read", ts);
        if (t) types.push(t);
      }
    countAction(types, `${server} > ${tool}`);
    return;
  }
  const isControl = (t) => R.gatewayControlTools.some((c) => t === c || t.endsWith(c));
  if (R.gatewayAliases.includes(sl) && isControl(tool)) return;
  let cat = categorize(tool, args && typeof args === "object" ? args : {});
  let innerTool = tool;
  if (args && typeof args === "object" && "tool_name" in args) { // gateway-style wrapper
    const m = WRAPPER_RE.exec(String(args.tool_name || ""));
    if (m) {
      innerTool = m[1];
      if (R.gatewayAliases.includes(sl) && isControl(innerTool)) return;   // control plane, wrapped
      let raw = args.arguments;
      if (typeof raw === "string") {
        try { raw = JSON.parse(raw); }
        catch { try { raw = JSON.parse(raw.replace(/'/g, '"')); } catch { /* keep as-is */ } }
      }
      const innerCat = categorize(innerTool, raw && typeof raw === "object" ? raw : {});
      if (innerCat !== "unknown") cat = innerCat;
      if (raw && typeof raw === "object") {
        const types = extractArgs(raw, agent, viaStr("mcp", `${label} > ${innerTool}`).slice(0, 70), innerTool, cat, ts, server);
        if (types.length) { countAction(types, `${label} > ${innerTool}`); return; }
      }
    }
  }
  const via = viaStr("mcp", `${label} > ${innerTool}`).slice(0, 70);
  const types = (args && typeof args === "object")
    ? extractArgs(args, agent, via, innerTool, cat, ts, server)
    : [];
  if (!types.length) {                 // reached a known service, named no specific resource
    const sr = SERVICE_RULES.find((r) => (r.rx && r.rx.test(innerTool))
                                      || (r.serverRx && r.serverRx.test(server)));
    if (sr) { const t = emit(sr.type, sr.rid, agent, via, innerTool, cat, ts); if (t) types.push(t); }
  }
  countAction(types, `${label} > ${innerTool}`);
}

// ---------------------------------------------------------------- host scanning (generic)
/* Adding a platform is normally a rules.json edit: declare its presence checks, MCP config
   files and transcript sources. Code is only needed for a genuinely new log FORMAT, which
   means one new entry in the PARSERS registry below. */

const rootOf = (prof, root) => (root === "roaming" ? prof.roaming : prof.home);
const srcPath = (prof, src) => path.join(rootOf(prof, src.root), ...src.path);
/* Expand a path whose segments may contain "*" into every matching concrete path. */
function expandPath(base, parts) {
  let cur = [base];
  for (const seg of parts) {
    const next = [];
    for (const c of cur) {
      if (seg === "*") for (const e of listDir(c)) next.push(path.join(c, e));
      else next.push(path.join(c, seg));
    }
    cur = next;
  }
  return cur;
}

const PARSERS = {
  /* Claude Code / Claude Desktop agent mode: JSONL, assistant messages with tool_use blocks. */
  claudeStream(file, agent) {
    agentRec(agent).sessions++;
    const txt = readText(file); if (txt === null) return;
    for (const line of txt.split(/\r?\n/)) {
      let d; try { d = JSON.parse(line); } catch { continue; }
      if (!d || d.type !== "assistant" || typeof d.message !== "object" || !d.message) continue;
      for (const c of d.message.content || [])
        if (c && c.type === "tool_use")
          handleTool(agent, c.name || "", c.input || {}, d.timestamp || d._audit_timestamp);
    }
  },
  /* Codex: JSONL rollout files, response_item payloads of type function_call. */
  codexStream(file, agent) {
    agentRec(agent).sessions++;
    const txt = readText(file); if (txt === null) return;
    for (const line of txt.split(/\r?\n/)) {
      let d; try { d = JSON.parse(line); } catch { continue; }
      const p = (d && d.payload) || {};
      if (d && d.type === "response_item" && p.type === "function_call") {
        let args; try { args = JSON.parse(p.arguments || "{}"); } catch { args = {}; }
        handleTool(agent, p.name || "", args, d.timestamp);
      }
    }
  },
  /* VS Code-family editors (Cursor et al.): conversations in a SQLite key/value store.
     Counts conversations only -- these stores do not expose tool calls in a stable shape. */
  async vscodeSqliteSessions(file, agent, src, host) {
    const a = agentRec(agent);
    try {
      const { DatabaseSync } = await import("node:sqlite");
      const con = new DatabaseSync(file, { readOnly: true });
      try {
        const rows = con.prepare(src.sql).all();
        if (src.countRows) a.sessions += rows.length;
        else for (const row of rows) {
          try {
            const j = JSON.parse(row.value);
            const conv = j[src.conversationKey];
            if (conv && Object.keys(conv).length) a.sessions++;
          } catch { /* skip malformed row */ }
        }
      } catch { /* table absent on this version -- not an error */ }
      con.close();
    } catch {
      if (host.gapStore) addGap(agent, host.gapStore);
    }
  },
};

function scanPresence(host, prof) {
  const a = agentRec(host.name);
  for (const src of host.presence || []) {
    const p = srcPath(prof, src);
    const found = src.childPrefix ? listDir(p).some((e) => e.startsWith(src.childPrefix))
                                  : fs.existsSync(p);
    if (found) { a.installed = true; a.evidence.add(prof.tag(src.evidence)); }
  }
}
function addServers(hostName, entries, prof, label, disabledKey) {
  for (const [name, entry] of Object.entries(entries || {})) {
    const off = disabledKey && entry && entry[disabledKey] === true;
    const r = mcpRec(hostName, name + (off ? " (disabled in config)" : ""));
    r.configured = true; r.source.add(prof.tag(label));
  }
}
const asEntries = (names) => Object.fromEntries(names.map((n) => [n, {}]));
function scanMcpConfigs(host, prof) {
  for (const src of host.mcpConfigs || []) {
    const p = srcPath(prof, src);
    if (src.tomlSectionRegex) {                       // Codex-style TOML sections
      const rx = new RegExp(src.tomlSectionRegex, "gm");
      const names = [...(readText(p) || "").matchAll(rx)].map((m) => m[1]);
      addServers(host.name, asEntries(names), prof, src.label);
      continue;
    }
    if (src.nameKeys) {                               // per-server metadata files, path may glob
      for (const f of expandPath(rootOf(prof, src.root), src.path)) {
        const j = readJson(f); if (!j) continue;
        const name = src.nameKeys.map((k) => j[k]).find(Boolean);
        if (name) addServers(host.name, asEntries([name]), prof, src.label);
      }
      continue;
    }
    if (src.manifestDir) {                            // a directory of extension manifests
      for (const e of listDir(p)) {
        const mf = readJson(path.join(p, e, "manifest.json"));
        if (mf) addServers(host.name, asEntries([mf.name || e]), prof, src.label);
      }
      continue;
    }
    const cfg = readJson(p);
    if (!cfg) continue;
    if (src.expandProjects) {                         // per-project blocks + their own file
      const ex = src.expandProjects;
      for (const [proj, pc] of Object.entries(cfg[ex.key] || {})) {
        for (const key of src.jsonKeys)
          addServers(host.name, (pc && pc[key]) || {}, prof, src.label, src.disabledFlagKey);
        const child = readJson(path.join(proj, ex.childFile));
        for (const key of src.jsonKeys)
          addServers(host.name, (child && child[key]) || {}, prof, ex.childLabel, src.disabledFlagKey);
      }
      continue;
    }
    for (const key of src.jsonKeys || []) {           // first key that exists wins
      const entries = cfg[key] || {};
      if (Object.keys(entries).length) {
        addServers(host.name, entries, prof, src.label, src.disabledFlagKey);
        break;
      }
    }
  }
}
async function scanTranscripts(host, prof) {
  for (const src of host.transcripts || []) {
    const parser = PARSERS[src.parser];
    if (!parser) continue;
    const p = srcPath(prof, src);
    if (src.suffix) {
      for (const f of walkFiles(p, src.suffix)) await parser(f, host.name, src, host);
    } else if (isFile(p)) {
      await parser(p, host.name, src, host);
    }
  }
}
async function scanHost(host, prof) {
  scanPresence(host, prof);
  scanMcpConfigs(host, prof);
  await scanTranscripts(host, prof);
  const a = agentRec(host.name);
  if (a.installed && host.gap) addGap(host.name, host.gap);
}

// ---------------------------------------------------------------- memory & instruction files
/* Agent memory and instruction files name the resources an agent has been told about or has
   remembered. That is a DIFFERENT signal from access: reported separately, never merged. */
const MEM = new Map();
const MEMORY = R.memoryScan || {};
const MEM_PATTERNS = (MEMORY.patterns || []).map((p) => ({ ...p, rx: new RegExp(p.regex, "gm") }));

function memEmit(rtype, rid, file) {
  if (!rid) return;
  const k = `${rtype} ${rid}`;
  const m = MEM.get(k) || { rtype, rid, mentions: 0, files: new Set() };
  MEM.set(k, m);
  m.mentions++; m.files.add(file);
}
function scanMemoryText(text, label) {
  for (const p of MEM_PATTERNS) {
    p.rx.lastIndex = 0;
    for (const m of text.matchAll(p.rx)) memEmit(p.type, m[p.group], label);
  }
}
function scanMemory(prof) {
  if (MEMORY.enabled !== true) return;
  for (const src of MEMORY.sources || []) {
    if (src.fromClaudeProjects) {                 // project-level instruction files
      const cfg = readJson(path.join(prof.home, ".claude.json"));
      for (const proj of Object.keys((cfg && cfg.projects) || {}))
        for (const name of src.fromClaudeProjects) {
          const txt = readText(path.join(proj, name));
          if (txt) scanMemoryText(txt, prof.tag(src.label));
        }
      continue;
    }
    for (const p of expandPath(rootOf(prof, src.root), src.path)) {
      if (src.suffix) {
        for (const f of walkFiles(p, src.suffix)) {
          const txt = readText(f);
          if (txt) scanMemoryText(txt, prof.tag(src.label));
        }
      } else {
        const txt = readText(p);
        if (txt) scanMemoryText(txt, prof.tag(src.label));
      }
    }
  }
}

// ---------------------------------------------------------------- redaction
/* Resource names can be sensitive. When redaction is on we publish the TYPE in full and
   reduce the NAME to its last few characters, plus a short one-way tag.

   The tag matters for two reasons: distinct resources must stay distinct rows (two names can
   share their last 4 characters), and the same resource must redact identically on every
   machine so per-machine reports still consolidate. Both hold because the tag is a
   deterministic hash of the full name.

   Names too short to reveal safely are masked completely and identified by the tag alone --
   showing "the last 4" of a 3-character name would show all of it.

   Pass --salt <secret> to make tags unguessable (without a salt a short name could be found by
   hashing candidates). Use the SAME salt for every machine in one assessment, and never put the
   salt in the shared report. */
const RD = R.redaction || {};
let REDACT = RD.enabled === true;
let SALT = "";
let SALT_BASIS = "";   // how the salt was obtained, for the report header

/* Default salt: the organization's email domain. It makes every machine in one organization
   redact identically (so per-machine reports consolidate) without anyone distributing a secret.
   It is NOT a secret -- a domain is public and guessable, so short names remain brute-forceable.
   Pass --salt <secret> when the assessment needs tags that cannot be guessed. */
function findEmailDomain(prof) {
  for (const src of (RD.defaultSalt && RD.defaultSalt.sources) || []) {
    let email = null;
    if (src.env) {
      for (const v of src.env) if (process.env[v]) { email = process.env[v]; break; }
    } else if (src.jsonPath) {
      let node = readJson(path.join(rootOf(prof, src.root), ...src.path));
      for (const key of src.jsonPath) node = node && node[key];
      if (typeof node === "string") email = node;
    } else if (src.regex) {
      const m = new RegExp(src.regex).exec(readText(path.join(rootOf(prof, src.root), ...src.path)) || "");
      if (m) email = m[1];
    }
    if (email && email.includes("@")) return email.split("@").pop().trim().toLowerCase();
  }
  return null;
}
const tagOf = (s) => crypto.createHash("sha256").update(`${SALT}\u0000${s}`).digest("hex")
                           .slice(0, RD.tagLength || 4);
/* Identifies which salt produced this report's tags, without revealing the salt. Reports can
   only be merged with each other when these match. */
const saltFingerprint = () => crypto.createHash("sha256")
  .update(`agentic-discovery/salt-fingerprint\u0000${SALT}`).digest("hex")
  .slice(0, (RD.saltFingerprint && RD.saltFingerprint.length) || 8);
/* A hostname is usually "<person>-<model>", so the person's name sits in the first segment.
   Masking that segment while keeping its first and last letter leaves a label a colleague can
   recognise at a glance -- n___s~b0f-macbook-pro -- without the name being written down.

   The short tag is not decoration. First letter plus last letter gives 676 combinations, so by the
   birthday bound two machines out of fifty collide about 85% of the time; the tag, hashed from the
   full hostname and the shared salt, makes a genuine collision negligible while leaving the
   readable part untouched. It is deterministic, so a machine keeps its label across re-runs and
   across the reports being merged, and salted, so labels cannot be matched between engagements.

   The label is lower-cased so the same machine cannot produce two spellings, and the mask is a
   fixed width so the name's length is not disclosed either.

   Pseudonymous, not anonymous: with a small team, first letter plus last letter plus model narrows
   it to a person. That is the trade for a label people can act on. --no-redact keeps the hostname. */
function machineLabel() {
  const host = os.hostname().split(".")[0];
  if (!REDACT) return host;
  const cfg = RD.machineLabel || {};
  const mask = cfg.mask || "___";
  const i = host.indexOf("-");
  const person = i === -1 ? host : host.slice(0, i);
  const rest = (i === -1 ? "" : host.slice(i)).toLowerCase();
  // DESKTOP-A1B2C3 and the like carry no name -- masking them hides nothing and costs legibility.
  if ((cfg.genericPrefixes || []).includes(person.toLowerCase())) return host.toLowerCase();
  const p = person.toLowerCase();
  const masked = p.length >= 3 ? p[0] + mask + p[p.length - 1] : mask;
  const tag = crypto.createHash("sha256")
    .update(`agentic-discovery/machine\u0000${SALT}\u0000${host.toLowerCase()}`)
    .digest("hex").slice(0, cfg.tagLength || 3);
  return `${masked}~${tag}${rest}`;
}
function redactRid(rid) {
  if (!REDACT) return rid;
  const pfx = (RD.preservePrefixes || []).find((p) => rid.startsWith(p)) || "";
  const body = rid.slice(pfx.length);
  const mask = RD.mask || "\u00b7\u00b7\u00b7\u00b7";
  const shown = body.length >= (RD.minLengthForReveal || 8)
    ? mask + body.slice(-(RD.keepLast || 4))
    : mask;
  return `${pfx}${shown} #${tagOf(rid)}`;
}

// ---------------------------------------------------------------- report
/* Everything rendered into the report may originate from agent history, which prompt-injected
   content can shape. Neutralise Markdown structure so planted names cannot forge rows, fake
   sections, or "all clear" verdicts in the report a security reviewer trusts. */
function mdSafe(v) {
  return String(v)
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, " ")  // newlines & control chars
    .replace(/\|/g, "\u00a6")                                 // table-cell separator
    .replace(/`/g, "'")                                        // code-span escape
    .replace(/^[#>+*-]\s/, "\u00b7 ");                              // line-leading structure
}
const fmtTs = (ts) => (ts ? String(ts).slice(0, 10) : "-");
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
function accessSummary(cats) {
  const c = new Set([...cats].filter((x) => x !== "unknown"));
  if (!c.size) return "unclassified";
  if (c.size === 1 && c.has("read")) return "read-only";
  if (c.has("admin")) return "includes ADMIN";
  if (c.has("delete")) return "includes DELETE";
  if (c.has("create") || c.has("update")) return c.has("read") ? "read+write" : "write";
  return [...c].sort().join("+");
}
function viaList(via) {
  const items = [...via].sort();
  const max = R.maxViaPerResource;
  if (items.length <= max) return items.join("; ") || "-";
  return items.slice(0, max).join("; ") + `; +${items.length - max} more`;
}
function platformLine() {
  if (process.platform === "darwin") return "macOS";
  if (process.platform === "win32") return "Windows";
  if (isWsl()) {
    const sides = PROFILES.filter((p) => p.label).map((p) => p.label);
    return "WSL (Linux side" + (sides.length ? ` + ${sides.length} Windows profile(s): ${sides.join("; ")}` : "") + ")";
  }
  return "Linux";
}
function buildReport() {
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const host = machineLabel();
  const L = []; const add = (s) => L.push(s);
  const reported = [...RES.values()].filter((r) => isReported(r.rtype));
  const usedAgents = [...AGENTS.values()].filter((a) => a.actions).length;
  const writes = reported.filter((r) =>
    ["create", "update", "delete", "admin"].some((c) => r.cats.has(c))).length;
  const nMcpUsed = [...MCP.values()].filter((r) => r.used).length;
  add(`# Agentic Access Report -- ${host}`); add("");
  add(`*Generated ${now} on ${platformLine()} | agentic-discovery v${VERSION} (js) | read-only scan | nothing was transmitted*`);
  if (REDACT)
    add(`*Resource names are redacted (${SALT_BASIS || "unsalted"} \u00b7 salt fingerprint ` +
        `${saltFingerprint()}) -- types, tools, access types and counts are exact; names are not. ` +
        `Reports can only be consolidated with each other when this fingerprint matches.*`);
  add("");
  add("## Summary"); add("");
  add(`On this machine, **${usedAgents} agent app(s)** show real activity. Their agents used ` +
      `**${nMcpUsed} MCP server(s)** and reached **${reported.length} corporate resources** ` +
      `(cloud, databases, SaaS); **${writes} of those received updates or privileged actions** ` +
      `(create / update / delete / admin).`);
  if (STATS.external)
    add(`Resource identification rate: ${STATS.resolved}/${STATS.external} externally-reaching ` +
        `actions (${Math.floor((100 * STATS.resolved) / STATS.external)}%).`);
  add(""); add("## Agent apps on this machine"); add("");
  add("| Agent | Present | Activity found | Sessions | Activity window | Found at |");
  add("|---|---|---|---|---|---|");
  for (const name of R.hosts.map((h) => h.name)) {
    const a = AGENTS.get(name) || {};
    const act = a.actions ? `${a.actions} actions` : a.sessions ? "conversations only" : "none found";
    const win = a.first ? `${fmtTs(a.first)} to ${fmtTs(a.last)}` : "-";
    const ev = [...(a.evidence || [])].sort().map(mdSafe).join(", ") || "-";
    add(`| ${mdSafe(name)} | ${a.installed ? "yes" : "no"} | ${act} | ${a.sessions || "-"} | ${win} | ${ev} |`);
  }
  add(""); add("## MCP servers -- installed vs. actually used"); add("");
  add("| Agent | MCP server | Installed (configured) | Actually used | Calls | Last used |");
  add("|---|---|---|---|---|---|");
  const mcpRows = [...MCP.values()].sort((x, y) => y.used - x.used || cmp(x.agent, y.agent)
                                                   || cmp(x.server, y.server));
  for (const r of mcpRows)
    add(`| ${mdSafe(r.agent)} | ${mdSafe(r.server)} | ${r.configured ? "yes (" + [...r.source].sort().map(mdSafe).join(", ") + ")" : "no (seen in history only)"} ` +
        `| ${r.used ? "yes" : "NO -- configured but never used"} | ${r.used || "-"} | ${fmtTs(r.last)} |`);
  if (!mcpRows.length) add("| - | - | - | - | - | - |");
  add(""); add("## Resources accessed"); add("");
  const groups = new Map();
  for (const r of reported) {
    const g = resGroup(r.rtype);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(r);
  }
  let any = false;
  for (const gname of R.reportGroups) {
    const rows = groups.get(gname); if (!rows) continue;
    any = true;
    rows.sort((x, y) => y.calls - x.calls || cmp(x.rid, y.rid));
    add(`### ${gname}`); add("");
    add("| Resource | Type | Access | Intent categories | Tool type & tool used | Agent(s) | Calls | Last seen |");
    add("|---|---|---|---|---|---|---|---|");
    const limit = (R.rowLimits[gname] !== undefined ? R.rowLimits[gname] : R.rowLimits.default) || rows.length;
    for (const r of rows.slice(0, limit)) {
      const cats = [...r.cats].filter((c) => c !== "unknown").sort().join(", ") || "unclassified";
      add(`| \`${mdSafe(redactRid(r.rid))}\` | ${mdSafe(r.rtype)} | **${accessSummary(r.cats)}** | ${cats} | ${mdSafe(viaList(r.via))} ` +
          `| ${[...r.agents].sort().map(mdSafe).join(", ")} | ${r.calls} | ${fmtTs(r.last)} |`);
    }
    if (rows.length > limit) add(`| ...and ${rows.length - limit} more | | | | | | | |`);
    add("");
  }
  if (!any) { add("No corporate resource access was identified on this machine."); add(""); }
  const memRows = [...MEM.values()].filter((m) => isReported(m.rtype));
  if (memRows.length) {
    add("## Resources named in agent memory & instructions"); add("");
    add("*Referenced by the agent's memory or instruction files -- not proof of access.*"); add("");
    add("| Resource | Type | Mentions | Named in | Also accessed? |");
    add("|---|---|---|---|---|");
    memRows.sort((x, y) => y.mentions - x.mentions || cmp(x.rid, y.rid));
    const limit = R.rowLimits.default || memRows.length;
    for (const m of memRows.slice(0, limit)) {
      const accessed = RES.has(`${m.rtype} ${m.rid}`) ? "yes" : "not seen in access history";
      add(`| \`${mdSafe(redactRid(m.rid))}\` | ${mdSafe(m.rtype)} | ${m.mentions} | ${[...m.files].sort().map(mdSafe).join(", ")} | ${accessed} |`);
    }
    if (memRows.length > limit) add(`| ...and ${memRows.length - limit} more | | | | |`);
    add("");
  }
  if (UNRESOLVED.size) {
    const rows = [...UNRESOLVED.entries()].sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]));
    const tot = rows.reduce((n, [, c]) => n + c, 0);
    add("## Actions that reached outside but named no resource"); add("");
    add(`*${tot} actions reached something external without naming a resource this scan could ` +
        `identify. They are real access, so every count above understates rather than overstates. ` +
        `Some of these tools carry no resource identifier at all (browser click-and-type ` +
        `automation, where the page is tab state rather than an argument); others name their ` +
        `target in a way this version does not yet read. Listing them is how the next version ` +
        `learns -- the top rows are worth reporting back to Apono.*`); add("");
    add("| Tool | Actions | Share of unidentified |");
    add("|---|---|---|");
    const limit = R.rowLimits.default || rows.length;
    for (const [lbl, c] of rows.slice(0, limit))
      add(`| ${mdSafe(lbl)} | ${c} | ${((c / tot) * 100).toFixed(1)}% |`);
    if (rows.length > limit) add(`| ...and ${rows.length - limit} more | | |`);
    add("");
  }
  add("## Coverage notes & known gaps"); add("");
  for (const [name, a] of AGENTS) for (const g of a.gaps) add(`- **${name}:** ${g}`);
  for (const g of R.genericGaps) add(`- ${g}`);
  if (MEM.size && MEMORY.note) add(`- ${MEMORY.note}`);
  if (REDACT && RD.note)
    add(`- ${RD.note.replace("{keepLast}", String(RD.keepLast || 4))}`);
  if (REDACT && SALT_BASIS === "organization domain" && RD.defaultSalt && RD.defaultSalt.note)
    add(`- ${RD.defaultSalt.note}`);
  const notReported = Object.keys(R.resourceGroups).filter((g) => !R.reportGroups.includes(g));
  if (notReported.length)
    add(`- Collected but not reported here, by configuration: ${notReported.join(", ")}.`);
  if (isWsl())
    add("- This WSL scan covered the Linux filesystem and the Windows user profiles listed above. " +
        "A Windows-side scan cannot see other WSL distros; run the tool inside each distro that has agent activity.");
  if (process.platform === "win32")
    add("- This Windows scan does not see inside WSL distros. If agents run in WSL (e.g. Claude Code), " +
        "run the same tool inside WSL too.");
  add(""); add("## What this report does and does not contain"); add("");
  add("- Contains: resource identifiers, tool/MCP/agent names, action categories, timestamps, counts.");
  add("- Does NOT contain: prompts, conversation content, shell command text, tool arguments, " +
      "file contents, secrets, or personal data.");
  add("- This scan was read-only and made no network connections. Sharing this file is your choice.");
  add("");
  return L.join("\n");
}

/* Refuse to write through a pre-existing symlink (it would clobber whatever it points at);
   replace the path itself and create the file fresh. */
function writeReport(p, data) {
  try { if (fs.lstatSync(p).isSymbolicLink() || fs.lstatSync(p).isFile()) fs.rmSync(p); } catch { /* absent */ }
  fs.writeFileSync(p, data, { encoding: "utf-8", flag: "wx" });
}

// ---------------------------------------------------------------- main
async function main() {
  const argv = process.argv.slice(2);
  const outDir = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : ".";
  if (argv.includes("--redact")) REDACT = true;
  if (argv.includes("--no-redact")) REDACT = false;
  if (argv.includes("--salt")) SALT = argv[argv.indexOf("--salt") + 1] || "";
  console.log(`Agentic Access Discovery v${VERSION} (js) on ${platformLine()}`);
  if (REDACT && !SALT) {
    const dom = findEmailDomain(PROFILES[0]);
    if (dom) { SALT = dom; SALT_BASIS = "organization domain"; }
  } else if (REDACT && SALT) SALT_BASIS = "explicit salt";
  redactProfileLabels();
  console.log(REDACT
    ? `Resource names will be REDACTED (${SALT_BASIS || "no salt found -- pass --salt for consistent, unguessable tags"}).`
    : "Resource names will be shown in FULL (--no-redact). Do not share this copy unless you intend to.");
  console.log("Read-only scan, no network. Scanning...");
  for (const prof of PROFILES) {
    try { scanMemory(prof); }
    catch (e) { console.log(`  note: memory scan skipped for ${prof.label || "local"} (${e.constructor.name})`); }
    for (const host of R.hosts) {
      try { await scanHost(host, prof); }
      catch (e) { console.log(`  note: ${host.name} skipped for ${prof.label || "local"} (${e.constructor.name})`); }
    }
  }
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const base = path.join(outDir, `agentic-access-report-${machineLabel()}-${stamp}`);
  writeReport(base + ".md", buildReport());
  console.log(`\nThis machine is reported as: ${machineLabel()}`);
  console.log(`Report written to: ${base}.md`);
  if (argv.includes("--unresolved")) {
    const rows = [...UNRESOLVED.entries()].sort((a, b) => b[1] - a[1]);
    const tot = rows.reduce((n, [, c]) => n + c, 0);
    console.log(`\nUnidentified externally-reaching actions: ${tot}`);
    console.log("These reached something real but named no resource we could extract.");
    console.log("The top rows are where new extraction rules would pay off most.\n");
    for (const [lbl, c] of rows.slice(0, 25))
      console.log(`  ${String(c).padStart(5)}  ${((c / tot) * 100).toFixed(1).padStart(5)}%  ${lbl}`);
    if (rows.length > 25) console.log(`  ... and ${rows.length - 25} more`);
  }
  if (argv.includes("--json")) {
    const clean = (v) => (v instanceof Set ? [...v].sort() : v);
    const obj = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clean(v)]));
    const j = { version: VERSION, platform: platformLine(),
      agents: Object.fromEntries([...AGENTS].map(([k, v]) => [k, obj(v)])),
      mcp: [...MCP.values()].map(obj),
      redacted: REDACT,
      memoryReferences: [...MEM.values()].map((m) => ({ rtype: m.rtype, rid: redactRid(m.rid),
                                                        mentions: m.mentions, files: [...m.files].sort() })),
      resources: [...RES.values()].map((r) => ({ ...obj(r), rid: redactRid(r.rid),
                                                 group: resGroup(r.rtype),
                                                 reported: isReported(r.rtype) })) };
    writeReport(base + ".json", JSON.stringify(j, null, 1));
    console.log(`Machine-readable copy:  ${base}.json`);
  }
  console.log("Review the report, then share it manually if you choose to. Nothing was sent anywhere.");
}
main();
