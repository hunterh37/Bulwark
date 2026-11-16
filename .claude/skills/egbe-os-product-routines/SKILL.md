---
name: egbe-os-product-routines
description: Configure and verify recurring Business Loops, reports, product-health checks and campaign oversight.
metadata:
  egbe-when: "Offer when repeated work or changing conditions warrant recurring attention."
  egbe-visible: "true"
  egbe-title: "Keep your product moving"
  egbe-description: "Keep agreed work moving with a recurring Business Loop, product checks and reports in your agent."
  egbe-category: "Business operations"
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


# Useful recurring work

Configure agreed recurring work and keep its execution, context and delivery reliable.
Execution and scheduling belong to the user's harness; Egbe supplies capabilities
and guidance, not a managed scheduler.

## Choose the entry

For the Business Loop, existing product reports, or a change/disable request,
follow [Business Loop and reporting schedules](references/product-reporting.md).
It owns registration, saved settings and delivery checkpoints. The project's
Business Loop method owns business decisions; `egbe-os-product-report` packages
its result. Neither a manual loop nor a manual report requires scheduling.

For other recurring work, resolve the requested responsibility and configure it below.
When assembling or debugging continuation across runs, use the
[continuation check](references/continuation-check.md). It tests saved work and
tool behavior, independently of the harness's scheduling mechanism.

## Resolve the requested responsibility

Use the caller's agreed purpose, sources, cadence, notification condition and
action scope. For checks supporting a Business Loop, retain the link to the
current work and checkpoint; return findings there rather than starting a second
business review. A bounded check or report does not require a Business Loop.
The [catalogue](references/catalog.md) lists supported operations
and access requirements, not a ranking of business priorities. If the purpose
is still undecided, return that decision to the caller's project method before
scheduling. Check actual access and existing jobs; preserve saved choices,
including declines. Do not activate an additional routine from a recommendation
alone; quickstart has no automatic scheduling exception.

## Configure the agreed work

Use the scheduling mechanism actually available in this agent's environment and
its native setup instructions. If unavailable, explain the limitation and offer a
manual review; do not claim that a skill keeps the agent running after the chat ends.
Cadence and observation window come from the agreed responsibility, not the
frequency of another routine. Use a supported next-checkpoint schedule when
that is the agreed timing; do not replace it with frequent empty polls. Verify
whether quiet runs still create chats or notifications: suppressing report text
does not prove they are suppressed. Preserve requested digests and required safety checks.

The scheduled task needs the project context, relevant skill, purpose, sources,
allowed actions, budget or stopping conditions where applicable, and notification
rules. Keep credentials in the project's credential store, not in the task prompt.
For product or market/acquisition judgments, include actual workspace paths to
the relevant `egbe-docs/playbooks/product.md` or `market-and-acquisition.md`,
their required sections and the concrete current plan. Confirm the scheduled runner can read these project
files, including local adaptations and shared collaboration guidance. A copied summary or bundled method
is not a substitute. If unavailable, report that limitation and restore access
before making dependent decisions; authorized status reads or safety stops need
not wait for a new planning lifecycle.
Use the scheduler's durable state or existing project notes to retain the last
checked window/revision, active work and decisions needed by the next run.

Default to observing and reporting unless corrective work is authorized. For a
meaningful finding, explain its evidence, impact and recommended next action; use
the relevant domain capability for agreed work. Unchanged state
should be quiet unless the founder requested a periodic digest. An inaccessible source
is a coverage gap, not proof that the product is healthy.

Verify that the task is registered with the intended project, schedule and action
scope. Where feasible, run a read-only first check to confirm access and useful
output. Report what is configured, what remains unverified and how to pause or
change it. Never describe a proposed task as active.

## Continue without repeating work

At each run, read the prior checkpoint and current state before acting. Apply the
project's current method, concrete plan and existing authorization for product or marketing
judgments; domain skills supply evidence and operational constraints. For other
work, follow the relevant domain contract. Do not rerun an entire audit or reread
the whole repository when a bounded change check answers the question. Reconcile an uncertain
previous write before retrying it, and avoid duplicate reports or fixes. Retain the
agreed scope when proposing a new task; return decisions outside it to the founder.
When the caller changes the checkpoint or ends this responsibility, update or
disable its existing native job and saved record, then verify the actual state.
