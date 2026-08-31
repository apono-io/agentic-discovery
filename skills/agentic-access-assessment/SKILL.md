---
name: agentic-access-assessment
description: Consolidate per-machine Agentic Access Reports from a customer's employees into one assessment, then build a visual artifact showing which resource types their AI agents actually use, how they are accessed, and what Apono can govern today. Use this whenever someone has a folder of agentic-discovery reports to combine, or asks what a customer's agents are touching — "merge the discovery reports", "consolidate these agentic reports", "build the access assessment for Acme", "which resource types do their employees use", "what are their agents accessing", "prep the POC scoping doc from these scans". Trigger even when the person only names a customer and points at a folder, and even if they do not say "merge" or "assessment" — this skill knows the tool, the checks that keep the numbers honest, and the privacy rules for putting customer data in a shareable artifact.
---

# Agentic Access Assessment

Turn a pile of per-machine reports into something an SE or CSM can reason about and show a customer:
which **resource types** the customer's agents reach, how they reach them, whether those accesses
only read or also change things, and which of them Apono can govern today.

The whole point is the resource-type view. A raw merge lists a hundred individual resources — 36
Confluence pages, 15 AWS services — which is unreadable and, worse, makes the customer's exposure
look like a hundred separate problems. There are usually a dozen or so *types*, and each type maps
to one integration decision. That is the shape of the answer.

## What you need

The `agentic-discovery` repo (github.com/apono-io/agentic-discovery) and a folder of reports named
`agentic-access-report-*.md`, one per participating machine. Node 18+.

## Step 1 — merge, and get structured data out

```bash
node js/merge.mjs <reports-folder> --customer "Acme Corp" --json --out <output-folder>
```

This writes two files: the assessment Markdown (for reading and for the customer) and a `.json`
(for building the artifact). Work from the JSON — it already has resources grouped by type with
coverage status, machine counts, write flags and call volumes, so you do not need to parse the
Markdown or recompute anything.

## Step 2 — check the numbers before you trust them

Read these out of the JSON and the Markdown's limitations section. Each one changes what you can
honestly claim, so resolve them before building anything:

**Salt fingerprints.** Every report header carries a hash of the redaction salt. Resources only
match across machines when those agree. If they differ, the same resource appears more than once
and every total is inflated — say so and get the affected machines re-run rather than shipping
inflated numbers. If they are all missing, the reports predate fingerprinting: comparability is
unverified, not verified.

**Truncated rows.** Reports from v0.7 and earlier capped each section, so rows are missing. The
Markdown states how many. If it is a large fraction, the honest move is to re-run those machines
before presenting anything.

**The catalog date.** Coverage labels come from `aponoCatalog` in `js/rules.json` and go stale as
integrations ship. Check the note's date and confirm against today's integration list. Telling a
customer something is supported when it is not is worse than telling them nothing.

**Redaction.** Reports should say "Resource names are redacted". If one was run with
`--no-redact`, it contains real resource names — do not put that in an artifact without asking.

## Step 3 — protect the people in the data

**Machine names usually contain employees' names** — `Nufars-MacBook-Pro`, `dpatel-laptop`. The
tool deliberately avoids user-level attribution, and then hostnames leak it anyway. So in the
artifact, replace machine names with neutral labels (`Machine A`, `Machine B`, …) and keep the
mapping only in your local notes. Counts and per-machine breakdowns stay exactly as useful; the
names add nothing an SE needs and turn a technical document into something that reads like
surveillance of named individuals.

Resource names are already masked by redaction, so the artifact carries types, tags, counts and
dates — no customer identifiers.

## Step 4 — build the artifact

`scripts/build_artifact.py` produces the page from the merger's JSON, so you are not rebuilding a
design from scratch each time and every customer gets the same document:

```bash
python3 scripts/build_artifact.py <assessment>.json    # writes assessment.html
```

It handles the machine anonymisation from step 3, the coverage badges, the drill-down, the filters
and the limitations list. Read it before assuming it does something it does not, and edit it rather
than working around it — a per-customer variant that drifts from this one costs the consistency
that makes the document recognisable.

Publish the result as an Artifact so the SE gets a link they can drill into.

Ask before publishing if the data belongs to a named customer. Artifacts start private, but this
describes someone's estate and the person running the assessment should decide when it leaves their
machine. For internal pilots, go ahead.

### What the page must contain, and why

If you need to change the design rather than the data, load the `artifact-design` skill first.
The page is structured around the type view, in this order:

1. **The headline sentence, as prose, at the top.** Across N machines, agents reached X resources
   across Y types; Z types saw writes; W are within Apono's coverage today. One sentence someone
   can repeat in a meeting.

2. **Resource types as the primary table** — one row per type, sorted by call volume, each showing:
   coverage tier, how many distinct resources, how many machines, whether writes happened, total
   calls, and the **access path** (CLI, MCP, or both). This is the table the SE reads first and the
   customer argues about.

   The access path belongs at this level rather than one click down. A type reached by raw CLI never
   passed through an MCP server, so it is invisible to any MCP-level tooling and it is usually the
   most interesting thing on the page — in our own pilot every cloud and database type was CLI-only
   while every SaaS type went through MCP. If that only shows up after expanding a row, the reader
   will miss it.

3. **Drill-down per type.** Clicking a type row expands to its individual resources with their
   redacted id, access level, machines, tools and last-seen date. Keep it inside the page — no
   navigation away, no second file. The SE will be asked "which ones?" live in a meeting.

4. **Filters that answer real questions**: writes only, admin/delete only, direct CLI, by coverage
   tier, and a text search. Each corresponds to a question someone actually asks — "what can they
   change?", "what did they reach without any MCP server in the path?", "what can't you govern yet?".

5. **MCP servers**, split into *used but in no config file* (connectors and plugins — the shadow
   surface) and *configured but never used* (unnecessary standing capability). Both halves are
   findings; label them so it is obvious which is which. Show **machines and calls** for each: one
   server on six machines is an organisation-wide pattern, the same call count on one machine is one
   person's experiment, and those need different responses.

6. **Limitations, visible rather than buried** — truncated rows, fingerprint status, the catalog
   date. A customer will read this section, and its presence is what makes the rest credible.

Build the tables from the JSON by embedding the data in the page and rendering with a small script,
so filtering and expanding are instant. Render text through `textContent` rather than
`innerHTML`: resource and server names originate in agent history, which prompt-injected content
can influence, and a page that renders them as markup would carry that straight to the reader.

## Step 5 — brief the human

Do not just hand over a link. Say, in a few sentences:

- **What to lead with** — usually the highest-volume supported type, touched by the most machines.
  That is the POC scope, chosen by evidence instead of conversation.
- **The uncomfortable finding** — a type with writes or deletes that Apono cannot govern yet, or a
  type reached entirely through raw CLI rather than MCP. Name it before the customer does.
- **The shadow surface** — servers used but present in no config, which is usually the most
  surprising number in the whole document.
- **What you could not verify** — anything from step 2 that you could not resolve.

An SE walking into a meeting needs to know the three things they will be asked and the one thing
they should raise first. That is the deliverable, not the link.
