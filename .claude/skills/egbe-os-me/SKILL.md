---
name: egbe-os-me
description: Read service usage and daily, monthly and total allowances.
metadata:
  egbe-when: "Use when planning work requires checking resource consumption or limits."
  egbe-category: "Business operations"
  egbe-visible: "true"
  egbe-title: "Usage & allowances"
  egbe-description: "Check service usage, remaining allowances and when limits reset."
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


# Me

Your own account state. Authenticate with `Authorization: Bearer $OS_API_KEY`.

Base URL: `https://os.hz.egbe.dev`.

## Check your limits

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/me/limits" -s
```

Returns every tracked resource with its current usage and remaining budget:

```json
{
  "instance_id": 1142,
  "count": 2,
  "limits": [
    {"resource": "brave:searches", "display_name": "Brave · Web searches",
     "service_name": "Brave", "counter_name": "Web searches", "unit": "searches",
     "description": "Each successful web search request counts once, regardless of the number of results returned.",
     "category": "research", "advanced": false,
     "current": 3, "max_allowed": 250, "remaining": 247,
     "reset_period": "daily", "next_reset_at": "2026-06-18T00:00:00Z", "allowed": true},
    {"resource": "perplexity:responses", "display_name": "Perplexity · AI web answers",
     "service_name": "Perplexity", "counter_name": "AI web answers", "unit": "answers",
     "description": "Each successful request for an AI answer with web sources counts once.",
     "category": "research", "advanced": false,
     "current": 20, "max_allowed": 20, "remaining": 0,
     "reset_period": "daily", "next_reset_at": "2026-06-18T00:00:00Z", "allowed": false}
  ]
}
```

- `resource` — stable technical ID for filtering and integrations. Do not rename it.
- `display_name` — the shared `Service · Counter` label; use it when explaining usage.
- `description` — what counts as one unit. Records, requests, and generated images are different units; do not equate them with completed reports or sales.
- `unit` — the counted unit, such as `records`, `requests`, or `bytes`.
- `category` — research, media, hosting, payments, advertising, or other.
- `advanced` — automatic operational counters, such as research or video progress checks. They still enforce limits.
- `reset_period` — `daily` and `monthly` reset at the supplied `next_reset_at`; `inventory` means a total allowance that does not reset.
- `current` — usage this period, or cumulative usage for a total allowance.
- `remaining` — what's left before you're blocked.
- `max_allowed` — the configured allowance; a negative value means unlimited. When both `max_allowed` and `current` are zero, the action is unavailable, not used up.
- `allowed` — whether another unit can be used. `false` can mean an unavailable action or exhausted usage; check `max_allowed` and `current` before describing it. For exhausted daily or monthly limits, wait until `next_reset_at`. Total allowances have no reset date; release resources where supported or have the allowance increased.

The response message distinguishes `unavailable` actions from `exhausted` usage.
Keep unavailable actions out of a capabilities introduction, and explain their
restrictions only when they affect the founder's requested work or next step.

The `egbe me limits` CLI shows the same names, units, and reset periods in a table.
Use `egbe --json me limits` to inspect descriptions and stable IDs.

## Watch a limit decrement

Filter to one tool to confirm a call was billed:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/me/limits?resource=perplexity" -s
```

Call the tool (e.g. `POST /search/web/perplexity`), then hit `/me/limits?resource=perplexity`
again — `current` goes up by one and `remaining` drops.
