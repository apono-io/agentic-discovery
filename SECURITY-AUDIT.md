# Security audit — agentic-discovery v0.6 → v0.7

Audited 2026-08-30, prior to first repository publication. Scope: `js/discover.mjs`,
`js/rules.json`, `js/package.json`. The frozen Python reference (`agentic_discovery.py`) is not a
distribution channel and was not audited.

## Threat model

The tool runs on a prospect employee's machine with that user's privileges and parses **agent
history, which is attacker-influenceable**: content planted by prompt injection ends up verbatim in
tool arguments, resource names, MCP server names and shell command text that this tool reads. The
report it produces is trusted by a security reviewer. The tool's core promises — read-only, no
network, identifiers only — are also claims to verify, not assume.

## Verified properties (static)

| Property | Result |
|---|---|
| Command execution (`child_process`, `exec`, `spawn`) | none |
| Dynamic code (`eval`, `new Function`, `vm`) | none |
| Network APIs (`http/https/net/tls/dgram`, `fetch`, WebSocket) | **none — the no-network claim holds in code** |
| Imports | `node:fs`, `node:path`, `node:os`, `node:crypto`, and `node:sqlite` (dynamic, read-only, optional) |
| Filesystem writes | exactly two: the `.md` report and the optional `.json` copy |
| Environment reads | `WSL_DISTRO_NAME`, `APPDATA`, `EMAIL`/`GIT_AUTHOR_EMAIL`/`GIT_COMMITTER_EMAIL` (salt), `DISCOVERY_WIN_ROOT` (test hook, read-only effect) |
| npm dependencies | **zero** (no supply chain beyond Node itself) |
| Config as code | `rules.json` carries regexes and paths only; it cannot introduce code execution |

## Findings and fixes (dynamic testing)

### F1 — Report injection via planted resource names (high, fixed)
A transcript entry crafted through prompt injection could carry a resource name like
`x| ALL SAFE ✅ | read-only | ... \n## Fake section` — which rendered as **forged table rows and a
fake section** in the report a security lead reads. Confirmed in redacted mode too (the revealed
last-4 characters can carry `|`), and via MCP server names, which are not redacted.
**Fix:** every field rendered into Markdown passes through `mdSafe()` — control characters and
newlines stripped, `|` → `¦`, backticks and line-leading structure neutralised. Retested: payloads
render as inert text inside a single cell; every table row has a uniform cell count. The `--json`
output intentionally keeps raw values (JSON encoding is injection-safe); consumers must treat them
as data.

### F2 — Symlink loop hangs the scan (medium, fixed)
A self-referencing directory symlink under a scanned tree caused unbounded recursion (verified
hang). **Fix:** the walker uses `lstat`, never follows symlinked directories, and caps depth at 16.
Retested: terminates in milliseconds.

### F3 — Report path symlink clobbers its target (low, fixed)
If a symlink already existed at the report's predictable output name, the write followed it and
overwrote the target file (verified). **Fix:** an existing file or symlink at the output path is
removed first and the report is created fresh with the exclusive-create flag. Retested: target
file untouched.

### F4 — Unbounded file reads (hardening, fixed)
`readFileSync` on an arbitrarily large file is an out-of-memory denial of service. Files larger
than 256 MB are now skipped.

### Tested and not vulnerable
- **ReDoS:** a 2 MB pathological line against the shell-extraction regexes processed in 0.14 s.
- **Prototype pollution:** parsed JSON is only read (aggregation state lives in `Map`s keyed by
  strings); no merge of untrusted objects into live objects.
- **SQLite:** stores are opened read-only, only when `node:sqlite` exists, wrapped in try/catch.

## Residual risks (accepted, documented)

- The report intentionally contains **derived identifiers**; redaction (default on) masks resource
  names, but MCP server names and tool names are shown in full and can themselves be sensitive.
  Open product decision.
- The **domain-based default salt** separates organizations but is guessable; `--salt` exists for
  assessments needing unguessable tags.
- `--no-redact` prints full names by design; the console warns before sharing that copy.
- Node itself is the runtime trust anchor for the npx channel; the binary channel must be built
  from tagged source and **signed/notarized** so end users are not trained to bypass OS warnings.

## Re-audit triggers

Any new parser in the `PARSERS` registry, any new rendered report field (must go through
`mdSafe`), any new write path (must go through `writeReport`), or any dependency added to
`package.json` (should stay at zero).
