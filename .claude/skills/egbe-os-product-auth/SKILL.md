---
name: egbe-os-product-auth
description: Build or repair accounts, sessions, protected routes and navigation, preserving existing work across account entry.
metadata:
  egbe-when: "Use when features need accounts; offer when authentication gaps interrupt the customer journey."
  egbe-visible: "true"
  egbe-title: "Customer accounts"
  egbe-description: "Add signup, login, secure sessions and protected pages, while keeping a customer's progress through sign-in."
  egbe-category: "Payments & accounts"
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


# Product Auth

Build authentication as part of the existing product experience, not as an
isolated pair of forms.

Before planning changes, inspect the repository `AGENTS.md`. When it contains
`EGBE:PRODUCT-FOUNDATION`, the canonical Postgres pool, migrations, durable
users/sessions storage, server-only session primitives, protected-route helper,
and private validation-session helper are scaffold-owned and already present.
Reuse them. Build only the selected account-entry integrations, account UX,
navigation, continuation, and concrete product bindings;
do not copy, replace, or create a parallel DB/session core.

For a new custom Node/Postgres integration,
[Product Build's foundations](../egbe-os-product-build/references/foundations.md)
describe the optional `--auth-db` installer for the
same shipped schema, migrations and private validation-session helper without
Next.js modules. Its `EGBE:AUTH-DATABASE` marker identifies only those database
assets; the application still owns its request-time session and account-entry
implementation. Preserve a working library's own schema/migration system.

## Core Workflow

For every egbe-os-product-auth implementation, read all of these references before changing code:

1. [references/workflows/build-auth.md](references/workflows/build-auth.md)
2. [references/contracts/live-auth-interface.md](references/contracts/live-auth-interface.md)
3. [references/security/session-and-credentials.md](references/security/session-and-credentials.md)
4. [references/ux/auth-experience.md](references/ux/auth-experience.md)

For a Next.js product, also read
[references/frameworks/nextjs.md](references/frameworks/nextjs.md). For another
stack, apply the same live and security contracts using its established server
and routing patterns.

Implement the methods selected in the existing requirements or task. Preserve a
suitable working method; a bounded repair does not add providers or redesign
account entry. If a material access decision is missing, explain the gap and
propose a suitable option with its reason before dependent implementation. This
technical workflow does not require a new plan or a playbook review.

- When Google is selected, follow
  [references/workflows/google.md](references/workflows/google.md).
- When email sign-in links are selected, follow
  [references/workflows/passwordless-email.md](references/workflows/passwordless-email.md).
- For email/password, use the shared credential and session contract below.

Read [references/workflows/account-recovery.md](references/workflows/account-recovery.md)
only when password recovery or separate email verification is required.

## Sources Of Truth

- Use the Egbe OS `egbe-os-deploy` skill for attached Postgres and deployment.
- Use the live Egbe OS `auth` capability skill for Google identity. Products
  keep no Google client secret and browser code never receives `OS_API_KEY`.
- Use the Egbe OS `egbe-os-mail` skill for email delivery when the selected auth flow
  actually requires email.
- Use the Egbe OS `egbe-os-analytics` skill for canonical event names and delivery.
  Do not define or emit signup event catalogs in this skill.
- Reuse a maintained auth library already present when it supports the local
  account/session contract. Never replace an explicitly selected or suitable
  working method merely because another is easier to implement or verify.

## Completion

For a full implementation, verify every selected method on the live product:
fresh account entry, repeat login to the same local account, applicable identity
linking, authenticated continuation, refresh, signed-in navigation, logout and
protected-route denial. A bounded repair verifies the affected method and shared
dependencies it can change; it does not expand the account-entry set. Email-link
proof requires receipt and use of the actual live message. One working method
does not complete a full implementation with another agreed method still broken;
do not silently remove that method from scope. Source inspection, provider
acceptance and redirect-only forms are not account-entry proof.

If a required identity, consent or live check needs the founder, keep Auth
incomplete and use EGBE's “Resume unfinished work” guidance. Record the exact
pending check and how
to resume in existing working notes; give the founder the safe product location
and one clear next action. A deferral does not complete the pending proof, and a
later "done" still requires live verification.

After that real account-entry proof, prepare the workflow's private reusable
validation identity when dependent Product or Billing work needs it, through the
product's authoritative server-side session mechanism. This is authenticated
setup, not proof of Auth behavior and never a public test-login path.
