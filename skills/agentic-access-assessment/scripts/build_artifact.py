#!/usr/bin/env python3
"""Build the SE-facing assessment page from merge.mjs --json output."""
import json, sys

data = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "data.json"))
types = data["resourceTypes"]
res = data["resources"]
mcp = data["mcpServers"]
machines = data["machines"]

# The machine label in each report is authoritative: whatever the person who ran the scan chose to
# share is what appears here. Redaction is a decision made once, at scan time, by the machine's
# owner -- masking it again downstream would only make the assessment harder to act on than its
# own inputs are.

# Access path per type: CLI means the agent reached it without going through any MCP server.
paths_by_type = {}
for r in res:
    kinds = {t.split(":")[0] for t in r["tools"]}
    paths_by_type.setdefault(r["type"], set()).update(kinds)
for t in types:
    t["paths"] = sorted(paths_by_type.get(t["type"], set()))

n_types = len(types)
n_res = len(res)
write_types = sum(1 for t in types if t["writes"])
covered = sum(1 for t in types if t["coverage"] in ("supported", "oauthMcp"))
shadow = [m for m in mcp if m["shadow"]]
idle = [m for m in mcp if m["idle"]]
truncated = sum(m["truncatedRows"] for m in machines)
prints = {m["fingerprint"] for m in machines}
admin_n = sum(1 for r in res if r["access"] == "admin")
delete_n = sum(1 for r in res if r["access"] == "delete")

HTML = """<title>Apono Agentic Access Pilot</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
:root{
  --ground:#EEF2F4; --surface:#FFFFFF; --surface-2:#F7F9FA; --line:#D3DDE2;
  --ink:#13202A; --ink-2:#42566180; --muted:#5B6E7A;
  --accent:#0B6F7F; --accent-soft:#0B6F7F14; --accent-line:#0B6F7F40;
  --critical:#A82A44; --critical-soft:#A82A4414;
  --warn:#8F5410; --warn-soft:#8F541014;
  --ok:#256349; --ok-soft:#25634914;
  --shadow:0 1px 2px #13202A0F, 0 8px 24px -12px #13202A1A;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --ground:#0D1418; --surface:#141E24; --surface-2:#18242B; --line:#26353D;
    --ink:#E3ECF0; --ink-2:#8CA3AF80; --muted:#93A7B2;
    --accent:#3FB6C6; --accent-soft:#3FB6C61F; --accent-line:#3FB6C659;
    --critical:#F1899B; --critical-soft:#F1899B1F;
    --warn:#E0AC63; --warn-soft:#E0AC631F;
    --ok:#6FC49E; --ok-soft:#6FC49E1F;
    --shadow:0 1px 2px #0006, 0 10px 28px -14px #0009;
  }
}
:root[data-theme="dark"]{
  --ground:#0D1418; --surface:#141E24; --surface-2:#18242B; --line:#26353D;
  --ink:#E3ECF0; --ink-2:#8CA3AF80; --muted:#93A7B2;
  --accent:#3FB6C6; --accent-soft:#3FB6C61F; --accent-line:#3FB6C659;
  --critical:#F1899B; --critical-soft:#F1899B1F;
  --warn:#E0AC63; --warn-soft:#E0AC631F;
  --ok:#6FC49E; --ok-soft:#6FC49E1F;
  --shadow:0 1px 2px #0006, 0 10px 28px -14px #0009;
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--ground); color:var(--ink);
  font:400 16px/1.6 "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1140px; margin:0 auto; padding:48px 24px 80px}
.eyebrow{
  font:500 12px/1 "IBM Plex Mono", ui-monospace, monospace; letter-spacing:.14em;
  text-transform:uppercase; color:var(--muted); display:flex; gap:14px; flex-wrap:wrap;
}
h1{
  font-weight:600; font-size:clamp(26px,3.4vw,38px); line-height:1.22; letter-spacing:-.02em;
  text-wrap:balance; margin:18px 0 0; max-width:34ch;
}
h1 b{color:var(--accent); font-weight:600}
.lede{margin:16px 0 0; color:var(--muted); max-width:62ch}
h2{
  font-weight:600; font-size:19px; letter-spacing:-.01em; margin:0;
}
section{margin-top:44px}
.shead{display:flex; align-items:baseline; justify-content:space-between; gap:16px; margin-bottom:14px}
.shead p{margin:0; color:var(--muted); font-size:14px; max-width:52ch}

/* stat tiles */
.tiles{display:grid; grid-template-columns:repeat(auto-fit,minmax(158px,1fr)); gap:12px; margin-top:28px}
.tile{
  background:var(--surface); border:1px solid var(--line); border-radius:10px;
  padding:16px 18px; box-shadow:var(--shadow);
}
.tile .n{
  font:600 30px/1 "IBM Plex Mono", ui-monospace, monospace; font-variant-numeric:tabular-nums;
  letter-spacing:-.02em; display:block;
}
.tile .k{display:block; margin-top:8px; font-size:12.5px; color:var(--muted); line-height:1.35}
.tile.sev .n{color:var(--critical)}
.tile.alt .n{color:var(--accent)}

/* controls */
.controls{
  display:flex; gap:10px; flex-wrap:wrap; align-items:center;
  background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:12px;
  position:sticky; top:0; z-index:5; box-shadow:var(--shadow);
}
.chips{display:flex; gap:6px; flex-wrap:wrap}
button.chip, select, input[type=search]{
  font:500 13px/1 "IBM Plex Sans", sans-serif; color:var(--ink);
  background:var(--surface-2); border:1px solid var(--line); border-radius:7px;
  padding:8px 12px; cursor:pointer;
}
button.chip[aria-pressed=true]{
  background:var(--accent-soft); border-color:var(--accent-line); color:var(--accent);
}
input[type=search]{cursor:text; min-width:190px; flex:1}
:focus-visible{outline:2px solid var(--accent); outline-offset:2px}

/* table */
.tablewrap{overflow-x:auto; border:1px solid var(--line); border-radius:10px; background:var(--surface); box-shadow:var(--shadow)}
table{border-collapse:collapse; width:100%; min-width:720px}
th,td{text-align:left; padding:12px 14px; border-bottom:1px solid var(--line)}
th{
  font:500 11.5px/1 "IBM Plex Mono", monospace; letter-spacing:.1em; text-transform:uppercase;
  color:var(--muted); background:var(--surface-2); white-space:nowrap;
}
td.num, th.num{text-align:right; font-family:"IBM Plex Mono",monospace; font-variant-numeric:tabular-nums}
tbody tr:last-child td{border-bottom:none}
tr.typerow{cursor:pointer}
tr.typerow:hover td{background:var(--accent-soft)}
tr.typerow td:first-child{font-weight:500}
.tname{display:flex; align-items:center; gap:9px}
.caret{
  width:0; height:0; border-left:5px solid currentColor; border-top:4px solid transparent;
  border-bottom:4px solid transparent; color:var(--muted); flex:none;
  transition:transform .16s ease;
}
tr.open .caret{transform:rotate(90deg)}
@media (prefers-reduced-motion:reduce){.caret{transition:none}}

/* badges */
.badge{
  display:inline-block; font:500 11.5px/1 "IBM Plex Mono",monospace; letter-spacing:.03em;
  padding:5px 8px; border-radius:5px; white-space:nowrap; border:1px solid transparent;
}
.cov-supported{background:var(--ok-soft); color:var(--ok); border-color:color-mix(in srgb,var(--ok) 34%,transparent)}
.cov-oauthMcp{background:var(--accent-soft); color:var(--accent); border-color:var(--accent-line)}
.cov-roadmap{background:var(--warn-soft); color:var(--warn); border-color:color-mix(in srgb,var(--warn) 34%,transparent)}
.cov-unsupported,.cov-unknown{background:var(--critical-soft); color:var(--critical); border-color:color-mix(in srgb,var(--critical) 34%,transparent)}
.path{
  display:inline-block; font:500 11px/1 "IBM Plex Mono",monospace; letter-spacing:.04em;
  padding:4px 7px; border-radius:4px; margin-right:5px; white-space:nowrap;
}
.path-cli{color:var(--accent); background:var(--accent-soft); border:1px solid var(--accent-line)}
.path-mcp{color:var(--muted); background:var(--surface-2); border:1px solid var(--line)}
.acc{font:500 12px/1 "IBM Plex Mono",monospace; padding:4px 7px; border-radius:4px; white-space:nowrap}
.acc-read{color:var(--muted); background:var(--surface-2)}
.acc-write{color:var(--accent); background:var(--accent-soft)}
.acc-delete{color:var(--warn); background:var(--warn-soft)}
.acc-admin{color:var(--critical); background:var(--critical-soft)}

/* drill-down */
tr.detail td{padding:0; background:var(--surface-2)}
tr.detail[hidden]{display:none}
.inner{padding:6px 14px 16px 32px}
.inner table{min-width:640px; background:transparent}
.inner th{background:transparent; border-bottom:1px solid var(--line)}
.inner td{border-bottom:1px dashed var(--line); padding:9px 12px; font-size:14px; vertical-align:top}
.rid{font-family:"IBM Plex Mono",monospace; font-size:13px}
.tools{color:var(--muted); font-size:13px; line-height:1.5; max-width:360px}
.inner td:last-child{white-space:nowrap}
.machines{font:500 11.5px/1 "IBM Plex Mono",monospace; color:var(--muted)}
.empty{padding:26px 16px; color:var(--muted); text-align:center; font-size:14.5px}

/* two-column panels */
.cols{display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px}
.panel{background:var(--surface); border:1px solid var(--line); border-radius:10px; padding:18px; box-shadow:var(--shadow)}
.panel h3{margin:0 0 4px; font-size:15px; font-weight:600}
.panel .why{margin:0 0 14px; color:var(--muted); font-size:13.5px; line-height:1.5}
.serverlist{margin:0; padding:0; list-style:none; display:flex; flex-wrap:wrap; gap:6px}
.serverlist li{
  font:400 12.5px/1 "IBM Plex Mono",monospace; padding:5px 8px; border-radius:5px;
  background:var(--surface-2); border:1px solid var(--line); color:var(--ink);
}
.serverlist li span{color:var(--muted)}

/* notes */
.note{
  border:1px solid var(--line); border-left:3px solid var(--warn); border-radius:8px;
  background:var(--surface); padding:18px 20px; box-shadow:var(--shadow);
}
.note h3{margin:0 0 10px; font-size:15px}
.note ul{margin:0; padding-left:20px; color:var(--muted); font-size:14px; line-height:1.65}
.note strong{color:var(--ink)}
footer{margin-top:44px; padding-top:20px; border-top:1px solid var(--line); color:var(--muted); font-size:13px}
</style>

<div class="wrap">
  <header>
    <div class="eyebrow"><span id="eb-customer"></span><span id="eb-date"></span><span id="eb-scope"></span></div>
    <h1 id="headline"></h1>
    <p class="lede" id="lede"></p>
    <div class="tiles" id="tiles"></div>
  </header>

  <section>
    <div class="shead">
      <h2>Resource types their agents reach</h2>
      <p>One row per integration decision. Select a row to see the individual resources behind it.</p>
    </div>
    <div class="controls">
      <div class="chips" role="group" aria-label="Filter by access">
        <button class="chip" data-acc="all" aria-pressed="true">All access</button>
        <button class="chip" data-acc="write" aria-pressed="false">Updates only</button>
        <button class="chip" data-acc="sev" aria-pressed="false">Admin &amp; delete</button>
        <button class="chip" data-acc="cli" aria-pressed="false">Direct CLI</button>
      </div>
      <select id="cov" aria-label="Filter by Apono coverage"></select>
      <input type="search" id="q" placeholder="Search type, resource or tool" aria-label="Search">
    </div>
    <div class="tablewrap" style="margin-top:12px">
      <table>
        <thead><tr>
          <th>Resource type</th><th>Apono coverage</th>
          <th class="num">Resources</th><th class="num">Machines</th>
          <th class="num">With updates</th><th class="num">Calls</th><th>Access path</th>
        </tr></thead>
        <tbody id="tbody"></tbody>
      </table>
    </div>
    <p class="empty" id="empty" hidden>Nothing matches those filters.</p>
  </section>

  <section>
    <div class="shead"><h2>MCP servers across the fleet</h2></div>
    <div class="cols">
      <div class="panel">
        <h3 id="shadow-h"></h3>
        <p class="why">Used by an agent but present in no local configuration file &mdash; claude.ai connectors, plugins and remotely provisioned servers. This is the part of the surface nobody inventoried.</p>
        <ul class="serverlist" id="shadow-l"></ul>
      </div>
      <div class="panel">
        <h3 id="idle-h"></h3>
        <p class="why">Configured and never used. Standing capability with no demonstrated need &mdash; the cheapest thing on this page to remove.</p>
        <ul class="serverlist" id="idle-l"></ul>
      </div>
    </div>
  </section>

  <section>
    <div class="shead"><h2>Machines in this assessment</h2></div>
    <div class="tablewrap">
      <table>
        <thead><tr><th>Machine</th><th>Scanned</th><th>Tool version</th><th>Redaction</th><th class="num">Resources</th><th class="num">Rows lost</th></tr></thead>
        <tbody id="mbody"></tbody>
      </table>
    </div>
  </section>

  <section>
    <div class="note">
      <h3>Read this before quoting the numbers</h3>
      <ul id="limits"></ul>
    </div>
  </section>

  <footer id="foot"></footer>
</div>

<script id="payload" type="application/json">__DATA__</script>
<script>
const D = JSON.parse(document.getElementById("payload").textContent);
const el = (t, cls, txt) => { const n = document.createElement(t); if (cls) n.className = cls;
  if (txt !== undefined) n.textContent = txt; return n; };
const COV_ORDER = { supported: 0, oauthMcp: 1, roadmap: 2, unsupported: 3, unknown: 4 };
const covLabel = { supported: "supported today", oauthMcp: "via OAuth MCP",
  roadmap: "on roadmap", unsupported: "not supported", unknown: "needs review" };

/* header ------------------------------------------------------------------ */
const S = D.summary;
document.getElementById("eb-customer").textContent = D.customer || "Agentic access assessment";
document.getElementById("eb-date").textContent = D.generated;
document.getElementById("eb-scope").textContent = S.machines + " machines";
const h = document.getElementById("headline");
h.appendChild(document.createTextNode("Their agents reach "));
h.appendChild(el("b", null, S.types + " types of corporate resource"));
h.appendChild(document.createTextNode(", and " + S.covered + " of those are within Apono\\u2019s coverage today."));
document.getElementById("lede").textContent =
  S.resources + " individual resources across " + S.machines + " machines. " +
  S.writeTypes + " of the " + S.types + " types saw updates rather than reads alone" +
  (S.admin || S.delete ? " \\u2014 including " + S.admin + " with admin actions and " + S.delete + " with deletes." : ".") +
  " " + S.cliOnly + " of the " + S.types + " types were reached only by a command-line tool, with no " +
  "MCP server anywhere in the path" +
  (S.mixedTypes
    ? ", and " + S.mixedTypes + " were reached both ways \u2014 a brokered path exists for those and is " +
      "being bypassed alongside it"
    : "") +
  ". That is " + S.cliResources + " resources and " + S.cliCalls + " calls no MCP-level tooling can see.";

const TILES = [
  ["types", "resource types reached", 0],
  ["resources", "individual resources", 0],
  ["cliOnly", "types reached only by direct CLI, no MCP server in the path", 2],
  ["mcpOnly", "types reached only through MCP servers", 0],
  ["mixedTypes", "types reached both ways \u2014 a brokered path exists and is bypassed", 2],
  ["writeTypes", "types with updates (create, update, delete or admin)", 0],
  ["severe", "resources with admin or delete", 1],
  ["shadow", "servers used but never configured", 0],
  ["idle", "servers configured but never used", 0],
];
const tiles = document.getElementById("tiles");
for (const [k, label, sev] of TILES) {
  const t = el("div", "tile" + (sev === 1 ? " sev" : sev === 2 ? " alt" : ""));
  t.appendChild(el("span", "n", String(S[k])));
  t.appendChild(el("span", "k", label));
  tiles.appendChild(t);
}

/* coverage filter -------------------------------------------------------- */
const cov = document.getElementById("cov");
cov.appendChild(new Option("All coverage tiers", "all"));
[...new Set(D.resourceTypes.map((t) => t.coverage))]
  .sort((a, b) => COV_ORDER[a] - COV_ORDER[b])
  .forEach((c) => cov.appendChild(new Option(covLabel[c] || c, c)));

/* type table ------------------------------------------------------------- */
const byType = {};
for (const r of D.resources) (byType[r.type] = byType[r.type] || []).push(r);
for (const k in byType) byType[k].sort((a, b) => b.calls - a.calls);

const tbody = document.getElementById("tbody");
let state = { acc: "all", cov: "all", q: "" };

function matchesRes(r) {
  if (state.acc === "write" && r.access === "read") return false;
  if (state.acc === "sev" && !["admin", "delete"].includes(r.access)) return false;
  if (state.acc === "cli" && !r.tools.some((t) => t.startsWith("CLI:"))) return false;
  if (state.q) {
    const hay = (r.id + " " + r.type + " " + r.tools.join(" ") + " " + r.machines.join(" ")).toLowerCase();
    if (!hay.includes(state.q)) return false;
  }
  return true;
}

function render() {
  tbody.textContent = "";
  let shown = 0;
  const types = [...D.resourceTypes].sort((a, b) =>
    COV_ORDER[a.coverage] - COV_ORDER[b.coverage] || b.calls - a.calls);
  for (const t of types) {
    if (state.cov !== "all" && t.coverage !== state.cov) continue;
    const kids = (byType[t.type] || []).filter(matchesRes);
    if (!kids.length) continue;
    shown++;

    const tr = el("tr", "typerow");
    tr.tabIndex = 0;
    tr.setAttribute("aria-expanded", "false");
    const c0 = el("td");
    const name = el("div", "tname");
    name.appendChild(el("span", "caret"));
    name.appendChild(el("span", null, t.type));
    c0.appendChild(name);
    tr.appendChild(c0);
    const c1 = el("td");
    c1.appendChild(el("span", "badge cov-" + t.coverage, covLabel[t.coverage] || t.coverage));
    tr.appendChild(c1);
    for (const v of [kids.length, t.machines, kids.filter((k) => k.access !== "read").length, t.calls])
      tr.appendChild(el("td", "num", String(v)));
    const pt = el("td");
    for (const p of t.paths || []) {
      const cls = p === "CLI" ? "path path-cli" : "path path-mcp";
      pt.appendChild(el("span", cls, p === "Built-in" ? "built-in" : p.toLowerCase()));
    }
    pt.title = t.tools + " distinct tools";
    tr.appendChild(pt);
    tbody.appendChild(tr);

    const det = el("tr", "detail");
    det.hidden = true;
    const dtd = el("td");
    dtd.colSpan = 7;
    const inner = el("div", "inner");
    const it = el("table");
    const thead = el("thead");
    const htr = el("tr");
    for (const [lbl, cls] of [["Resource", ""], ["Access", ""], ["Machines", ""],
                              ["Tools used", ""], ["Calls", "num"], ["Last seen", ""]])
      htr.appendChild(el("th", cls, lbl));
    thead.appendChild(htr);
    it.appendChild(thead);
    const itb = el("tbody");
    for (const r of kids) {
      const rtr = el("tr");
      rtr.appendChild(el("td", "rid", r.id));
      const at = el("td");
      at.appendChild(el("span", "acc acc-" + r.access,
        r.access === "read" ? "read only" : r.access === "write" ? "read + write" : r.access));
      rtr.appendChild(at);
      rtr.appendChild(el("td", "machines", r.machines.join(", ")));
      const MAXT = 4;
      const shownTools = r.tools.slice(0, MAXT).join("  \\u00b7  ")
        + (r.tools.length > MAXT ? "  \\u00b7  +" + (r.tools.length - MAXT) + " more tools" : "");
      rtr.appendChild(el("td", "tools", shownTools));
      rtr.appendChild(el("td", "num", String(r.calls)));
      rtr.appendChild(el("td", "machines", r.lastSeen));
      itb.appendChild(rtr);
    }
    it.appendChild(itb);
    inner.appendChild(it);
    dtd.appendChild(inner);
    det.appendChild(dtd);
    tbody.appendChild(det);

    const toggle = () => {
      const open = det.hidden;
      det.hidden = !open;
      tr.classList.toggle("open", open);
      tr.setAttribute("aria-expanded", String(open));
    };
    tr.addEventListener("click", toggle);
    tr.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  }
  document.getElementById("empty").hidden = shown > 0;
}
render();

for (const b of document.querySelectorAll("button.chip"))
  b.addEventListener("click", () => {
    state.acc = b.dataset.acc;
    for (const o of document.querySelectorAll("button.chip"))
      o.setAttribute("aria-pressed", String(o === b));
    render();
  });
cov.addEventListener("change", () => { state.cov = cov.value; render(); });
document.getElementById("q").addEventListener("input", (e) => {
  state.q = e.target.value.trim().toLowerCase(); render();
});

/* servers ---------------------------------------------------------------- */
function fillServers(hId, lId, list, heading) {
  document.getElementById(hId).textContent = list.length + " " + heading;
  const ul = document.getElementById(lId);
  for (const m of list.sort((a, b) => b.calls - a.calls)) {
    const li = el("li", null, m.server + " ");
    const machines = m.usedOn || m.configuredOn;
    li.appendChild(el("span", null,
      machines + (machines === 1 ? " machine" : " machines")
      + (m.calls ? "  \u00b7  " + m.calls + (m.calls === 1 ? " call" : " calls") : "  \u00b7  unused")));
    ul.appendChild(li);
  }
}
fillServers("shadow-h", "shadow-l", D.mcpServers.filter((m) => m.shadow), "servers in use, not in any config");
fillServers("idle-h", "idle-l", D.mcpServers.filter((m) => m.idle), "servers configured, never used");

/* machines --------------------------------------------------------------- */
const mb = document.getElementById("mbody");
for (const m of D.machines) {
  const tr = el("tr");
  tr.appendChild(el("td", null, m.machine));
  tr.appendChild(el("td", null, m.generated));
  tr.appendChild(el("td", null, "v" + m.version));
  tr.appendChild(el("td", null, m.saltBasis));
  tr.appendChild(el("td", "num", String(m.resources)));
  tr.appendChild(el("td", "num", m.truncatedRows ? String(m.truncatedRows) : "\\u2014"));
  mb.appendChild(tr);
}

/* limitations ------------------------------------------------------------ */
const ul = document.getElementById("limits");
for (const t of D.limitations) {
  const li = el("li");
  li.innerHTML = "";
  const parts = t.split("**");
  parts.forEach((p, i) => li.appendChild(i % 2 ? el("strong", null, p) : document.createTextNode(p)));
  ul.appendChild(li);
}
document.getElementById("foot").textContent = D.footer;
</script>
"""

# CLI and MCP are not exclusive: a type -- or a single resource -- can be reached both ways, and
# that mixed case is the most telling one. It means a brokered path exists and is being bypassed
# for the same kind of resource, so adding governance does not automatically capture the traffic.
def _paths(t): return set(t.get("paths", []))
cli_only = [t for t in types if _paths(t) == {"CLI"}]
mcp_only = [t for t in types if _paths(t) and "CLI" not in _paths(t)]
mixed_types = [t for t in types if {"CLI", "MCP"} <= _paths(t)]
cli_res = [r for r in res if any(t.startswith("CLI:") for t in r["tools"])]
mixed_res = [r for r in res
             if any(t.startswith("CLI:") for t in r["tools"])
             and any(t.startswith("MCP:") for t in r["tools"])]

summary = {
    "cliOnly": len(cli_only), "mcpOnly": len(mcp_only), "mixedTypes": len(mixed_types),
    "mixedResources": len(mixed_res),
    "cliResources": len(cli_res),
    "cliCalls": sum(t["calls"] for t in cli_only) + sum(t["calls"] for t in mixed_types),
    "machines": len(machines), "types": n_types, "resources": n_res,
    "writeTypes": write_types, "covered": covered,
    "admin": admin_n, "delete": delete_n, "severe": admin_n + delete_n,
    "shadow": len(shadow), "idle": len(idle),
}
limits = list(data.get("verifiedNotes", []))   # empirical findings override the generic caveats
if truncated:
    limits.append(f"**{truncated} rows are missing.** These machines ran an older version that "
                  f"capped each section of its report. Counts here are exact for the rows present "
                  f"and understate the true totals; re-run those machines to close the gap.")
skip_fp = any("salt" in n.lower() for n in data.get("verifiedNotes", []))
if skip_fp:
    pass
elif prints == {None}:
    limits.append("**Comparability is unverified.** These reports predate salt fingerprinting, so "
                  "nothing in them proves every machine used the same redaction salt. They matched "
                  "correctly if all used the default organization domain and none passed a custom salt.")
elif len(prints) > 1:
    limits.append("**Salt fingerprints differ between machines.** The same resource redacts "
                  "differently across them, so totals above over-count. Re-run with a consistent salt.")
else:
    limits.append("**All machines share one salt fingerprint**, so resources matched correctly across them.")
limits.append("**Resource names are redacted.** Types, access levels, tools, machine counts and "
              "dates are exact; the names behind the masked identifiers are not recoverable from this page.")
limits.append("**Machines are named as their own reports name them.** Where a report was run with "
              "redaction on, the hostname's person segment is masked but keeps its first and last "
              "letter, so a colleague can recognise the machine without the full name being written "
              "down. Nothing is masked a second time here.")
limits.append(f"**Coverage labels go stale.** {data['catalogNote']}")

payload = {
    "customer": data.get("customer"), "generated": data["generated"],
    "summary": summary, "resourceTypes": types, "resources": res,
    "mcpServers": mcp, "machines": machines, "limitations": limits,
    "footer": "Generated by agentic-discovery from per-machine reports. Read-only scans; no agent "
              "conversations, prompts, commands or file contents were collected.",
}
out = HTML.replace("__DATA__", json.dumps(payload).replace("</script", "<\\/script"))
open("assessment.html", "w", encoding="utf-8").write(out)
print(f"built assessment.html ({len(out)//1024} KB) - {n_types} types, {n_res} resources")
