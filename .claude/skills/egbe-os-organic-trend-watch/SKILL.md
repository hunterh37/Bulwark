---
name: egbe-os-organic-trend-watch
description: Research TikTok and Instagram Reels evidence, compare formats and audience responses, and propose grounded creative adaptations for a product.
metadata:
  egbe-when: "Offer when a new or existing product needs short-video evidence to assess an acquisition hypothesis or improve content."
  egbe-visible: "true"
  egbe-title: "Short-video research"
  egbe-description: "Research TikTok and Instagram Reels examples and audience responses, then adapt useful ideas to your product."
  egbe-category: "Marketing & growth"
---

<!-- egbe-catalog-updates:v1 -->
For work in a workspace with an installed, executable Egbe catalog, run
`python3 "<skills-directory>/egbe-os-quickstart/scripts/sync-catalog.py" --check` using the
actual installation path before starting work with this skill. `<skills-directory>` is the
project folder that contains this skill's directory, such as `.agents/skills`; find it with
file tools or `ls`, not inline interpreter code. Follow its result
with `<skills-directory>/egbe-os-quickstart/references/skill-updates.md`, then reread this
skill if updated. The check is read-only; the reference covers applying updates.
For public guidance without an installed catalog or command execution, skip
this local check and read the current published instructions directly. Reading
does not require a project or installation. For project execution that needs
connection or setup, use `GET /quickstart` on `OS_URL` to choose the appropriate
workspace or no-installation path before setup. The quickstart handles its own check.

Scheduled and other unattended runs have no one to approve inline code, so
`python -c`, `node -e`, heredoc scripts and code-execution tools may be blocked
there. Run bundled scripts as `python3 <script> ...` or `node <script> ...`, and
read files with file tools or plain shell commands.

<!-- egbe-connection-identity:v1 -->
Public instruction and playbook reads do not require credentials or connection
identity. The following applies to authenticated project requests, not reading
or applying public guidance without a connection.

For a BYOA workspace, retain its connection identity on **every authenticated
Egbe request**, including the examples and referenced workflows below. Load
`OS_URL` and `OS_API_KEY` from the project's Git-ignored `.env.local`. Set
`OS_AGENT_NAME` to your actual human-readable agent name, for example
`Claude Code` or `Codex`, not a slug such as `claude-code` or `CLAUDE_CODE`.
This is the name the owner sees in Dashboard. Never infer it from curl or reuse
another agent's identity. If your name is unknown, leave it unset. Quickstart saves the per-agent UUID in
`OS_CONNECTION_ID_<AGENT_SLUG>` (uppercase name with separators changed to
underscores, e.g. `CLAUDE_CODE`) and the optional owner-provided nickname in
`OS_WORKSPACE_NAME` in that file.

Many agent runtimes, including Claude Code, start a fresh shell for every
command, so shell functions and exported variables from an earlier command are
gone. Make each command that calls Egbe self-contained: load `OS_URL` and
`OS_API_KEY` in that same command, and run each authenticated curl example
through the project-local helper with your agent name set inline:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request /me/limits -s
```

`--egbe-request` loads the saved URL and API key from `.env.local` without
executing it, constructs the full URL, and adds the bearer token before calling
curl. Replace `/me/limits` with the API path from an example and keep its other
curl options; omit the example's URL and Authorization header. This mode rejects
additional destinations and redirects. Without this mode, the helper takes the
same arguments as `curl` and you must load credentials before shell expansion.
Do not edit global shell
configuration. Only in a shell that persists between your commands may you
instead export `OS_AGENT_NAME` once and define
`curl() { python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" "$@"; }`.
Likewise prefix `OS_AGENT_NAME="<your agent name>"` on each command that runs a
bundled Python or JavaScript client.

The helper adds the saved identity headers only for the configured Egbe URL;
other destinations receive no extra headers. For an Egbe request it exits 22 on
an HTTP status of 400 or above and writes a status and request ID line to stderr
after every response; `<skills-directory>/egbe-os-quickstart/references/connection.md`
describes both. It rejects mixed destinations and redirects when attaching
identity. If the helper or this agent's UUID is missing, follow `GET /quickstart`
first. Before catalog installation, download and inspect
`GET /skills/quickstart/resources/scripts/egbe-curl.py` into the workspace's temporary
setup directory and use that path. After installation, switch to the installed helper.
For other Python, JavaScript or MCP clients, explicitly configure the same
`X-Egbe-Connection-Id`, `X-Egbe-Agent-Name`, and optional `X-Egbe-Workspace-Name`
headers on Egbe requests. A client that cannot attach identity headers remains
usable as an unidentified connection; do not claim its later activity is identified.
Deployed-product requests use their separate product credentials and no agent identity.


# Organic Trend Watch

Answer a scoped research question using collected TikTok/Reels observations.
Compare what the sources actually show, explain uncertainty, and propose
product-relevant adaptations. This skill does not publish videos or measure
the product's resulting conversions. It can run independently or supply a
Product Market Research section; it is not a pre-PRD prerequisite.

## Establish the assignment

Use the question, product/audience context and available evidence. Missing
market-research sections do not block direct use. Keep founder identity and
unrelated personal details out of provider inputs.

Use the product repository and `EGBE_RESEARCH_ID` (default `market`). Resolve
the installed skill separately from the mutable study directory:

```bash
ORGANIC_TREND_SKILL_ROOT=/absolute/path/to/the-directory-containing-this-SKILL.md
WORKSPACE_ROOT=/absolute/path/to/the-product-repository
RUNTIME_ROOT="$WORKSPACE_ROOT/egbe-docs/research/market/work/organic_trend_watch"
```

Keep execution artifacts below that study's `work/organic_trend_watch/`; replace
`market` in examples when using another study ID. Never work inside the installed
skill. Read [runtime-contract.md](references/runtime-contract.md) for context,
state and resume rules, then [collection-and-analysis.md](references/collection-and-analysis.md)
for the execution sequence.

## Collect and interpret

Use `OS_URL` and `OS_API_KEY` through the bundled provider adapters. Read
[provider-contract.md](references/provider-contract.md) before paid collection.
Bound the requested source/sample scope to the assignment and available budget;
save asynchronous handles and resume them instead of duplicating paid runs.

Read [analysis-and-adaptation.md](references/analysis-and-adaptation.md) before
interpreting evidence. Captions, metrics, comments, transcripts and frames support
different claims. A caption is not a viewed opening frame; a high view count is
not proof that a format caused performance. Keep source claims distinct from
claims the product can substantiate.

The bundled media analyzer supplies content-bound receipts for visual/verbal
claims; [visual-analysis-prompt.md](references/visual-analysis-prompt.md) defines
its extraction scope. Missing media may leave useful caption, metric or comment
evidence. Record the gap rather than inventing an analysis or treating limited
coverage as complete.

## Return a traceable result

Write `analysis.json` using [output-contract.md](references/output-contract.md).
The renderer produces `result.md`; the finalizer seals its evidence, coverage and
collection time in `receipt.json`. Do not hand-author either generated file.
Return the result and its limitations, with source-backed findings and feasible
adaptations where supported. Empty findings are valid when evidence is thin.

For PMR, return the validated result to its finalizer; do not edit the combined
report or publish a competing section. For direct use, present the same result
without requiring a PMR report. Business choices, launch plans and ongoing
evaluation remain outside this collection's receipt.
