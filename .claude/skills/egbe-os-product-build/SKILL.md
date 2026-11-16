---
name: egbe-os-product-build
description: Plan and implement product changes, integrations and repairs with direct verification of the accepted behavior.
metadata:
  egbe-when: "Use when product requirements need an engineering plan, implementation or repair."
  egbe-visible: "true"
  egbe-title: "Product development"
  egbe-description: "Build and improve your product using Egbe infrastructure, with working integrations and verified customer journeys."
  egbe-category: "Development & hosting"
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


# Product build

Implement the requested behavior in the product's repository. Read the accepted
requirements or bounded task, relevant design, existing code and prior evidence.
Preserve recorded choices and the assigned scope; a missing product decision is
not permission to invent one. A narrow repair needs no complete PRD or new app.

## Plan, implement and verify

- Read [engineering planning](references/engineering.md) before choosing the
  implementation. It covers requirements, state, dependencies and failure boundaries.
- Follow [execution and verification](references/execution.md) for implementation,
  regression checks, saved work, release and resumable progress.
- For platform integrations, read [capability discovery](references/capabilities.md)
  and the relevant current domain contract before selecting an approach.
- For a compatible application foundation, read [shipped foundations](references/foundations.md).
  The optional local helper previews and installs the existing Next.js, account/session
  and subscription pieces without choosing the stack or commercial model for you.
- For a user-facing interface, use [interface quality](references/interface-quality.md).
- For review that must remain usable after handoff, use
  [private review](references/workflows/private-review-handoff.md).

Use an existing work plan or `egbe-docs/development/<work-id>/` for the concrete
plan, TODOs and evidence. Keep accepted requirements in their existing product
documents; do not create a second definition or mandatory structured plan.
Update progress as work is proved and preserve open decisions/checks for resumption.

## Domain capabilities

Use only what the accepted behavior requires; these are not sequential stages.

| Work | Capability |
| --- | --- |
| New application foundation or main page | `egbe-os-design-landing-page`: its application-preparation reference; preserve an existing application |
| Accounts, sessions, protected access | `egbe-os-product-auth` |
| Purchases, subscriptions, payment state | `egbe-os-payments`: select the workflow matching the accepted model |
| Outcome and payment measurement | `egbe-os-analytics`: activation-tracking or payment-lifecycle-tracking as applicable |
| Storage, generated output and other integrations | Discover DB, LLM, images or other capabilities through OS |
| Source control and serving release | `egbe-os-git`, `egbe-os-deploy` within the authorized publication scope |

Read accepted product decisions by meaning, not a prescribed PRD heading. Account
entry, a public preview and payment are independent choices, not universal gates.
Do not recreate missing planning artifacts merely to satisfy a capability's example.
Keep the real producer, consumer and integration proof connected across domain work.
