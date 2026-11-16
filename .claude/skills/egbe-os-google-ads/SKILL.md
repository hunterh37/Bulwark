---
name: egbe-os-google-ads
description: Inspect and operate Google Search campaigns, keywords, ads, targeting, budgets and conversion measurement through Egbe OS.
metadata:
  egbe-when: "Use for Google Search advertising and existing Google campaigns."
  egbe-visible: "true"
  egbe-title: "Google Ads"
  egbe-description: "Run ads through Egbe. Reach customers through Google Search, manage campaigns and budgets, and measure signups and purchases."
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


# Google Ads

Inspect and modify the selected Google Search objects through Egbe OS. Use the
requested configuration and exact owned IDs; a status read, edit or pause does
not require a campaign-planning package.

## Connection and account

Use `OS_URL` and `OS_API_KEY`; requests authenticate with
`Authorization: Bearer $OS_API_KEY`. Campaign management needs `ads` scope.
The [server conversions reference](references/server-conversions.md) describes
the narrower runtime `analytics` access. Never put the OS key in browser code
or project evidence; direct Google credentials are not needed.

Before new campaign setup, read the selected account. For work on existing
campaigns, list them and use their saved refs; new-account access is independent:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/ads/google/account" -s
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/ads/google/campaigns" -s
```

`GET /ads/google/account` checks access for new work and returns account
diagnostics in `data.raw` (customer id, currency, timezone, status). An explicit
Registry assignment takes priority. Without one, the shared Egbe account is
available only to approved owner emails. OS selects this server-side; customer
overrides are rejected and the caller cannot grant access by supplying an email.

- Success: continue the requested setup and planning with the returned account.
- `403` containing `google_ads_not_available`: tell the founder clearly, “New
  Google advertising through Egbe is unavailable for this project.” They can use
  their own Google Ads account through their own authorized tools/credentials,
  or agree a manual account connection/assignment with Egbe. Having an MCC or
  completing the Dashboard OAuth pilot alone does not assign an OS account.
  Do not request a founder MCC as a prerequisite or promise automatic connection.
- Registry/provider `5xx`: report a temporary account-check failure, retry the
  read later and escalate persistent failure to Egbe. This is not an access denial.

The restriction applies to selecting an account for new work, including keyword
ideas. It does not revoke existing campaign access. A denied account check must
not block an authorized read, edit, pause or saved-operation retry on an existing
campaign. Campaigns are in `data.campaigns`. Preserve the exact returned `ref`, shaped
`customer_id:campaign_id`; existing campaigns can belong to earlier assigned
accounts. Names are not ownership proof. For the selected campaign,
`GET /ads/google/campaigns/{ref}/account-settings` reads currency, timezone and
auto-tagging. Product agents cannot change shared-account auto-tagging; report
a needed change to Egbe, without requesting an admin key.

Other auth, ownership, configuration, quota and wallet errors block the affected
Egbe operation. Never use Egbe credentials, account overrides or raw provider
calls to bypass a restriction. A founder may separately authorize work through
their own tools and credentials; those are outside these OS endpoints. Keep
secrets out of chat, browser code and project evidence.

## Choose the operation

| Task | Read |
| --- | --- |
| Query keyword ideas and interpret their fields | [Keyword ideas](references/keyword-ideas.md) |
| Create a paused campaign; change targeting, budget or bids | [Campaigns](references/campaigns.md) |
| Create or edit groups, keywords, negatives and responsive search ads | [Search assets](references/search-assets.md) |
| Launch, pause, inspect serving state or repair child status | [Delivery](references/delivery.md) |
| Read performance, search terms, diagnostics and product attribution | [Reporting](references/reporting.md) |
| Configure browser/server conversion actions, goals or bidding; read action reports | [Conversions](references/conversions.md) |
| Deliver backend-confirmed outcomes and inspect receipts | [Server conversions](references/server-conversions.md) |
| Preserve authorized inputs, confirmed state or an unfinished operation | [Campaign records](references/artifacts.md) |

Read only the relevant references. Endpoint paths below are relative to OS;
`{ref}` always means the returned campaign ref, not just the campaign id.
Google does not support the generic Meta `/plan`, `/apply`, `/state` or
`/status` routes. Use Google's `/readback`, not raw `/query` or `/mutate`.

## Execution

Before a write, follow [Campaign records](references/artifacts.md): find existing
records by the exact campaign ref, or by the planned work before a ref exists.
Read recorded decisions and `pending_operation`; reconcile an unfinished
operation using its saved request/key and current provider state before starting
another. Do not replace unresolved input with a new operation.

Identify the exact targets, read current state and apply only the intended change.
Do not create real provider objects to test request syntax; use documented
schemas, local validation or an explicit provider validation facility.
Preserve unrelated settings and intentionally paused objects. Save recoverable
inputs before the call. Use the operation's retry rules: temporary caches, durable
receipts and desired-state assignments are not interchangeable.

Read back changed objects before reporting completion and preserve the useful
facts for continuation. Simple reads need no new artifacts; missing historical
research must not prevent an explicitly requested pause. Scheduling belongs to
the caller's runtime mechanism, not to this skill; do not claim monitoring or
a future stop is installed unless that mechanism confirms it.
