# Maintainers' guide

End-user documentation is in [README.md](README.md). This file is for people changing the tool.

## Shape of the thing

One codebase, two distribution channels, and a deliberate split between **lean runner code** and
**rich configuration**:

| File | Role | Changes how often |
|---|---|---|
| `js/discover.mjs` | the runner — path resolution, file walking, extraction engine, report rendering | rarely |
| `js/rules.json` | everything that churns — host locations, extraction rules, category maps, report copy | constantly |
| `js/package.json` | npm packaging for the `npx` channel | rarely |
| `agentic_discovery.py` | **frozen** Python reference (v0.3) the JS port was parity-tested against | not maintained |

The rule of thumb: **if you are editing `discover.mjs` to add coverage, stop and check whether it
belongs in `rules.json` instead.** Almost always it does.

## Adding a new agent platform

Normally a `rules.json` edit with **no code change**. Append an entry to `hosts`:

```jsonc
{
  "name": "Some New IDE",
  "presence":   [ { "root": "home",    "path": [".newide"], "evidence": "~/.newide" } ],
  "mcpConfigs": [ { "root": "home",    "path": [".newide", "mcp.json"],
                    "jsonKeys": ["mcpServers", "servers"], "label": "newide mcp.json" } ],
  "transcripts":[ { "root": "roaming", "path": ["NewIDE", "sessions"], "suffix": ".jsonl",
                    "parser": "claudeStream" } ],
  "gap": "Anything this platform hides from us, stated plainly in the report."
}
```

- `root` is `home` or `roaming`. `roaming` resolves per OS: `~/Library/Application Support` (macOS),
  `%APPDATA%` (Windows), `~/.config` (Linux) — so one entry covers every platform.
- `path` segments may contain `*` to glob.
- Source kinds available without code: plain JSON (`jsonKeys`), TOML sections
  (`tomlSectionRegex`), a directory of extension manifests (`manifestDir`), per-server metadata
  files whose name is inside the file (`nameKeys`), and per-project expansion (`expandProjects`).
- `disabledFlagKey` marks servers that are configured but switched off.

**Code is only needed for a genuinely new log format**, which means one new entry in the `PARSERS`
registry in `discover.mjs` (~20 lines). Existing parsers: `claudeStream` (JSONL with `tool_use`
blocks), `codexStream` (JSONL `response_item` / `function_call`), `vscodeSqliteSessions` (SQLite
key-value session stores). Once added, a parser is available to every future platform by config.

Google Antigravity was added end-to-end as a config-only change — use it as the worked example.

## Extraction rules

- `keyRules` map an argument key to a resource type. Keys are matched with separators stripped, so
  `pageId` / `page_id` / `pageid` are the same key. Scope a rule to a vendor with `whenTool`
  (a regex on the tool name) — this is what keeps Notion's `page_id` from being read as a
  Confluence page. **Scoped rules must appear before generic ones**; first match wins.
- `valueExtract` pulls an id out of a larger string (e.g. a page id out of a full URL) and
  `stripChars` canonicalises it, so one resource does not appear as two rows.
- `serviceRules` are the fallback: a call that reaches a known service but names no specific
  resource still records the service itself. Without this, `notion-search` would vanish entirely.
- `connectorFingerprints` name claude.ai connectors, which appear only as opaque UUIDs, by their
  tool-name signature.
- `shellRules` extract CLI access. Each needs `bin` (the command name), because a rule only fires
  when its binary is the **first token of a command segment**.

### The precision rule that matters most

Command text is only treated as executed when it sits at a command position. Heredoc bodies are
stripped, the command is split quote-aware, and a CLI counts only as the first token of a segment
(recursing into real `sh -c` / `zsh -lc` bodies, never into `python3 -c` or prompt strings).

This exists because the naive version reported `az vm delete` and `oci compute instance list` as
real cloud access when they were only strings inside a test script. **Over-reporting is far worse
than under-reporting here** — telling a prospect their agent deleted a VM that it never touched
destroys the credibility of the whole report. Keep this bias when adding rules.

## Redaction

On by default. Types, tools, access categories and counts stay exact; resource **names** are
masked. Long names show their last 4 characters, short names are masked entirely, and every entry
carries a short one-way hash tag.

The tag is not decoration — it does two jobs:

1. **Distinctness**: two names can share their last 4 characters.
2. **Consolidation**: the same resource must redact identically on every machine, or per-machine
   reports cannot be merged.

Salt defaults to the organization's email domain (from the Claude account file, then git config,
then environment), so machines in one organization agree without anyone distributing a secret.
A domain is public, so it is **namespace separation, not secrecy** — `--salt <secret>` is the
option for assessments where short names must be unguessable. Whatever was used is stated in the
report header.

Anything added to the report that contains a customer identifier must go through `redactRid()`.

## Building and publishing

```bash
# binaries — same source as the npx channel
deno compile -o agentic-discovery --allow-read --allow-write --allow-env \
  --include js/rules.json js/discover.mjs
# cross-compile with --target for mac arm64/x64, windows, linux
# or: bun build --compile js/discover.mjs --outfile agentic-discovery
```

Sign and notarize release binaries under the 1Password/Apono certificates before distribution —
an unsigned binary triggers exactly the Gatekeeper and SmartScreen warnings that destroy trust in
a pre-contract assessment.

`node:sqlite` (Node 22+) is used opportunistically for VS Code-family session stores and degrades
gracefully where it is absent, so the tool still runs on Node 18.

## Testing

There is no test suite yet. What has been used so far, and what a suite should cover:

- **Regression on real history**: run before and after a change and diff the resource set. Live
  activity makes counts drift; compare the set of `(type, id)` pairs, not the numbers.
- **False-positive fixtures**: a synthetic transcript containing `az vm delete` inside a heredoc,
  inside `grep '...'`, and inside a quoted prompt — none may appear — alongside a real
  `aws s3 ls`, a `sudo aws ec2 describe-instances`, and a nested `zsh -lc 'psql -h host'`, all of
  which must.
- **Cross-machine consolidation**: two fixture homes with the same email domain must produce
  identical redaction tags for the same resource.
- **Windows/WSL layout**: set `DISCOVERY_WIN_ROOT` to a fake Windows profile tree to exercise the
  Windows-layout parsers without a Windows machine.

## Known risks

- **Host formats churn.** Cursor's store has broken twice; Antigravity has moved its storage root
  twice and renamed its app-data directory between versions. Probe candidate paths rather than
  assuming one, and re-test on major releases of each host.
- **Local history can be wiped.** Cursor updates have been observed clearing chat history, so
  "no activity found" is not the same as "not used" — the report says so for that host, and any
  new host with the same behaviour needs the same note.
- **Encrypted stores are deliberately not read.** Cursor 3.x and Antigravity's IDE encrypt
  conversation bodies. Decryption is technically possible for both; we do not do it, and should
  not start without an explicit product decision — reading encrypted conversation stores, or
  prompting an employee for keychain access, is not defensible in a pre-contract trust exercise.

See [RESEARCH-NOTES.md](RESEARCH-NOTES.md) for the underlying research on each platform and on
server-side visibility.
