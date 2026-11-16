---
name: egbe-os-meta-ads
description: "Execute Meta Ads operations through Egbe OS: inspect, build paused, activate, pause, read metrics and recover uncertain writes."
metadata:
  egbe-when: "Use for Meta campaign operations, targeting IDs, creative uploads and tracking."
  egbe-visible: "true"
  egbe-title: "Facebook & Instagram Ads"
  egbe-description: "Build and manage Meta advertising through Egbe, with verified state and recoverable execution."
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


# Meta Ads

Use `OS_URL`, `OS_API_KEY` and `Authorization: Bearer $OS_API_KEY`.
OS owns provider credentials, account/page binding and the shared pixel. Do not
call Meta directly or request provider secrets.

Use the requested targeting, objective, budget and assets for writes. A status,
spend or pause request needs the exact owned ID, not a research package.

## Read only the relevant reference

- Access and payloads: [API](references/runtime/api-reference.md).
- Build paused: [plan/apply](references/workflows/build-paused.md).
- Read-only preflight: [launch readiness](references/workflows/launch-ready.md).
- Activate/resume: [launch](references/workflows/launch.md).
- Pause: [pause](references/workflows/pause.md).
- Status/metrics: [monitoring](references/workflows/monitoring.md) and
  [insights](references/runtime/insights-reference.md).
- Uncertain writes: [recovery](references/workflows/recovery.md).
- Requests, IDs and readbacks: [execution records](references/runtime/artifacts.md).
- Destination: [requirements](references/destination-requirements.md).
- Tracking: [pixel](references/runtime/pixel-install.md) and
  [attribution](references/runtime/shared-analytics-attribution.md).
- Media: [images](references/creative/creative-specs.md) and
  [video](references/creative/talking-head.md).

## Execution constraints

Use `POST /ads/meta/plan` for no-write validation, then `POST /ads/meta/apply`
with the unchanged spec, signed `plan_token` and `approved: true`.
That flag is a server contract, not evidence of user authorization. Apply only
within current authorization; raw creates are not an approval bypass.
The current declarative API supports one ad set because ads have no per-ad
ad-set mapping. The configured per-operation budget guard and wallet hold are
server contracts, not recommended spending amounts.

Never create real objects to discover the schema. Build PAUSED. Save exact IDs,
request identity and uncertainty; read before retrying. OS derives apply retry
identity from the original plan token, so a fresh plan can create another tree.
Reconcile after timeout or best-effort rollback before re-planning.

Verify the tree with `GET /ads/meta/campaigns/{id}/state`; an accepted launch
is not confirmation. Its `delivering` flag describes configured tree state,
not observed impressions, spend or business success. Dedicated status and budget
routes keep Registry/wallet accounting aligned.

`scripts/validate-meta-artifacts.py` checks saved operation evidence locally.
It neither approves a plan nor proves live freshness; refresh state as needed.
