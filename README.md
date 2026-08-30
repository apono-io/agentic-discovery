# Agentic Access Report

This tool shows what the AI agents on your computer have actually been accessing.

It is **read-only**, makes **no network connections**, and **changes nothing** on your machine.
It writes one file. You read it. Sharing it is your choice — nothing is sent anywhere.

## Run it

You need Node.js 18 or newer (check with `node --version`). Then, from this folder:

```bash
node js/discover.mjs
```

It takes a few minutes and prints where it saved the report:

    agentic-access-report-<your-computer>-<date>.md

Open that file in any text editor, or preview it on macOS with:

```bash
open agentic-access-report-*.md
```

> **Planned, not available yet:** a downloadable signed app (no Node needed) and
> `npx @apono-io/agentic-discovery`. Until those ship, running from source as above is the
> only supported way — which also means you can read exactly what will run.

## What it looks at

| Agent app | What the report can show |
|---|---|
| Claude Code | full history — tools used, MCP servers, command-line access |
| Claude Desktop | agent-mode sessions (regular chats are stored online, not on your computer) |
| Codex | recent session history (Codex keeps roughly a week locally) |
| Cursor | configured MCP servers and a session count |
| GitHub Copilot | whether it is installed, and its configured MCP servers |
| Google Antigravity | whether it is installed, and its configured MCP servers |

Anything the tool cannot see is written into the report itself, under "Coverage notes & known
gaps" — it never quietly leaves things out.

## What the report contains

- Which agent apps you use, and how active they have been
- Which MCP servers are set up, and which ones were actually used
- Which resources your agents reached — cloud accounts, databases, SaaS tools like Jira,
  Confluence or Notion — and whether each was only read or also changed
- Which resources are named in your agents' memory and instruction files

## What it never contains

Your prompts, your conversations, the commands that were run, tool arguments, file contents,
passwords or personal data. **None of that leaves your machine, ever.**

Resource **names** are also masked by default: the report shows the *type* of thing that was
accessed and the last few characters of its name, not the name itself. A Confluence page appears
as `••••5729`, and a short name is hidden entirely. Types, tools, access types, counts and dates
are exact.

## Options

| Option | What it does |
|---|---|
| `--no-redact` | Show resource names in full. Handy for reading your own report — think before sharing that copy. |
| `--out <folder>` | Save the report somewhere specific. |
| `--json` | Also save a machine-readable copy. |

## Questions people ask

**Does this read my conversations?** It reads local history files to count which tools were used
and which resources they touched. None of that text goes into the report.

**Does it send anything anywhere?** No. It makes no network connections at all. The report only
goes somewhere if you send it yourself.

**Will it change anything on my computer?** No. It only reads.

**Do I need to be technical?** A little, for now — you need Node.js installed and you run one
command in a terminal. The downloadable app that removes that step is planned.
