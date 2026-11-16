---
name: egbe-os-mail
description: Send and read email through the business's @egbe.app mailbox.
metadata:
  egbe-when: "Use for business correspondence and inbox review."
  egbe-visible: "true"
  egbe-title: "Email"
  egbe-description: "Send product emails and read replies through your business's own egbe.app mailbox."
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


# Mail

You have a real `@egbe.app` mailbox. Send and read mail without ever touching
SMTP/IMAP or your mail password — just call these with `Authorization: Bearer $OS_API_KEY`.

Base URL: `https://os.hz.egbe.dev`.

## Sending policy

The `@egbe.app` mailbox carries verification/onboarding links, replies to
opted-in users, founder-facing 1:1 follow-ups, and product/operational notices.
Its sending reputation is shared across businesses.

Never send cold outreach or any list/batch/multi-recipient mail through
`POST /mail/send`. Use the OS `outreach` capability and its Instantly skill
for cold outbound, with a dedicated sending domain distinct from `egbe.app`
and `egbe.dev`. If outreach is unavailable, report the blocker; do not fall
back to the trust mailbox.

## Discover your assigned mailbox

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/mail/account" -s
```

This returns your mailbox email and non-secret mail metadata. Use
`data.operational_recipient` as the source of truth for internal product/admin
notifications, founder alerts, report delivery tests, and product notification
environment variables.

Do not use a public footer/contact/support/marketing email as an operational
recipient just because it appears in product UI copy. Public contact email and
operational notification recipient are different concepts.

Use an external or custom-domain recipient only after explicit live delivery
verification. SMTP send success only means the sending server accepted the
message; it does not prove final delivery. If a `MAILER-DAEMON` bounce appears
after the test, the recipient is invalid and must not be used for operational
notifications.

## Send

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/mail/send" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"to":"someone@example.com","subject":"Hello","text":"Sent by my agent."}'
```

Optional `from_name` sets the display name the recipient sees, for example
`"from_name":"Acme Team"` gives `Acme Team <you@egbe.app>`. The address is always
your mailbox. Use your product's or your own name, never one that claims to be another
company, including Egbe itself unless the business belongs to the Egbe team. Up to 64 characters, without `@`, `<`, `>`, quotes or line breaks.

Recipient checks run automatically; do not add a separate verification API step.
A 200 response means SMTP accepted the message. If it includes
`recipient_verification_warning`, the optional check was inconclusive; do not
resend an accepted message. A 422 invalid-recipient response means nothing was
sent: correct the destination instead of repeating it. Transient baseline
checks can return503 with no send; retry only after that failure is resolved.

If sending returns 422 because this recipient previously returned a confirmed
mailbox-not-found bounce, correct the destination. Repeating the same request
cannot send the email. If sending returns 503 for an unavailable recipient check,
retry later; that request sent no email. A successful submission still requires
delivery verification for operational recipients.

## Read your inbox

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/mail/inbox?limit=10" -s
```

Returns the most recent messages (`uid`, `from`, `to`, `delivered_to`, `subject`, `date`, `received_at`, `unread`). Use `limit` (1–50), `since=YYYY-MM-DD` (server arrival date) and `to=<address or alias>` (a substring of To or Delivered-To, e.g. a plus-addressed alias of your mailbox such as `you+tag@egbe.app`); the filters run on the server, so an older message to an alias is found even when newer mail fills the last `limit` messages.
The `uid` is a stable handle — pass it to read the full message.

## Read one message in full

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/mail/message/$UID" -s
```

Returns the full message: `from`, `to`, `subject`, `date`, and `text` (the body —
plain text, or HTML stripped to text; truncated to 20k chars). Get `$UID` from `/mail/inbox`.
