#!/usr/bin/env node
/*
 * Consolidate per-machine Agentic Access Reports into one assessment.
 *
 *   node js/merge.mjs [folder | file ...] [--out DIR] [--customer "Name"]
 *
 * Default input folder is ./Reports. Reads the .json copy of a report when one sits beside
 * the .md (complete), otherwise parses the .md (per-group tables are capped at 25 rows there,
 * so anything dropped is counted and stated in the output).
 *
 * Merging works across machines because redaction tags are derived from the full resource name
 * plus a shared salt: the same resource redacts identically everywhere, so identical rows join.
 * Reports salted differently CANNOT be merged -- that is detected and refused.
 *
 * READ-ONLY, NO NETWORK, like the scanner itself.
 */
import fs from "node:fs";
import path from "node:path";

const R = JSON.parse(fs.readFileSync(new URL("./rules.json", import.meta.url), "utf-8"));
const CAT = R.aponoCatalog || { supported: [], roadmap: [], unsupported: [], labels: {} };
const WRITE_CATS = ["create", "update", "delete", "admin"];

const catalogStatus = (t) =>
  CAT.supported.includes(t) ? "supported" :
  (CAT.oauthMcp || []).includes(t) ? "oauthMcp" :
  CAT.roadmap.includes(t) ? "roadmap" :
  CAT.unsupported.includes(t) ? "unsupported" : "unknown";
const catalogLabel = (s) => (CAT.labels && CAT.labels[s]) || s;

// ---------------------------------------------------------------- markdown parsing
/* Returns { h2 -> { h3|"" -> rows[][] } } plus dropped-row counts. */
function parseTables(md) {
  const out = {}; const dropped = [];
  let h2 = "", h3 = "";
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("## ")) { h2 = line.slice(3).trim(); h3 = ""; continue; }
    if (line.startsWith("### ")) { h3 = line.slice(4).trim(); continue; }
    if (!line.startsWith("|")) continue;
    const cells = (l) => l.split("|").slice(1, -1).map((c) => c.trim());
    if (!/^\|[\s:-]+\|/.test(lines[i + 1] || "")) continue;   // header must be followed by ---
    const header = cells(line);
    i += 2;
    const rows = [];
    for (; i < lines.length && lines[i].startsWith("|"); i++) {
      const row = cells(lines[i]);
      const m = /^\.\.\.and (\d+) more/.exec(row[0] || "");
      if (m) { dropped.push({ section: h2, group: h3, count: +m[1] }); continue; }
      rows.push(row);
    }
    i--;
    out[h2] = out[h2] || {};
    out[h2][h3] = { header, rows };
  }
  return { tables: out, dropped };
}
const clean = (s) => String(s || "").replace(/^`|`$/g, "").replace(/\*\*/g, "").trim();
/* Per-machine reports cap long tool lists with a "+N more" tail. That tail is a display
   artifact, not a tool -- carrying it through would show "+19 more" as if it were a tool name. */
const splitList = (s) => clean(s).split(/[;,]/).map((x) => x.trim())
  .filter((x) => x && x !== "-" && !/^\+\d+( more)?$/.test(x));

function parseMd(md, file) {
  const { tables, dropped } = parseTables(md);
  const rep = {
    file: path.basename(file), source: "md", dropped,
    machine: (/^# Agentic Access Report -+ (.+)$/m.exec(md) || [, "unknown"])[1].trim(),
    generated: (/\*Generated ([\d-]+ [\d:]+) on ([^|]+)\|/.exec(md) || [, "?", "?"]).slice(1, 3),
    version: (/agentic-discovery v([\d.]+)/.exec(md) || [, "?"])[1],
    saltBasis: (/Resource names are redacted \(([^)\u00b7]+)/.exec(md) || [, "not redacted"])[1].trim(),
    fingerprint: (/salt fingerprint ([0-9a-f]+)/.exec(md) || [, ""])[1],
    idRate: (() => {                       // how much of this machine's external access we could name
      const m = /identification rate: (\d+)\/(\d+)/.exec(md);
      return m ? { resolved: +m[1], external: +m[2] } : null;
    })(),
    agents: [], mcp: [], resources: [], memory: [], unresolved: [],
  };
  const T = (h2, h3 = "") => (tables[h2] && tables[h2][h3]) || { rows: [] };
  for (const r of T("Agent apps on this machine").rows)
    rep.agents.push({ agent: clean(r[0]), present: clean(r[1]) === "yes", activity: clean(r[2]),
                      sessions: clean(r[3]), window: clean(r[4]) });
  for (const r of T("MCP servers -- installed vs. actually used").rows)
    rep.mcp.push({ agent: clean(r[0]), server: clean(r[1]),
                   configured: clean(r[2]).startsWith("yes"),
                   used: clean(r[3]) === "yes", calls: parseInt(clean(r[4])) || 0,
                   last: clean(r[5]) });
  for (const group of Object.keys(tables["Resources accessed"] || {}))
    for (const r of T("Resources accessed", group).rows)
      rep.resources.push({ rid: clean(r[0]), rtype: clean(r[1]), group,
                           cats: splitList(r[3]), tools: splitList(r[4]),
                           agents: splitList(r[5]), calls: parseInt(clean(r[6])) || 0,
                           last: clean(r[7]) });
  for (const r of T("Resources named in agent memory & instructions").rows)
    rep.memory.push({ rid: clean(r[0]), rtype: clean(r[1]),
                      mentions: parseInt(clean(r[2])) || 0 });
  for (const r of T("Actions that reached outside but named no resource").rows)
    rep.unresolved.push({ tool: clean(r[0]), calls: parseInt(clean(r[1])) || 0 });
  return rep;
}

function parseJson(j, file) {
  const rep = { file: path.basename(file), source: "json", dropped: [],
                machine: file.replace(/^.*agentic-access-report-(.+)-\d{8}\.json$/, "$1"),
                generated: ["?", j.platform || "?"], version: j.version || "?",
                saltBasis: j.redacted ? "redacted" : "not redacted", fingerprint: j.saltFingerprint || "",
                idRate: null,
                agents: [], mcp: [], resources: [], memory: [], unresolved: [] };
  for (const [agent, a] of Object.entries(j.agents || {}))
    rep.agents.push({ agent, present: !!a.installed,
                      activity: a.actions ? `${a.actions} actions` : "none found",
                      sessions: String(a.sessions || "-"), window: "" });
  for (const m of j.mcp || [])
    rep.mcp.push({ agent: m.agent, server: m.server, configured: !!m.configured,
                   used: !!m.used, calls: m.used || 0, last: String(m.last || "-").slice(0, 10) });
  for (const r of j.resources || []) {
    if (r.reported === false) continue;
    rep.resources.push({ rid: r.rid, rtype: r.rtype, group: r.group,
                         cats: (r.cats || []).filter((c) => c !== "unknown"),
                         tools: r.via || [], agents: r.agents || [],
                         calls: r.calls || 0, last: String(r.last || "-").slice(0, 10) });
  }
  for (const m of j.memoryReferences || [])
    rep.memory.push({ rid: m.rid, rtype: m.rtype, mentions: m.mentions || 0 });
  return rep;
}

// ---------------------------------------------------------------- merge
function mergeReports(reports) {
  const res = new Map(), mcp = new Map(), mem = new Map(), unres = new Map();
  const bump = (map, key, init, fn) => {
    const v = map.get(key) || init(); map.set(key, v); fn(v); return v;
  };
  for (const rep of reports) {
    for (const r of rep.resources)
      bump(res, `${r.rtype}\u0000${r.rid}`,
        () => ({ rtype: r.rtype, rid: r.rid, group: r.group, calls: 0, cats: new Set(),
                 tools: new Set(), agents: new Set(), machines: new Set(), last: "" }),
        (v) => {
          v.calls += r.calls; r.cats.forEach((c) => v.cats.add(c));
          r.tools.forEach((t) => v.tools.add(t)); r.agents.forEach((a) => v.agents.add(a));
          v.machines.add(rep.machine);
          if (r.last > v.last) v.last = r.last;
        });
    for (const u of rep.unresolved)
      bump(unres, u.tool,
        () => ({ tool: u.tool, calls: 0, machines: new Set() }),
        (v) => { v.calls += u.calls; v.machines.add(rep.machine); });
    for (const m of rep.mcp)
      bump(mcp, m.server,
        () => ({ server: m.server, calls: 0, usedOn: new Set(), configuredOn: new Set(),
                 machines: new Set(), agents: new Set(), last: "" }),
        (v) => {
          v.calls += m.calls; v.machines.add(rep.machine); v.agents.add(m.agent);
          if (m.used) v.usedOn.add(rep.machine);
          if (m.configured) v.configuredOn.add(rep.machine);
          if (m.last > v.last) v.last = m.last;
        });
    for (const x of rep.memory)
      bump(mem, `${x.rtype}\u0000${x.rid}`,
        () => ({ rtype: x.rtype, rid: x.rid, mentions: 0, machines: new Set() }),
        (v) => { v.mentions += x.mentions; v.machines.add(rep.machine); });
  }
  return { res, mcp, mem, unres };
}

// ---------------------------------------------------------------- render
const hasWrite = (cats) => WRITE_CATS.some((c) => cats.has(c));
function riskRank(r) {
  if (r.cats.has("admin")) return 0;
  if (r.cats.has("delete")) return 1;
  if (r.cats.has("create") || r.cats.has("update")) return 2;
  return 3;
}
function render(reports, merged, opts) {
  const { res, mcp, mem } = merged;
  const L = []; const add = (s) => L.push(s);
  const resources = [...res.values()];
  const writes = resources.filter((r) => hasWrite(r.cats));
  const tools = new Set(); resources.forEach((r) => r.tools.forEach((t) => tools.add(t)));
  const byStatus = (s) => resources.filter((r) => catalogStatus(r.rtype) === s);
  const usedServers = [...mcp.values()].filter((m) => m.usedOn.size);

  add(`# Agentic Access Assessment${opts.customer ? ` \u2014 ${opts.customer}` : ""}`);
  add("");
  add(`*Consolidated from ${reports.length} machine report(s) on ${new Date().toISOString().slice(0, 10)} \u00b7 agentic-discovery merge*`);
  add("");
  add("## Headline");
  add("");
  add(`Across **${reports.length} machines**, AI agents accessed **${resources.length} corporate ` +
      `resources** through **${tools.size} distinct tools**; **${writes.length} of those resources ` +
      `received updates or privileged actions** (create / update / delete / admin); ` +
      `**${byStatus("supported").length + byStatus("oauthMcp").length} are within Apono's ` +
      `coverage today** \u2014 ${byStatus("supported").length} through native integrations and ` +
      `${byStatus("oauthMcp").length} through custom OAuth MCP.`);
  add("");
  const admin = resources.filter((r) => r.cats.has("admin"));
  const del = resources.filter((r) => r.cats.has("delete"));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  if (admin.length || del.length)
    add(`Highest-risk slice: **${plural(admin.length, "resource", "resources")} saw admin actions** ` +
        `and **${del.length} saw deletes**.`);
  add("");

  const prints = new Set(reports.map((r) => r.fingerprint || "unknown"));
  const known = [...prints].filter((p) => p !== "unknown");
  const unverifiable = prints.has("unknown");
  if (known.length > 1 || (known.length && unverifiable)) {
    add("> **These reports are not all comparable.** They carry different salt fingerprints " +
        `(${[...prints].join(", ")}), which means the same resource redacts differently between ` +
        "them and will appear more than once below. Re-run the affected machines with the same " +
        "salt setting before relying on the totals.");
    add("");
  }
  add("## Machines in this assessment");
  add("");
  add("| Machine | Generated | Version | Redaction | Salt | Agents with activity | Resources | Source |");
  add("|---|---|---|---|---|---|---|---|");
  for (const rep of reports)
    add(`| ${rep.machine} | ${rep.generated[0]} | v${rep.version} | ${rep.saltBasis} ` +
        `| ${rep.fingerprint || "unknown"} ` +
        `| ${rep.agents.filter((a) => a.present && !/none found/.test(a.activity)).map((a) => a.agent).join(", ") || "-"} ` +
        `| ${rep.resources.length} | ${rep.source} |`);
  add("");

  /* By type is what scopes a POC: one row per integration an admin would actually onboard. */
  add("## Integrations to onboard, by resource type");
  add("");
  add("| Resource type | Apono coverage | Resources | Machines | read | create | update | delete | admin | Calls |");
  add("|---|---|---|---|---|---|---|---|---|---|");
  const INTENTS = ["read", "create", "update", "delete", "admin"];
  const byType = new Map();
  for (const r of resources) {
    const v = byType.get(r.rtype) || { rtype: r.rtype, n: 0, machines: new Set(),
                                       calls: 0, tools: new Set(),
                                       intents: Object.fromEntries(INTENTS.map((c) => [c, 0])) };
    byType.set(r.rtype, v);
    v.n++; v.calls += r.calls;
    for (const c of INTENTS) if (r.cats.has(c)) v.intents[c]++;
    r.machines.forEach((m) => v.machines.add(m)); r.tools.forEach((t) => v.tools.add(t));
  }
  const statusRank = { supported: 0, oauthMcp: 1, roadmap: 2, unsupported: 3, unknown: 4 };
  for (const t of [...byType.values()].sort((a, b) =>
        statusRank[catalogStatus(a.rtype)] - statusRank[catalogStatus(b.rtype)] || b.calls - a.calls))
    add(`| ${t.rtype} | ${catalogLabel(catalogStatus(t.rtype))} | ${t.n} | ${t.machines.size} ` +
        `| ${INTENTS.map((c) => t.intents[c] || "-").join(" | ")} | ${t.calls} |`);
  add("");

  add("## Every resource, by Apono coverage");
  add("");
  for (const status of ["supported", "oauthMcp", "roadmap", "unsupported", "unknown"]) {
    const rows = byStatus(status).sort((a, b) => riskRank(a) - riskRank(b) || b.calls - a.calls);
    if (!rows.length) continue;
    add(`### ${catalogLabel(status)} (${rows.length})`);
    add("");
    add("| Resource | Type | Access | Machines | Tools used | Calls | Last seen |");
    add("|---|---|---|---|---|---|---|");
    for (const r of rows.slice(0, 40)) {
      const acc = r.cats.has("admin") ? "**includes ADMIN**"
                : r.cats.has("delete") ? "**includes DELETE**"
                : hasWrite(r.cats) ? "read+write" : "read-only";
      add(`| \`${r.rid}\` | ${r.rtype} | ${acc} | ${r.machines.size} | ` +
          `${[...r.tools].slice(0, 2).join("; ")}${r.tools.size > 2 ? `; +${r.tools.size - 2}` : ""} ` +
          `| ${r.calls} | ${r.last} |`);
    }
    if (rows.length > 40) add(`| ...and ${rows.length - 40} more | | | | | | |`);
    add("");
  }

  add("## MCP servers across the fleet");
  add("");
  add("| MCP server | Used on | Configured on | Total calls | Agents | Last used |");
  add("|---|---|---|---|---|---|");
  for (const m of usedServers.sort((a, b) => b.calls - a.calls).slice(0, 40))
    add(`| ${m.server} | ${m.usedOn.size} machine(s) | ${m.configuredOn.size} | ${m.calls} ` +
        `| ${[...m.agents].join(", ")} | ${m.last} |`);
  add("");
  const ghost = [...mcp.values()].filter((m) => m.usedOn.size && !m.configuredOn.size);
  const idle = [...mcp.values()].filter((m) => !m.usedOn.size && m.configuredOn.size);
  if (ghost.length) {
    add(`**${ghost.length} server(s) were used but appear in no local config file** \u2014 connectors, ` +
        `plugins or remotely-provisioned servers: ${ghost.slice(0, 8).map((m) => m.server).join(", ")}` +
        `${ghost.length > 8 ? ", \u2026" : ""}.`);
    add("");
  }
  if (idle.length) {
    add(`**${idle.length} server(s) are configured but were never used**: ` +
        `${idle.slice(0, 8).map((m) => m.server).join(", ")}${idle.length > 8 ? ", \u2026" : ""}.`);
    add("");
  }

  const memRows = [...mem.values()].sort((a, b) => b.mentions - a.mentions);
  if (memRows.length) {
    add("## Named in agent memory but never accessed");
    add("");
    add("*Resources the agents have been told about or remember. Not proof of access \u2014 but they " +
        "indicate intent and scope.*");
    add("");
    add("| Resource | Type | Mentions | Machines | Also accessed? |");
    add("|---|---|---|---|---|");
    for (const m of memRows.slice(0, 25))
      add(`| \`${m.rid}\` | ${m.rtype} | ${m.mentions} | ${m.machines.size} | ` +
          `${res.has(`${m.rtype}\u0000${m.rid}`) ? "yes" : "not seen in access history"} |`);
    add("");
  }

  if (merged.unres.size) {
    const rows = [...merged.unres.values()].sort((a, b) => b.calls - a.calls || (a.tool < b.tool ? -1 : a.tool > b.tool ? 1 : 0));
    const tot = rows.reduce((n, r) => n + r.calls, 0);
    add("## Access we could not attribute, fleet-wide"); add("");
    const contributing = new Set();
    for (const r of rows) for (const m of r.machines) contributing.add(m);
    add(`${tot} actions reached something external without naming a resource this version can ` +
        `identify. These are real accesses, so every count in this document understates the ` +
        `estate rather than overstating it. The rows are ordered by volume: the top ones are ` +
        `where a new extraction rule buys the most coverage, and they are worth sending back to ` +
        `Apono.`); add("");
    if (contributing.size < reports.length)
      add(`**Counted from ${contributing.size} of ${reports.length} machines.** Only reports from ` +
          `v0.9 onwards list unattributed actions, so the machines on older versions contribute ` +
          `nothing here and the real total is higher.`), add("");
    add("| Tool | Actions | Machines |");
    add("|---|---|---|");
    for (const r of rows) add(`| ${r.tool} | ${r.calls} | ${r.machines.size} |`);
    add("");
  }
  add("## How to read this, and what it does not cover");
  add("");
  if (known.length > 1 || (known.length && unverifiable))
    add(`- **Salt fingerprints differ or are missing (${[...prints].join(", ")}).** Resources only ` +
        `match between machines when the salt is identical, so totals above over-count: the same ` +
        `resource appears once per distinct salt. Fix by re-running with a consistent salt, not by ` +
        `editing this file.`);
  else if (known.length === 1)
    add(`- All ${reports.length} report(s) share salt fingerprint \`${known[0]}\`, so resources ` +
        `matched correctly across machines.`);
  else
    add(`- **Comparability could not be verified.** These reports predate salt fingerprinting ` +
        `(v0.8), so nothing in them proves they used the same salt. They will have matched correctly ` +
        `if every machine used the default (organization domain) and none passed \`--salt\`.`);
  const labelCounts = reports.reduce((a, r) => (a[r.machine] = (a[r.machine] || 0) + 1, a), {});
  const collided = Object.entries(labelCounts).filter(([, n]) => n > 1).map(([l]) => l);
  if (collided.length)
    add(`- **Two or more reports share a machine label (${collided.join(", ")}).** A masked label ` +
        `keeps only the first and last letter of the name, so different machines can land on the ` +
        `same one; their rows are merged above as though they were one machine. Re-run those with ` +
        `\`--no-redact\` or distinguish them by hand before relying on the machine counts.`);
  const rated = reports.filter((r) => r.idRate);
  if (rated.length) {
    const resolved = rated.reduce((n, r) => n + r.idRate.resolved, 0);
    const external = rated.reduce((n, r) => n + r.idRate.external, 0);
    const pct = Math.round((100 * resolved) / Math.max(external, 1));
    const worst = [...rated].sort((a, b) =>
      (b.idRate.external - b.idRate.resolved) - (a.idRate.external - a.idRate.resolved))[0];
    add(`- **${resolved} of ${external} externally-reaching actions (${pct}%) could be tied to a ` +
        `named resource.** The other ${external - resolved} reached something real that this scan ` +
        `could not name -- usually an MCP server whose arguments we have no extraction rule for. ` +
        `Everything above therefore understates the estate rather than overstating it. The largest ` +
        `single gap is ${worst.machine} at ${worst.idRate.resolved}/${worst.idRate.external}.`);
  }
  const versions = [...new Set(reports.map((r) => r.version))].sort();
  if (versions.length > 1) {
    const pre09 = reports.filter((r) => r.version !== "?" && parseFloat(r.version) < 0.9);
    add(`- **These reports come from mixed tool versions (${versions.map((v) => "v" + v).join(", ")}), ` +
        `which is not only a row-count difference.** Versions before v0.9 excluded code hosting ` +
        `(GitHub/GitLab/git) and web access from the report entirely, and had no rules for GitLab ` +
        `or JFrog Artifactory. So a machine on an older version contributes zero rows for those ` +
        `types no matter what it actually did` +
        (pre09.length ? ` -- ${pre09.length} of ${reports.length} machines here` : "") +
        `. Any per-type machine count spanning those types reflects who re-ran the scan, not who ` +
        `used the resource. Re-run every machine on one version before quoting those numbers.`);
  }
  const totalDropped = reports.flatMap((r) => r.dropped).reduce((n, d) => n + d.count, 0);
  if (totalDropped)
    add(`- **${totalDropped} row(s) were truncated out of the source reports** and are missing here. ` +
        `Reports from agentic-discovery v0.8 and later contain every row; older ones capped each ` +
        `section, so re-run those machines if the totals need to be exact.`);
  add(`- Per-resource tool lists are capped at ${R.maxViaPerResource || 12} entries per machine ` +
      `report, so a resource reached through more tools than that shows a partial list. Resource ` +
      `rows, access categories, machine counts and call totals are complete.`);
  add(`- Resource names are redacted. Types, access categories, tools, machine counts and dates ` +
      `are exact; the names are not recoverable from this document.`);
  add(`- ${CAT.note}`);
  add(`- Per-machine coverage gaps (agent apps whose history is not readable locally) are listed ` +
      `in each source report and are not repeated here.`);
  add("");
  return L.join("\n");
}

// ---------------------------------------------------------------- main
const VALUE_FLAGS = ["--out", "--customer"];
/* Positional inputs are everything that is neither a flag nor a flag's value. */
function positionals(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (VALUE_FLAGS.includes(args[i])) { i++; continue; }
    if (args[i].startsWith("--")) continue;
    out.push(args[i]);
  }
  return out;
}
function collectFiles(args) {
  const inputs = positionals(args);
  const targets = inputs.length ? inputs : ["Reports"];
  const files = [];
  for (const t of targets) {
    let st; try { st = fs.statSync(t); } catch { console.error(`  skipped (not found): ${t}`); continue; }
    if (st.isDirectory())
      for (const f of fs.readdirSync(t).sort())
        if (/^agentic-access-report-.*\.(md|json)$/.test(f)) files.push(path.join(t, f));
    else files.push(t);
  }
  // prefer the .json copy when both exist for the same report
  const byBase = new Map();
  for (const f of files) {
    const base = f.replace(/\.(md|json)$/, "");
    const prev = byBase.get(base);
    if (!prev || f.endsWith(".json")) byBase.set(base, f);
  }
  return [...byBase.values()];
}

function main() {
  const argv = process.argv.slice(2);
  const outDir = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : ".";
  const customer = argv.includes("--customer") ? argv[argv.indexOf("--customer") + 1] : "";
  const files = collectFiles(argv);
  if (!files.length) {
    console.error("No reports found. Put the per-machine reports in ./Reports or pass paths.\n" +
                  "  node js/merge.mjs [folder | file ...] [--out DIR] [--customer \"Name\"]");
    process.exit(1);
  }
  const reports = [];
  for (const f of files) {
    try {
      const txt = fs.readFileSync(f, "utf-8");
      reports.push(f.endsWith(".json") ? parseJson(JSON.parse(txt), f) : parseMd(txt, f));
      console.log(`  read ${path.basename(f)}`);
    } catch (e) {
      console.error(`  FAILED to read ${f}: ${e.message}`);
    }
  }
  if (!reports.length) { console.error("Nothing could be parsed."); process.exit(1); }
  const merged = mergeReports(reports);
  if (argv.includes("--json")) {
    const set = (v) => [...v].sort();
    const j = {
      generated: new Date().toISOString().slice(0, 10),
      customer: customer || null,
      identification: (() => {
        const rated = reports.filter((r) => r.idRate);
        if (!rated.length) return null;
        return { resolved: rated.reduce((n, r) => n + r.idRate.resolved, 0),
                 external: rated.reduce((n, r) => n + r.idRate.external, 0) };
      })(),
      unresolved: [...merged.unres.values()]
        .sort((a, b) => b.calls - a.calls)
        .map((u) => ({ tool: u.tool, calls: u.calls, machines: u.machines.size })),
      machines: reports.map((r) => ({ machine: r.machine, generated: r.generated[0],
                                      idRate: r.idRate,
                                      version: r.version, saltBasis: r.saltBasis,
                                      fingerprint: r.fingerprint || null, source: r.source,
                                      resources: r.resources.length,
                                      truncatedRows: r.dropped.reduce((n, d) => n + d.count, 0) })),
      resourceTypes: [...merged.res.values()].reduce((acc, r) => {
        const t = acc[r.rtype] || (acc[r.rtype] = { type: r.rtype, coverage: catalogStatus(r.rtype),
          coverageLabel: catalogLabel(catalogStatus(r.rtype)), resources: 0, calls: 0,
          writes: 0, machines: new Set(), tools: new Set() });
        t.resources++; t.calls += r.calls; if (hasWrite(r.cats)) t.writes++;
        r.machines.forEach((m) => t.machines.add(m)); r.tools.forEach((x) => t.tools.add(x));
        return acc;
      }, {}),
      resources: [...merged.res.values()].map((r) => ({ id: r.rid, type: r.rtype, group: r.group,
        coverage: catalogStatus(r.rtype), access: r.cats.has("admin") ? "admin"
          : r.cats.has("delete") ? "delete" : hasWrite(r.cats) ? "write" : "read",
        categories: set(r.cats), tools: set(r.tools), machines: set(r.machines),
        machineCount: r.machines.size, calls: r.calls, lastSeen: r.last })),
      mcpServers: [...merged.mcp.values()].map((m) => ({ server: m.server, calls: m.calls,
        usedOn: m.usedOn.size, configuredOn: m.configuredOn.size,
        shadow: m.usedOn.size > 0 && m.configuredOn.size === 0,
        idle: m.usedOn.size === 0 && m.configuredOn.size > 0,
        agents: set(m.agents), lastUsed: m.last })),
      memoryReferences: [...merged.mem.values()].map((m) => ({ id: m.rid, type: m.rtype,
        mentions: m.mentions, machines: m.machines.size,
        alsoAccessed: merged.res.has(`${m.rtype}\u0000${m.rid}`) })),
      catalogNote: CAT.note,
    };
    for (const t of Object.values(j.resourceTypes)) {
      t.machines = t.machines.size; t.tools = t.tools.size;
    }
    j.resourceTypes = Object.values(j.resourceTypes)
      .sort((a, b) => b.calls - a.calls);
    const jp = path.join(outDir, `agentic-access-assessment-${j.generated}.json`);
    try { if (fs.lstatSync(jp)) fs.rmSync(jp); } catch { /* absent */ }
    fs.writeFileSync(jp, JSON.stringify(j, null, 1), { encoding: "utf-8", flag: "wx" });
    console.log(`  structured data:  ${jp}`);
  }
  const out = path.join(outDir, `agentic-access-assessment-${new Date().toISOString().slice(0, 10)}.md`);
  const body = render(reports, merged, { customer });
  try { if (fs.lstatSync(out)) fs.rmSync(out); } catch { /* absent */ }
  fs.writeFileSync(out, body, { encoding: "utf-8", flag: "wx" });
  console.log(`\nAssessment written to: ${out}`);
  console.log(`  ${reports.length} machines \u00b7 ${merged.res.size} resources \u00b7 ${merged.mcp.size} MCP servers`);
}
main();
