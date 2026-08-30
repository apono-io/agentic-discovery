#!/usr/bin/env python3
"""
Agentic Access Discovery -- per-machine report (prototype v0.3)

What it does
  Scans this machine's LOCAL history of AI coding/desktop agents and produces ONE
  human-readable Markdown report:
    * which agent apps are present and actually used
    * which MCP servers are installed (configured) and which are actually used
    * which external resources agent actions reached (cloud, databases, SaaS, code, web)
    * what type of access each resource received (read / create / update / delete / admin)

Platforms
  macOS, Windows, Linux, and WSL. Inside WSL the scan covers BOTH sides: the Linux
  filesystem (where Claude Code / Codex usually live) and the Windows user profiles
  under /mnt/<drive>/Users/<name> (where Claude Desktop, Cursor and VS Code live).

Privacy
  READ-ONLY: changes nothing on the machine.  NO NETWORK: transmits nothing, ever.
  The report contains DERIVED IDENTIFIERS ONLY -- resource names/IDs, tool and agent
  names, action categories, timestamps, counts.  Prompts, conversation content, shell
  command text, tool arguments and files never appear in the report.  Classification
  happens locally; raw data never leaves the parser.
  You review the report first; sharing it is your explicit, manual choice.

Usage
  macOS / Linux / WSL:  python3 agentic_discovery.py [--out DIR] [--json]
  Windows:              py agentic_discovery.py [--out DIR] [--json]
"""
import json, os, re, sys, glob, socket, datetime

VERSION = "0.3"
HOME = os.path.expanduser("~")

# ---------------------------------------------------------------- scan profiles

def is_wsl():
    if not sys.platform.startswith("linux"):
        return False
    if os.environ.get("WSL_DISTRO_NAME"):
        return True
    try:
        return "microsoft" in open("/proc/version", errors="replace").read().lower()
    except OSError:
        return False

class Profile:
    """One filesystem 'side' to scan. Windows-side (via WSL) profiles use Windows layout."""
    def __init__(self, label, home, roaming, side):
        self.label = label          # "" for the local side; e.g. "Windows user 'dana' (via WSL)"
        self.home = home            # user home directory
        self.roaming = roaming      # APPDATA-equivalent (mac: ~/Library/Application Support)
        self.side = side            # "posix" | "windows"
    def tag(self, s):
        return f"{s} [{self.label}]" if self.label else s

def build_profiles():
    profs = []
    if sys.platform == "darwin":
        profs.append(Profile("", HOME, os.path.join(HOME, "Library", "Application Support"), "posix"))
    elif sys.platform == "win32":
        roaming = os.environ.get("APPDATA") or os.path.join(HOME, "AppData", "Roaming")
        profs.append(Profile("", HOME, roaming, "windows"))
    else:  # linux / wsl
        profs.append(Profile("", HOME, os.path.join(HOME, ".config"), "posix"))
        win_roots = []
        if is_wsl():
            win_roots += glob.glob("/mnt/*/Users/*")
        if os.environ.get("DISCOVERY_WIN_ROOT"):          # internal test hook
            win_roots.append(os.environ["DISCOVERY_WIN_ROOT"])
        for base in win_roots:
            name = os.path.basename(base.rstrip("/"))
            if name.lower() in ("public", "default", "default user", "all users", "desktop.ini"):
                continue
            roaming = os.path.join(base, "AppData", "Roaming")
            if not os.path.isdir(roaming):
                continue
            profs.append(Profile(f"Windows user '{name}' (via WSL)", base, roaming, "windows"))
    return profs

PROFILES = build_profiles()

# ---------------------------------------------------------------- classification

READ_VERBS   = ("get","list","search","fetch","read","describe","show","lookup","find",
                "status","check","view","count","head","tail","cat","download","query",
                "select","watch","log","logs","info","userinfo","atlassianuserinfo")
CREATE_VERBS = ("create","add","post","insert","upload","new","clone","copy","init")
UPDATE_VERBS = ("update","edit","set","write","put","patch","move","transition","merge",
                "push","change","rename","apply","scale","restart","transfer","assign",
                "reply","comment","resolve","submit","execute","run","start","stop")
DELETE_VERBS = ("delete","remove","drop","destroy","terminate","purge","truncate","close")
ADMIN_VERBS  = ("grant","revoke","admin","permission","invite","enable","disable",
                "install","uninstall","impersonate","authorize","deauthorize")

CONTROL_HINTS = ("iam","user","users","permission","role","grant","revoke","policy",
                 "setting","settings","config","admin","org","organization","workspace",
                 "member","token","credential","secret","key","account","auth")

SQL_CATS = [("admin", r"(?i)\b(drop|alter|grant|revoke)\b"),
            ("delete", r"(?i)\b(delete|truncate)\b"),
            ("update", r"(?i)\bupdate\b"),
            ("create", r"(?i)\binsert\b"),
            ("read",   r"(?i)^\s*(select|show|explain|describe|with)\b")]

def categorize(tool_name, args):
    """Action category from local evidence. Raw args are inspected LOCALLY only."""
    if isinstance(args, dict):
        ic = args.get("intent_category")
        if ic in ("read","create","update","delete","admin"):
            return ic
        for k in ("sql","query","statement","command_text"):
            v = args.get(k)
            if isinstance(v, str):
                for cat, rx in SQL_CATS:
                    if re.search(rx, v):
                        return cat
    t = re.sub(r"[^a-z]", " ", (tool_name or "").lower())
    words = t.split()
    joined = t.replace(" ", "")
    for cat, verbs in (("admin",ADMIN_VERBS),("delete",DELETE_VERBS),("create",CREATE_VERBS),
                       ("update",UPDATE_VERBS),("read",READ_VERBS)):
        if any(w in verbs for w in words) or any(joined.startswith(v) for v in verbs):
            return cat
    return "unknown"

def plane_of(tool_name, rid, rtype):
    txt = f"{tool_name} {rid} {rtype}".lower()
    return "control" if any(h in re.split(r"[^a-z]+", txt) for h in CONTROL_HINTS) else "data"

# ---------------------------------------------------------------- data model

RES = {}    # (rtype, rid) -> record
MCP = {}    # (agent, server) -> {"configured":bool,"used":0,"last":None,"tools":set(),"source":set()}
AGENTS = {} # agent -> {"installed":bool,"sessions":0,"actions":0,"first":None,"last":None,"gaps":[],"evidence":set()}
STATS = {"external": 0, "resolved": 0}

CLOUD_TYPES = {"aws","gcp","azure","oci","k8s"}
DB_TYPES = {"postgres","mysql","db-database","db-schema","db-table","db-warehouse","snowflake"}
SAAS_TYPES = {"atlassian-site","jira-project","confluence-space","confluence-page",
              "knowledge-collection","monday-board","slack-channel","notion","mixpanel","okta"}
CODE_TYPES = {"github-repo","github-org","git-remote"}

def res_group(rtype):
    if rtype in CLOUD_TYPES: return "Cloud"
    if rtype in DB_TYPES: return "Databases"
    if rtype in SAAS_TYPES: return "SaaS apps"
    if rtype in CODE_TYPES: return "Code hosting"
    if rtype == "web-domain": return "Web"
    return "Other"

def emit(rtype, rid, agent, via, tool, cat, ts):
    if not rid: return False
    rid = str(rid)[:80]
    r = RES.setdefault((rtype, rid), {"calls":0,"cats":set(),"planes":set(),"agents":set(),
                                      "via":set(),"first":None,"last":None})
    r["calls"] += 1; r["cats"].add(cat); r["agents"].add(agent); r["via"].add(via)
    r["planes"].add(plane_of(tool, rid, rtype))
    if ts:
        if r["first"] is None or ts < r["first"]: r["first"] = ts
        if r["last"]  is None or ts > r["last"]:  r["last"] = ts
    return True

def mcp_rec(agent, server):
    return MCP.setdefault((agent, server), {"configured":False,"used":0,"last":None,
                                            "tools":set(),"source":set()})

def agent_rec(agent):
    return AGENTS.setdefault(agent, {"installed":False,"sessions":0,"actions":0,
                                     "first":None,"last":None,"gaps":[],"evidence":set()})

def add_gap(agent, gap):
    a = agent_rec(agent)
    if gap not in a["gaps"]:
        a["gaps"].append(gap)

def note_ts(agent, ts):
    a = agent_rec(agent)
    if ts:
        if a["first"] is None or ts < a["first"]: a["first"] = ts
        if a["last"]  is None or ts > a["last"]:  a["last"] = ts

# ---------------------------------------------------------------- arg extraction

def domain_of(url):
    m = re.match(r"(?:https?://)?([\w.-]+\.[a-z]{2,})(?::\d+)?(?:/|$)", str(url).strip())
    return m.group(1).lower().split("@")[-1] if m else None

def walk(d, out):
    if isinstance(d, dict):
        for k, v in d.items():
            if isinstance(v, (dict, list)): walk(v, out)
            else: out.append((k, v))
    elif isinstance(d, list):
        for v in d: walk(v, out)

KEY_RULES = [
    (("cloudid",), "atlassian-site"),
    (("issueidorkey","issuekey"), "jira-project"),
    (("projectkey","projectkeyorid"), "jira-project"),
    (("spacekey","spaceid"), "confluence-space"),
    (("pageid",), "confluence-page"),
    (("repo","repository"), "github-repo"),
    (("owner","org","organization"), "github-org"),
    (("database","db_name","dbname"), "db-database"),
    (("schema",), "db-schema"),
    (("table","table_name"), "db-table"),
    (("warehouse",), "db-warehouse"),
    (("collection",), "knowledge-collection"),
    (("board_id","boardid"), "monday-board"),
    (("channel","channel_id"), "slack-channel"),
    (("bucket",), "aws"),
    (("cluster","namespace"), "k8s"),
]

def extract_args(args, agent, via, tool, cat, ts):
    flat = []; walk(args, flat); hit = False
    for k, v in flat:
        if v in (None,"",[],{}): continue
        kl = k.lower(); vs = str(v)
        if kl in ("issueidorkey","issuekey"):
            m = re.match(r"^([A-Z][A-Z0-9]+)-\d+", vs)
            if m: hit |= emit("jira-project", m.group(1), agent, via, tool, cat, ts); continue
        matched = False
        for keys, rtype in KEY_RULES:
            if kl in keys:
                hit |= emit(rtype, vs, agent, via, tool, cat, ts); matched = True; break
        if matched: continue
        if kl in ("url","uri","endpoint","host","hostname"):
            dom = domain_of(vs)
            if dom: hit |= emit("web-domain", dom, agent, via, tool, cat, ts)
    return hit

# ---------------------------------------------------------------- shell extraction

AWS_READ = ("describe","get","list","ls")
def cli_cat(op, extra_write=()):
    op = (op or "").lower()
    if op.startswith(AWS_READ): return "read"
    if op.startswith(("create","put","run","start","add","attach")) or op in extra_write: return "create"
    if op.startswith(("update","modify","set","tag","scale","apply","restart")): return "update"
    if op.startswith(("delete","terminate","remove","rm","detach")): return "delete"
    if op.startswith(("grant","revoke","enable","disable")): return "admin"
    return "unknown"

SHELL_RULES = [
    ("aws",     re.compile(r"(?:^|[;&|(]\s*)aws\s+([a-z0-9-]+)\s+([a-z0-9-]+)"),
                lambda m: ("aws", f"aws:{m[0]}", cli_cat(m[1]))),
    ("gcloud",  re.compile(r"(?:^|[;&|(]\s*)gcloud\s+([a-z0-9-]+)\s+(?:[a-z0-9-]+\s+)?([a-z0-9-]+)"),
                lambda m: ("gcp", f"gcp:{m[0]}", cli_cat(m[1]))),
    ("az",      re.compile(r"(?:^|[;&|(]\s*)az\s+([a-z0-9-]+)\s+([a-z0-9-]+)"),
                lambda m: ("azure", f"azure:{m[0]}", cli_cat(m[1]))),
    ("oci",     re.compile(r"(?:^|[;&|(]\s*)oci\s+([a-z0-9-]+)\s+([a-z0-9-]+)(?:\s+([a-z0-9-]+))?"),
                lambda m: ("oci", f"oci:{m[0]}", cli_cat(m[2] or m[1]))),
    ("kubectl", re.compile(r"\bkubectl\s+([a-z-]+)(?:[^\n;|]*?(?:-n|--namespace)[= ]([\w-]+))?"),
                lambda m: ("k8s", f"k8s-ns:{m[1]}" if m[1] else "k8s:cluster", cli_cat(m[0]))),
    ("psql",    re.compile(r"\bpsql\b[^\n;|]*?(?:-h[= ]?|--host[= ])([\w.-]+)"),
                lambda m: ("postgres", m[0], "unknown")),
    ("mysql",   re.compile(r"\bmysql\b[^\n;|]*?(?:-h[= ]?|--host[= ])([\w.-]+)"),
                lambda m: ("mysql", m[0], "unknown")),
    ("gh",      re.compile(r"\bgh\s+(pr|issue|repo|api|release)\s+([a-z]+)?[^\n;|]*?(?:(?:-R|--repo)[= ]([\w.-]+/[\w.-]+)|repos/([\w.-]+/[\w.-]+))"),
                lambda m: ("github-repo", m[2] or m[3], cli_cat(m[1] or "get", extra_write=("merge","comment","edit")))),
    ("git",     re.compile(r"\bgit\b[^\n;|]*\b(clone|push|pull|fetch)\b[^\n;|]*?((?:https?://|git@)[^\s\"']+)"),
                lambda m: ("git-remote", domain_of(m[1].replace("git@","https://").replace(".com:",".com/")),
                           "update" if m[0]=="push" else "read")),
    ("curl",    re.compile(r"\bcurl\b([^\n;|]*?)(https?://[^\s\"')]+)"),
                lambda m: ("web-domain", domain_of(m[1]),
                           {"post":"create","put":"update","patch":"update","delete":"delete"}.get(
                               (re.search(r"-X\s*(\w+)", m[0], re.I) or [None,"get"])[1].lower(), "read"))),
]

def handle_shell(cmd, agent, ts):
    hit = False
    for _, rx, fn in SHELL_RULES:
        for m in rx.findall(cmd or ""):
            if isinstance(m, str): m = (m,)
            try: rtype, rid, cat = fn(m)
            except Exception: continue
            if rid: hit |= emit(rtype, rid, agent, "CLI (shell)", "shell", cat, ts)
    if hit:
        STATS["external"] += 1; STATS["resolved"] += 1

# ---------------------------------------------------------------- tool handling

LOCAL_BUILTINS = {"read","edit","write","glob","grep","task","todowrite","todoread",
                  "askuserquestion","exitplanmode","enterplanmode","notebookedit","monitor",
                  "toolsearch","skill","artifact","listagents","sendmessage","workflow",
                  "reportfindings","schedulewakeup","senduserfile","structuredoutput"}
INFRA_SERVERS = {"workspace","cowork","visualize","ccd_session","ccd_directory","session_info",
                 "plugins","mcp-registry","scheduled-tasks","claude_preview","terminal",
                 "cowork-onboarding","plugin_apono-agentic_apono-feedback"}
BROWSER_SERVERS = {"claude_in_chrome","claude-in-chrome","claude_browser"}
GATEWAY_ALIASES = {"apono-agentic-local","apono-agentic-remote","apono","apono_mcp","apono_prod",
                   "apono-agentic","apono-gateway","apono_gw","apono_staging","apono-prod"}
GATEWAY_CONTROL_TOOLS = {"ask_access_assistant","create_access_request","get_request_details",
                         "list_available_resources","list_resources_filtered",
                         "_proxy__setup_target","_proxy__list_targets"}
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.I)

def handle_tool(agent, name, args, ts):
    agent_rec(agent)["actions"] += 1; note_ts(agent, ts)
    lname = (name or "").lower()
    if lname in ("bash","exec_command","shell","local_shell") or lname.endswith("__bash"):
        handle_shell((args or {}).get("command") or (args or {}).get("cmd") or "", agent, ts)
        return
    if lname in ("webfetch","web_fetch"):
        STATS["external"] += 1
        dom = domain_of((args or {}).get("url",""))
        if dom:
            emit("web-domain", dom, agent, "built-in web", name, "read", ts); STATS["resolved"] += 1
        return
    server = tool = None
    if name and name.startswith("mcp__"):
        p = name.split("__", 2); server, tool = p[1], (p[2] if len(p) > 2 else "?")
    elif name and "." in name and not name.startswith("_"):
        server, tool = name.split(".", 1)
    if server is None:
        return  # built-in / local tool
    label = f"connector:{server[:8]}... (unidentified)" if UUID_RE.match(server) else server
    sl = server.lower()
    rec = mcp_rec(agent, label + (" (session tooling)" if sl in INFRA_SERVERS else ""))
    rec["used"] += 1; rec["tools"].add(tool[:40])
    if ts and (rec["last"] is None or ts > rec["last"]): rec["last"] = ts
    if sl in INFRA_SERVERS:
        if tool == "bash":
            handle_shell((args or {}).get("command") or "", agent, ts)
        elif tool == "web_fetch":
            dom = domain_of((args or {}).get("url",""))
            if dom:
                STATS["external"] += 1; STATS["resolved"] += 1
                emit("web-domain", dom, agent, "built-in web", tool, "read", ts)
        return
    if sl in BROWSER_SERVERS:
        flat = []; walk(args or {}, flat); found = False
        for k, v in flat:
            if k == "url" and domain_of(v):
                found |= emit("web-domain", domain_of(v), agent, "browser", tool, "read", ts)
        if found:
            STATS["external"] += 1; STATS["resolved"] += 1
        return
    if sl in GATEWAY_ALIASES and tool in GATEWAY_CONTROL_TOOLS:
        return  # gateway control plane, not resource access
    STATS["external"] += 1
    cat = categorize(tool, args if isinstance(args, dict) else {})
    inner_tool = tool
    if isinstance(args, dict) and "tool_name" in args:  # gateway-style wrapper
        m = re.match(r"apn_[0-9a-f]+__(.+)", str(args.get("tool_name","")))
        if m:
            inner_tool = m.group(1)
            raw = args.get("arguments")
            if isinstance(raw, str):
                for parse in (lambda s: json.loads(s), lambda s: json.loads(s.replace("'", '"'))):
                    try: raw = parse(raw); break
                    except Exception: pass
            if categorize(inner_tool, raw if isinstance(raw, dict) else {}) != "unknown":
                cat = categorize(inner_tool, raw if isinstance(raw, dict) else {})
            if isinstance(raw, dict) and extract_args(raw, agent, f"{label} > {inner_tool}"[:60], inner_tool, cat, ts):
                STATS["resolved"] += 1; return
    if isinstance(args, dict) and extract_args(args, agent, f"{label} > {inner_tool}"[:60], inner_tool, cat, ts):
        STATS["resolved"] += 1

# ---------------------------------------------------------------- host scanners

def parse_claude_stream(path, agent):
    agent_rec(agent)["sessions"] += 1
    try:
        with open(path, errors="replace") as fh:
            for line in fh:
                try: d = json.loads(line)
                except Exception: continue
                if d.get("type") != "assistant": continue
                msg = d.get("message")
                if not isinstance(msg, dict): continue
                for c in msg.get("content") or []:
                    if isinstance(c, dict) and c.get("type") == "tool_use":
                        handle_tool(agent, c.get("name",""), c.get("input") or {},
                                    d.get("timestamp") or d.get("_audit_timestamp"))
    except OSError:
        pass

def load_json(path):
    try:
        with open(path, encoding="utf-8", errors="replace") as fh: return json.load(fh)
    except Exception:
        return None

def scan_claude_code(prof):
    a = agent_rec("Claude Code")
    cfg = load_json(os.path.join(prof.home, ".claude.json"))
    if cfg is not None or os.path.isdir(os.path.join(prof.home, ".claude")):
        a["installed"] = True; a["evidence"].add(prof.tag("~/.claude"))
    if cfg:
        for s in (cfg.get("mcpServers") or {}):
            r = mcp_rec("Claude Code", s); r["configured"] = True; r["source"].add(prof.tag("global config"))
        for proj, pc in (cfg.get("projects") or {}).items():
            for s in (pc.get("mcpServers") or {}):
                r = mcp_rec("Claude Code", s); r["configured"] = True; r["source"].add(prof.tag("project config"))
            pm = load_json(os.path.join(proj, ".mcp.json"))
            if pm:
                for s in (pm.get("mcpServers") or {}):
                    r = mcp_rec("Claude Code", s); r["configured"] = True; r["source"].add(prof.tag(".mcp.json"))
    for f in glob.glob(os.path.join(prof.home, ".claude", "projects", "**", "*.jsonl"), recursive=True):
        parse_claude_stream(f, "Claude Code")

def scan_claude_desktop(prof):
    a = agent_rec("Claude Desktop")
    base = os.path.join(prof.roaming, "Claude")
    cfg = load_json(os.path.join(base, "claude_desktop_config.json"))
    if cfg is not None or os.path.isdir(base):
        a["installed"] = True; a["evidence"].add(prof.tag("Claude app data"))
    if cfg:
        for s in (cfg.get("mcpServers") or {}):
            r = mcp_rec("Claude Desktop", s); r["configured"] = True; r["source"].add(prof.tag("desktop config"))
    extdir = os.path.join(base, "Claude Extensions")
    if os.path.isdir(extdir):
        for mf in glob.glob(os.path.join(extdir, "*", "manifest.json")):
            m = load_json(mf) or {}
            nm = m.get("name") or os.path.basename(os.path.dirname(mf))
            r = mcp_rec("Claude Desktop", nm); r["configured"] = True; r["source"].add(prof.tag("desktop extension"))
    for f in glob.glob(os.path.join(base, "local-agent-mode-sessions", "**", "audit.jsonl"), recursive=True):
        parse_claude_stream(f, "Claude Desktop")
    if a["installed"]:
        add_gap("Claude Desktop",
                "Chat-mode conversations and claude.ai remote connectors are stored server-side "
                "and leave no local trace; only agent-mode sessions are covered.")

def scan_codex(prof):
    a = agent_rec("Codex")
    cfgp = os.path.join(prof.home, ".codex", "config.toml")
    if os.path.isfile(cfgp):
        a["installed"] = True; a["evidence"].add(prof.tag("~/.codex"))
        try:
            txt = open(cfgp, errors="replace").read()
            for m in re.finditer(r"^\[mcp_servers\.([^\].]+)\]", txt, re.M):
                r = mcp_rec("Codex", m.group(1)); r["configured"] = True; r["source"].add(prof.tag("config.toml"))
        except OSError:
            pass
    for f in glob.glob(os.path.join(prof.home, ".codex", "sessions", "**", "*.jsonl"), recursive=True):
        a["sessions"] += 1
        try:
            with open(f, errors="replace") as fh:
                for line in fh:
                    try: d = json.loads(line)
                    except Exception: continue
                    p = d.get("payload") or {}
                    if d.get("type") == "response_item" and p.get("type") == "function_call":
                        try: args = json.loads(p.get("arguments") or "{}")
                        except Exception: args = {}
                        handle_tool("Codex", p.get("name",""), args, d.get("timestamp"))
        except OSError:
            pass
    if a["installed"]:
        add_gap("Codex", "Codex keeps a limited local session history (about a week observed); "
                         "older activity is not visible.")

def scan_cursor(prof):
    a = agent_rec("Cursor")
    cdir = os.path.join(prof.home, ".cursor")
    if os.path.isdir(cdir):
        a["installed"] = True; a["evidence"].add(prof.tag("~/.cursor"))
    cfg = load_json(os.path.join(cdir, "mcp.json"))
    if cfg:
        for s in (cfg.get("mcpServers") or {}):
            r = mcp_rec("Cursor", s); r["configured"] = True; r["source"].add(prof.tag("mcp.json"))
    db = os.path.join(prof.roaming, "Cursor", "User", "globalStorage", "state.vscdb")
    convs = 0
    if os.path.isfile(db):
        a["installed"] = True; a["evidence"].add(prof.tag("Cursor app data"))
        try:
            import sqlite3
            con = sqlite3.connect(f"file:{db}?mode=ro&immutable=1", uri=True)
            for (val,) in con.execute("select value from cursorDiskKV where key like 'composerData%'"):
                try: j = json.loads(val)
                except Exception: continue
                if j.get("conversationMap"):
                    convs += 1
            con.close()
        except Exception:
            add_gap("Cursor", "Cursor's local store could not be read on this machine.")
    a["sessions"] += convs
    if a["installed"]:
        add_gap("Cursor", "Cursor's conversation store is undocumented; per-tool usage is not "
                          "extracted in this version -- configured MCP servers and conversation "
                          "count only.")

def scan_copilot(prof):
    a = agent_rec("GitHub Copilot")
    checks = [
        (os.path.join(prof.home, ".vscode", "extensions", "github.copilot-*"), "VS Code extension"),
        (os.path.join(prof.home, ".vscode-insiders", "extensions", "github.copilot-*"), "VS Code Insiders extension"),
        (os.path.join(prof.home, ".vscode-server", "extensions", "github.copilot-*"), "VS Code (WSL remote) extension"),
        (os.path.join(prof.home, ".copilot"), "Copilot CLI"),
        (os.path.join(prof.home, ".local", "share", "gh", "extensions", "gh-copilot"), "gh copilot extension"),
    ]
    for pat, ev in checks:
        if glob.glob(pat) if "*" in pat else os.path.exists(pat):
            a["installed"] = True; a["evidence"].add(prof.tag(ev))
    for cfgp, src in [
        (os.path.join(prof.roaming, "Code", "User", "mcp.json"), "VS Code user mcp.json"),
        (os.path.join(prof.home, ".copilot", "mcp-config.json"), "Copilot CLI mcp-config.json"),
    ]:
        cfg = load_json(cfgp) or {}
        for s in (cfg.get("servers") or cfg.get("mcpServers") or {}):
            r = mcp_rec("GitHub Copilot", s); r["configured"] = True; r["source"].add(prof.tag(src))
    if a["installed"]:
        add_gap("GitHub Copilot", "Copilot tool-call history is not readable locally in this "
                                  "version; presence and configured MCP servers only.")

# ---------------------------------------------------------------- report

def fmt_ts(ts):
    return str(ts)[:10] if ts else "-"

def access_summary(cats):
    c = cats - {"unknown"}
    if not c: return "unclassified"
    if c == {"read"}: return "read-only"
    if "admin" in c: return "includes ADMIN"
    if c & {"delete"}: return "includes DELETE"
    if c & {"create","update"}: return "read+write" if "read" in c else "write"
    return "+".join(sorted(c))

def platform_line():
    if sys.platform == "darwin": return "macOS"
    if sys.platform == "win32": return "Windows"
    if is_wsl():
        sides = [p.label for p in PROFILES if p.label]
        return "WSL (Linux side" + (f" + {len(sides)} Windows profile(s): " + "; ".join(sides) if sides else "") + ")"
    return "Linux"

def build_report():
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    host = socket.gethostname()
    L = []; add = L.append
    used_agents = [k for k, v in AGENTS.items() if v["actions"]]
    n_res = len([1 for (t, _), r in RES.items() if t != "web-domain"])
    writes = len([1 for r in RES.values() if r["cats"] & {"create","update","delete","admin"}])
    n_mcp_used = len([1 for r in MCP.values() if r["used"]])
    add(f"# Agentic Access Report -- {host}")
    add("")
    add(f"*Generated {now} on {platform_line()} | agentic_discovery v{VERSION} | "
        f"read-only scan | nothing was transmitted*")
    add("")
    add("## Summary")
    add("")
    add(f"On this machine, **{len(used_agents)} agent app(s)** show real activity. Their agents "
        f"used **{n_mcp_used} MCP server(s)** and reached **{n_res} external resources** "
        f"(plus {len(RES)-n_res} web domains); **{writes} resources received changes or "
        f"privileged actions** (create/update/delete/admin).")
    ext, res = STATS["external"], STATS["resolved"]
    if ext:
        add(f"Resource identification rate: {res}/{ext} externally-reaching actions "
            f"({100*res//max(ext,1)}%).")
    add("")
    add("## Agent apps on this machine")
    add("")
    add("| Agent | Present | Activity found | Sessions | Activity window | Found at |")
    add("|---|---|---|---|---|---|")
    for name in ("Claude Code","Claude Desktop","Codex","Cursor","GitHub Copilot"):
        a = AGENTS.get(name) or {}
        present = "yes" if a.get("installed") else "no"
        act = (f"{a.get('actions',0)} actions" if a.get("actions")
               else ("conversations only" if a.get("sessions") else "none found"))
        win = f"{fmt_ts(a.get('first'))} to {fmt_ts(a.get('last'))}" if a.get("first") else "-"
        ev = ", ".join(sorted(a.get("evidence") or [])) or "-"
        add(f"| {name} | {present} | {act} | {a.get('sessions',0) or '-'} | {win} | {ev} |")
    add("")
    add("## MCP servers -- installed vs. actually used")
    add("")
    add("| Agent | MCP server | Installed (configured) | Actually used | Calls | Last used |")
    add("|---|---|---|---|---|---|")
    for (agent, server), r in sorted(MCP.items(), key=lambda kv: (-kv[1]["used"], kv[0])):
        cfg = "yes (" + ", ".join(sorted(r["source"])) + ")" if r["configured"] else "no (seen in history only)"
        add(f"| {agent} | {server} | {cfg} | {'yes' if r['used'] else 'NO -- configured but never used'} "
            f"| {r['used'] or '-'} | {fmt_ts(r['last'])} |")
    if not MCP:
        add("| - | - | - | - | - | - |")
    add("")
    add("## External resources accessed")
    add("")
    groups = {}
    for (rtype, rid), r in RES.items():
        groups.setdefault(res_group(rtype), []).append((rtype, rid, r))
    for gname in ("Cloud","Databases","SaaS apps","Code hosting","Other","Web"):
        rows = groups.get(gname)
        if not rows: continue
        rows.sort(key=lambda x: -x[2]["calls"])
        add(f"### {gname}")
        add("")
        add("| Resource | Type | Access | Categories seen | Calls | Agents | Last seen |")
        add("|---|---|---|---|---|---|---|")
        limit = 20 if gname != "Web" else 15
        for rtype, rid, r in rows[:limit]:
            cats = ", ".join(sorted(r["cats"] - {"unknown"})) or "unclassified"
            add(f"| `{rid}` | {rtype} | **{access_summary(r['cats'])}** | {cats} | {r['calls']} "
                f"| {', '.join(sorted(r['agents']))} | {fmt_ts(r['last'])} |")
        if len(rows) > limit:
            add(f"| ...and {len(rows)-limit} more | | | | | | |")
        add("")
    add("## Coverage notes & known gaps")
    add("")
    for name, a in AGENTS.items():
        for g in a["gaps"]:
            add(f"- **{name}:** {g}")
    add("- Access types are classified locally from tool names and command verbs; "
        "\"unclassified\" means no safe determination could be made -- it is never guessed.")
    if is_wsl():
        add("- This WSL scan covered the Linux filesystem and the Windows user profiles listed "
            "above. A Windows-side scan cannot see other WSL distros; run the script inside "
            "each distro that has agent activity.")
    if sys.platform == "win32":
        add("- This Windows scan does not see inside WSL distros. If agents run in WSL "
            "(e.g. Claude Code), run the same script inside WSL too: python3 agentic_discovery.py")
    add("")
    add("## What this report does and does not contain")
    add("")
    add("- Contains: resource identifiers, tool/MCP/agent names, action categories, timestamps, counts.")
    add("- Does NOT contain: prompts, conversation content, shell command text, tool arguments, "
        "file contents, secrets, or personal data.")
    add("- This scan was read-only and made no network connections. Sharing this file is your choice.")
    add("")
    return "\n".join(L)

def say(msg):
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"))

def main():
    out_dir = "."
    want_json = "--json" in sys.argv
    if "--out" in sys.argv:
        out_dir = sys.argv[sys.argv.index("--out") + 1]
    say(f"Agentic Access Discovery v{VERSION} on {platform_line()}")
    say("Read-only scan, no network. Scanning...")
    for prof in PROFILES:
        for scan in (scan_claude_code, scan_claude_desktop, scan_codex, scan_cursor, scan_copilot):
            try:
                scan(prof)
            except Exception as e:
                say(f"  note: {scan.__name__} skipped for {prof.label or 'local'} ({type(e).__name__})")
    report = build_report()
    stamp = datetime.datetime.now().strftime("%Y%m%d")
    base = os.path.join(out_dir, f"agentic-access-report-{socket.gethostname().split('.')[0]}-{stamp}")
    with open(base + ".md", "w", encoding="utf-8") as fh:
        fh.write(report)
    say(f"\nReport written to: {base}.md")
    if want_json:
        def clean(v): return sorted(v) if isinstance(v, set) else v
        j = {"version": VERSION, "platform": platform_line(),
             "agents": {k: {kk: clean(vv) for kk, vv in v.items()} for k, v in AGENTS.items()},
             "mcp": [{"agent": a, "server": s, **{kk: clean(vv) for kk, vv in r.items()}}
                     for (a, s), r in MCP.items()],
             "resources": [{"type": t, "id": i, **{kk: clean(vv) for kk, vv in r.items()}}
                           for (t, i), r in RES.items()]}
        with open(base + ".json", "w", encoding="utf-8") as fh:
            json.dump(j, fh, indent=1, default=str)
        say(f"Machine-readable copy:  {base}.json")
    say("Review the report, then share it manually if you choose to. Nothing was sent anywhere.")

if __name__ == "__main__":
    main()
