# Consolidating reports — for SEs and CSMs

Each participant's machine produces its own report. This is how you turn a pile of them into one
Agentic Access Assessment you can put in front of a customer.

## 1. Ask participants to run the scan

```bash
curl -fsSL https://raw.githubusercontent.com/apono-io/agentic-discovery/main/agentic-discovery.cjs | node -
```

That is the whole ask of a participant: one line, nothing installed, nothing left behind. Anyone who
would rather read the code first can download it instead of piping it
(`curl -fsSL -O https://raw.githubusercontent.com/apono-io/agentic-discovery/main/agentic-discovery.cjs` then `node agentic-discovery.cjs`), or clone the repository.

They get one file — `agentic-access-report-<machine>-<date>.md` — which they read and send you.
That single Markdown file is the complete input: every row is in it, nothing is truncated. (A
`--json` copy exists for tooling, but you do not need it.)

Nothing else is required of participants: no flags, no coordination. Redaction is on by default and
salted with your organization's email domain, which is what makes reports from different machines
line up — the same resource redacts to the same value everywhere.

**Reports from v0.7 and earlier capped each section at 25 rows.** If you are merging older reports,
the assessment will tell you how many rows are missing; re-run those machines on the current
version if the totals need to be exact.

## 2. Put them all in one folder

```
Reports/
  agentic-access-report-machine-a-20260831.md
  agentic-access-report-machine-b-20260831.md
  agentic-access-report-machine-c-20260831.md
```

Names do not matter as long as they start with `agentic-access-report-`.

## 3. Install the skill (once)

The consolidation is driven by a Claude Code skill that lives in this repository. Installing it is
one command:

```bash
git clone https://github.com/apono-io/agentic-discovery.git ~/.claude/skills/agentic-discovery
```

Claude Code loads any folder under `~/.claude/skills/` that carries a plugin manifest, so there is
nothing else to run -- no copying, no install command. Skills are picked up live; if
`~/.claude/skills/` did not exist before, restart Claude Code once so it starts watching the
directory. Confirm with `/skills`, which should list `agentic-access-assessment`.

To update later:

```bash
git -C ~/.claude/skills/agentic-discovery pull
```

The merger and the page builder ship in the same clone and the skill locates them itself, so the
clone is the only copy you need.

## 4. Build the assessment

Ask Claude Code, in your own words:

> build the access assessment for Acme Corp from the reports in ./Reports

The skill does the whole job: it merges the reports, runs the honesty checks in the next section
before it builds anything, produces the interactive page, publishes it as a private link you can
open and drill into, and then tells you what to lead with, what the uncomfortable finding is, and
what it could not verify. That last part is the deliverable — the link on its own is not.

If you would rather do it by hand, or you want only the Markdown:

```bash
node ~/.claude/skills/agentic-discovery/js/merge.mjs Reports --customer "Acme Corp" --json
```

Writes `agentic-access-assessment-<date>.md` plus a `.json` the page is built from. Defaults to a
`./Reports` folder if you omit the path; `--out DIR` chooses where they land. Building the page from
that JSON is
`python3 ~/.claude/skills/agentic-discovery/skills/agentic-access-assessment/scripts/build_artifact.py <that>.json`,
which writes `assessment.html` into the current directory.

## 5. Read these before you send it

**The headline.** One sentence: how many machines, how many resources, how many took writes, how
many map to Apono integrations available today. If it does not read correctly, something is wrong
with the inputs — check the machines table.

**"Integrations to onboard, by resource type."** This is the POC scoping table. One row per
integration an admin would actually onboard, with how many machines touched it, whether writes
happened, and total call volume. The order is your recommended onboarding order: supported first,
sorted by volume.

**The coverage tiers.** Resources fall into four buckets: *supported today* (native integration),
*supported via custom OAuth MCP* (reachable through Apono's custom OAuth MCP support — covers most
OAuth MCP servers, whether unauthenticated, using dynamic client registration, or client-ID auth),
*on roadmap*, and *not supported*. The first two are both sellable today; the difference is how the
integration gets stood up, which is worth being precise about in the meeting. Show the last two to
the customer rather than hiding them — they set expectations, and they are the most honest roadmap
input we get.

**The salt fingerprint column in the machines table.** Every report header carries a short hash of
the salt that produced its redaction tags. Reports can only be consolidated when those match — the
merger checks automatically, puts a warning at the very top of the assessment if they differ, and
says so plainly in the limitations when they agree. You never need to compare them by hand, but if
you see that warning, stop and fix the inputs rather than shipping the document.

**The identification rate.** The assessment states how many externally-reaching agent actions could
be tied to a named resource. An action it could not name still reached something real, so the number
tells you which direction every other count is wrong in — always understating, never overstating.
A machine reporting zero resources needs its own rate checked before you call it clean: zero with no
MCP servers used means genuinely no external access, while zero out of thirty-six external actions
is a measurement gap that looks identical from the outside.

**The limitations section at the bottom.** It states truncated rows, mixed redaction settings, and
the catalog caveat. Read it, because a customer will.

## Things that will bite you

**Mixed salts cannot be merged.** If one participant ran with an explicit `--salt` and another did
not, the same resource redacts differently and appears as two separate resources — inflating every
total. The salt fingerprints in the machines table make this visible, and the merger refuses to
pretend otherwise. Either everyone uses the default (the organization domain) or everyone uses the
same `--salt`.

**The catalog is a moving product fact.** Coverage labels come from `aponoCatalog` in
`js/rules.json`, current as of the date noted there. **Re-check it against today's integration
catalog before a customer sees the document** — telling a customer something is supported when it
is not is worse than saying nothing.

**Machine counts, not user counts.** One person with two laptops counts twice. There is no
per-user attribution by design.

**Machines are named as their own reports name them.** By default a report masks the person part of
its hostname but keeps the first and last letter, plus a short salted code — `n___s~b0f-macbook-pro`
— so you can tell whose machine it is without the full name being written down, and a customer can
match it to an asset. The code exists because first-and-last-letter alone collides in roughly 85% of
fifty-machine fleets; with it, two machines colliding is negligible, and the assessment still warns
you if it ever happens. The assessment passes labels through unchanged and never masks a second
time. One caveat: a report run with `--no-redact` carries the real hostname.

**Reports are internal data.** They are gitignored for a reason: even redacted, they describe a
customer's estate. Keep them out of the repository and out of shared drives that outlive the
engagement.
