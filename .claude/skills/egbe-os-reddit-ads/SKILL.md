---
name: egbe-os-reddit-ads
description: Execute Reddit Ads operations through Egbe OS, including paused builds, status changes, metrics, assets and uncertain-write recovery.
metadata:
  egbe-when: "Use for paid Reddit campaign operations, targeting IDs, creative uploads, metrics and recovery."
  egbe-visible: "true"
  egbe-title: "Reddit Ads"
  egbe-description: "Build and manage Reddit advertising through Egbe, with verified state and recoverable execution."
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


# Reddit Ads

Use `OS_URL`, `OS_API_KEY` and `Authorization: Bearer $OS_API_KEY`.
Ad-network operations go through OS; do not request provider secrets or call
Reddit Ads directly.

Use the requested targeting, objective, budget and assets for writes.
Status, spend and pause requests do not require research or policy files.

## Read only what the operation needs

- Payloads, targeting lookup and errors: [API](references/runtime/api-reference.md).
- Access/funding: [readiness](references/workflows/readiness.md).
- Build paused: [build](references/workflows/build-paused.md).
- Read-only checks: [launch readiness](references/workflows/launch-ready.md).
- Activate/resume: [launch](references/workflows/launch.md).
- Status, metrics, diagnostics and pause: [monitoring](references/runtime/monitoring.md).
- Wallet/update restrictions: [constraints](references/runtime/policies.md).
- Durable requests and IDs: [execution records](references/runtime/artifacts.md).
- Destination: [requirements](references/destination-requirements.md).
- Tracking: [pixel/events](references/runtime/pixel-and-tracking.md) and
  [attribution](references/runtime/shared-analytics-attribution.md).
- Optional static banners: [templates](references/creative/static-banner-system.md)
  and [capture/upload](references/creative/html-to-png-pipeline.md).

## Execution constraints

Create PAUSED. Persist the exact campaign request and stable `Idempotency-Key`
before sending. Reuse that key/payload; never mint a key to bypass an unknown
outcome. Child-create caches are not durable recovery: reconcile ambiguous writes.

Campaign launch does not activate children. Activate only selected groups/ads
through status routes, save acceptance receipts, then read each object.
Configured ACTIVE, moderation approval and actual delivery are different facts.
Never infer a new activation timestamp from a read-only check.

Ad-group creation reserves a wallet hold even when paused. Ordinary update
rejects `goal_value`/`goal_type`; no in-place budget-change operation is
supported here. Status uses its dedicated route for Registry synchronization.
Do not automatically create a replacement group to change budget.
Never use creates to probe an API schema or broaden rejected targeting silently.

`scripts/validate-reddit-artifacts.py` checks saved operation evidence locally;
it is not authorization, a marketing validator or proof of live freshness.
