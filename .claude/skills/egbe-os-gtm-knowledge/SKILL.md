---
name: egbe-os-gtm-knowledge
description: Find comparable Egbe GTM experiments to inform audience, offer and channel choices.
metadata:
  egbe-when: "Use when prior experiments can inform a new test or reprioritization."
  egbe-visible: "true"
  egbe-title: "Launch GTM insights"
  egbe-description: "Find comparable GTM experiments before choosing or reprioritizing a product's segments, offers, messages, and promotion channels."
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


# Fleet GTM Knowledge

Use this skill while preparing or materially revising `segment -> offer ->
channel` hypotheses. The report is supporting evidence, not a mandatory source:
when it contains no genuinely comparable experiment, continue from the current
product and market evidence.

Authenticate with `Authorization: Bearer $OS_API_KEY`. Base URL:
`$OS_URL` (production default: `https://os.hz.egbe.dev`).

## Find comparable experiments

Prefer `POST /gtm/comparables`: it shows the whole verified/directional pool
to a server-side LLM judge that keeps only experiments whose audience,
problem, or product category genuinely matches your context — so
differently-worded launches still match, and shared keywords alone do not.
The judge call is billed to your own LLM key.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/gtm/comparables" -sS  \
  -H "Content-Type: application/json" \
  -d '{
    "query": "B2B operations teams that need recurring compliance evidence; self-serve subscription; audit generation",
    "geo": "US",
    "limit": 5
  }'
```

Each result carries a `relevance_reason` and a unique `record_id` (one
experiment can emit several records — per campaign, variant, and window).
The response also reports `pool_size`, `judged`, and `partial`: when
`partial` is true the judge saw only part of the pool, so an empty result
must be treated as an incomplete review — never as a no-match conclusion.
`geo` is judge context, not a hard filter.

`POST /gtm/search` remains available as a keyless-of-LLM fallback (token
overlap ranking with optional hard filters). Build one concise query from
the current product truth: the buyer, costly problem or trigger,
offer/mechanism, business model or price band, and the channels under
consideration. Then request at most five records:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/gtm/search" -sS  \
  -H "Content-Type: application/json" \
  -d '{
    "query": "B2B operations teams that need recurring compliance evidence; self-serve subscription; audit generation",
    "channels": ["google", "reddit", "instantly"],
    "buyer_type": "smb",
    "business_model": "subscription",
    "include_directional": true,
    "limit": 5
  }'
```

Omit a hard filter when the current product does not establish it. Do not add a
filter merely to force a desired precedent.

## Evidence rules

For every returned experiment, inspect:

- product and buyer compatibility;
- segment, offer, CTA, message, and channel;
- dates, outcome window, sample size, and spend;
- attribution model and activation definition;
- trust tier, limitations, and evidence references.

Use `verified` evidence for defaults only when the tested conditions are
materially comparable. Use `directional` evidence only as a labelled clue or a
reason to run a bounded test. The endpoint intentionally excludes
`inconclusive` evidence.

Do not infer that a channel caused a result merely because the result happened
during that campaign. Do not compare provider conversions with product
activations or payers. Do not average records with different attribution
windows, currencies, activation definitions, or materially different buyers.

## Write the planning trace

When a record changes a hypothesis, cite its `experiment_id`, trust tier, and
the relevant observed outcome in the planning artifact. State why the precedent
is comparable and its most important limitation.

When no useful record is returned, record `Fleet evidence: none relevant` and
continue. Never invent an experiment ID, metric, or fleet conclusion.
