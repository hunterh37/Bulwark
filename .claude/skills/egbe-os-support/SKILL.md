---
name: egbe-os-support
description: Contact the Egbe team through support tickets and follow up on replies.
metadata:
  egbe-when: "Use for Egbe-team contact; offer a handoff when an Egbe blocker needs human intervention."
  egbe-category: "Business operations"
  egbe-visible: "true"
  egbe-title: "Help from the Egbe team"
  egbe-description: "Ask your agent to contact Egbe about a blocker and follow up on the team's replies."
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


# Support Tickets

Use Egbe's built-in support to contact the Egbe team and track human handoffs.
No external helpdesk connection is required. The team sees your ticket and acts
on it; check replies in a later session.

Tickets are scoped to you: you only ever see and touch your own. Each ticket
has a stable numeric `id` — use it for follow-ups. At the project's configured
`OS_URL`, authenticate with `Authorization: Bearer $OS_API_KEY`; the key needs
support permission. `POST /support/tickets` uses the `CreateTicketRequest`
schema in `/openapi.json` (operation `support_ticket_create`).

## When to use this

- Blocked on a human-only action (credential, domain, third-party dashboard).
- A shared service is broken and you can't fix it yourself.
- You need to ask the team a question and want it tracked, not lost in chat.

Do **not** open a ticket for things you can fix yourself — debugging, installing
packages, retrying a flaky deploy. Tickets are for genuine human handoffs.

## Create a ticket

Prepare a redacted report. Send it only with the founder's authorization or an
applicable workflow that explicitly requires the handoff; respect draft-only
requests.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/support/tickets" -fsS -X POST  \
 -H "Content-Type: application/json" \
  -d '{"title":"Need domain DNS access","body":"Please add the required DNS records or grant access to the domain settings.","reason":"The business cannot launch its custom-domain landing page until DNS is configured.","environment":"I am an AI assistant with shell and OS API access, but no access to the domain registrar. I checked the available DNS tools and cannot update these records.","requested_action":"Add the DNS records listed in the report or provide registrar access. Do not start paid work."}'
```

The response `data` carries the created ticket, including its `id` (use this for
follow-ups). Write a clear `body`: what you need, why you can't do it yourself,
and exactly what action would unblock you.

Include `reason`, `environment`, and `requested_action` whenever you open a
ticket. These fields are optional for older API clients, but make the handoff
actionable: explain the business goal and impact, your runtime and access
constraints (for example browser-only secrets versus shell access), what you
already tried, and the precise answer or action needed. Include relevant budget
and approval limits. Do not include API keys, tokens, passwords, or private keys.

The server adds the authenticated business ID, registry instance ID, instance
name, and agent support API attribution to the ticket and each follow-up. You
do not need to guess these IDs. Environment and reason are your account of the
problem; the API attribution alone does not establish human approval.

## List your tickets

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/support/tickets" -fsS
```

Returns your tickets, newest first. Check the `status` field of each:
`open` = not resolved yet, `closed` = the team marked it done.

## Get one ticket + comments (was it resolved?)

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/support/tickets/12" -fsS
```

Returns the ticket plus all replies from the human team in `comments`.

**Reading "resolved or not":**
- `status: "open"` → still being worked on (or not picked up yet). Keep waiting.
- `status: "closed"` → the team considers it resolved. Read the `comments` for
  what they did, then act on it (e.g. redeploy, retry the blocked step).
- New `comments` while still `open` → the team may be asking you for more info.
  Reply with the comment command below.

Poll this on a later session rather than busy-waiting — a ticket is an async
handoff, not a synchronous call.

## Comment on a ticket

Add context, answer a team question, or report that something is still broken:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/support/tickets/12/comments" -fsS -X POST  \
 -H "Content-Type: application/json" \
  -d '{"body":"Confirmed — redeployed and Stripe is working now. Thanks."}'
```

## Notes

- If a request fails, diagnose the actual authentication, scope or service error;
  a third-party helpdesk is not a prerequisite.
- You can only see and comment on **your own** tickets. A ticket id that isn't
  yours returns `404` — that's expected, not a bug.
- You do **not** close tickets — the human team does that. Your job is to file
  a clear ticket, answer questions, and act on the resolution.
