---
name: egbe-os-openai-ads
description: Build, operate and measure OpenAI Ads campaigns, including conversion tracking.
metadata:
  egbe-when: "Offer when customers discover products through AI; use for existing OpenAI Ads campaigns."
  egbe-visible: "true"
  egbe-title: "OpenAI Ads"
  egbe-description: "Run ads through Egbe. Create and manage OpenAI advertising campaigns, track conversions and review performance."
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


# OpenAI Ads

Run the requested part of a campaign lifecycle from any product repository.
No scaffold, egbe-os-product-build stage, instance layout or particular agent runtime
is required. An edit or audit does not authorize a new campaign or a launch.

## Runtime and reference discovery

Use `OS_URL` and `OS_API_KEY` with the `ads` scope:
`Authorization: Bearer $OS_API_KEY`. Provider credentials stay inside Egbe OS.
Browser Pixel is the public tracking exception; management and server event
delivery go through OS.

`GET /ads/openai/skill` returns this entrypoint only. Read the referenced files
from the installed `egbe-os-openai-ads` bundle. If absent, retrieve the complete
bundle with `GET $OS_URL/skills/openai-ads` (ZIP), or fetch one file through
`GET $OS_URL/skills/openai-ads/resources/<relative-path>`, for example
`references/workflows/monitoring.md`. Do not guess missing instructions.
Exact request schemas are at `$OS_URL/openapi.json`.

## Choose the workflow

For campaign work read the [artifact contract](references/runtime/artifacts.md),
then only the relevant workflow. Resolve the existing campaign before writing.

| Request | Read |
|---|---|
| Inspect destination-specific requirements only | [Destination requirements](references/destination-requirements.md) |
| Check account/product readiness | [Readiness](references/workflows/readiness.md) |
| Assemble planned targeting and creatives | [Creative and targeting assembly](references/workflows/creative-assembly.md) |
| Bind UTMs and product analytics | [Tracking](references/workflows/tracking.md) |
| Build paused objects or recover a partial build | [Build and recovery](references/workflows/build-paused.md) |
| Activate an approved campaign | [Launch](references/workflows/launch.md) |
| Diagnose serving/review blockers, inspect performance or edit an existing campaign | [Monitoring and changes](references/workflows/monitoring.md) |
| Stop delivery and confirm state | [Pause](references/workflows/pause.md) |
| Add optional Pixel/server conversions or conversion bidding | [Conversions](references/workflows/conversions.md) |
| Exact operations, units, errors and readback | [API reference](references/runtime/api-reference.md) |

## Shared operating boundaries

- Preserve the selected campaign, segment, offer, destination and approved daily
  budget. Reuse recorded provider IDs. A new request key is not recovery.
- Create paused; launch only within explicit founder authorization or an
  applicable product marketing policy. Neither this skill nor an API key grants
  permission to spend. Never raise an approved budget to satisfy provider minima.
- Only daily USD budgets. Daily budget is an average, not a hard daily cap;
  use the API reference for pacing and wallet semantics. No mandatory lifetime
  budget, arbitrary total-spend ceiling, or copied cross-network thresholds.
- Distinguish intended configuration, observed provider state, actual delivery,
  product outcomes and attribution. Do not infer one from another.
- Provider conversion tracking is optional for ordinary traffic campaigns.
- Monitoring reads do not authorize campaign changes. These API operations do
  not install recurring jobs.
- Persist artifacts after meaningful progress and before handing off a partial
  result. Preserve repository conventions; commit/push only when authorized by
  the current task or repository rules, not merely because this skill ran.
- Artifact repair and audits do not mutate provider objects. Real
  repairs use the explicitly authorized build/edit workflow.

## Local self-check and handoff

Run the portable, read-only structural check from the downloaded skill:

```bash
python3 <skill-dir>/scripts/validate-openai-artifacts.py \
  --product-root <product-repo-root> --phase <phase>
```

Use `--campaign <openai-slug>` when the task names a different campaign from
the selected one. See the artifact contract for phases and required files.
This validates structure and cross-references, not permission, current provider
state, creative quality or campaign success. A validation error never justifies
inventing evidence or blocking an urgent authorized pause.

Return: campaign folder/ID, actual changes (or none), observed state and timestamp,
evidence gaps and operation outcome. For unfinished work include the pending
operation and its saved recovery key; never include credentials or customer data.

## Scope

No raw provider passthrough, lifetime budgets, product feeds, custom audiences,
automatic payment-gateway events, fleet scheduling or Dashboard integration.
Scheduling is external to these API operations.
