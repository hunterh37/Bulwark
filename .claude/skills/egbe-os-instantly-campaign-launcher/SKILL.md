---
name: egbe-os-instantly-campaign-launcher
description: Prepare, explicitly activate, observe and recover project-owned Instantly email campaigns and reply queues; inspect assigned sender state.
version: 1.3.4
user-invocable: true
metadata:
  egbe-when: "Use for Instantly campaign preparation, activation, replies, observation or recovery."
  openclaw: {"requires":{"env":["OS_URL","OS_API_KEY"]},"primaryEnv":"OS_URL","emoji":"📬","os":["linux","darwin"]}
  egbe-visible: "true"
  egbe-title: "Email outreach"
  egbe-description: "Operate scoped email campaigns, imports, reply queues and factual campaign observations."
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


# Instantly campaign operations

Use the operation the task calls for; preparing a campaign is not authorization
to activate it, add recipients, reply, or install recurring jobs. Existing
research, copy, lists and run state are valid inputs. This capability does not
select a business goal or decide an outcome from reply rate.

Requires Node 24+ (`node:sqlite`), `OS_URL` and `OS_API_KEY`. Use the project
OS connection, not personal provider keys. Missing credentials are a blocker,
not permission to send cold outreach through Mailu or a trust-domain mailbox.

Read only the reference needed for the operation:

- [Campaign operations](references/instantly-ops.md): preparation/activation,
  sender selection and state, pagination, date-filtered reads, rendering, verification,
  imports and safe cleanup.
- [Reply handling](references/reply-handling.md): queue actions, confirmed
  opt-outs, same-thread sends and uncertain-send recovery.
- [Observation and scheduling](references/observation-and-scheduling.md):
  factual metrics, configured protection, optional jobs and verification.
- [Run state](references/run-state.md): executable configuration, artifacts,
  identity, handoff and replenishment; includes the [spec scaffold](references/run-spec-template.json).

For activation, readiness to continue, or protection recovery, read
[configured protection](references/observation-and-scheduling.md#configured-operational-protection)
to check what the bundled monitor supports and what its state actually proves.

Keep the owning run under
`egbe-docs/marketing/campaigns/instantly/<run_key>/`. Before continuing, read its
manifest and state files and query the project `outreach.db`, next to the run
directories, only through the read-only `scripts/outreach-report.js`
([usage](references/observation-and-scheduling.md#collect-facts-for-one-run)).
If it reports the database missing, say so; do not search the workspace or open
SQLite with inline code. Bundled scripts treat missing history after sending as a
blocker, not something to recreate. JSON checkpoints and queue
files remain active state, not disposable duplicates. Use only the run's
campaign IDs. Registry/gateway ownership is the tenant authority; local
manifest/tags narrow the run and detect conflicts, but do not grant access.

Commands return observations and operation evidence. Check readbacks and
incomplete actions before reporting success. Preserve contacts/messages/state
in the access-controlled project repository, credentials outside Git, and one
active executor when transferring work. Keep the current plan and decisions in
the existing project context, without a second preflight/log/lessons package.
