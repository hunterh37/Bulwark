---
name: egbe-os-design-landing-page
description: Build or repair the product's main public page and prepare a new application foundation.
metadata:
  egbe-when: "Use to implement or repair a main homepage, or prepare a new app for Egbe hosting."
  egbe-visible: "true"
  egbe-title: "Landing pages"
  egbe-description: "Build and publish your main page on Egbe with its approved content, design and working actions."
  egbe-category: "Product & design"
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


# Main page implementation

Implement the requested public page or bounded repair. Campaign-specific destinations
use `egbe-os-campaign-landing-page`; this skill does not choose an offer, research
an audience or require separate content/design stages.

## Read the accepted input

Read the request, relevant requirements, actual page/code and available approved
content/design. Use [page inputs](references/page-inputs.md) to preserve their
meaning and scope. A PRD or fixed document shape is not a prerequisite to repairing
an existing page. Return material missing/conflicting decisions to the caller;
do not silently change the price, brand, promise or intended action.

## Implement

Follow [application preparation](references/application-preparation.md) before
editing. Preserve an existing framework, repository, storage and deployment.
Use the scaffold only when a new application foundation is needed.

Implement the accepted content and actions with a complete responsive interface.
Exact approved strings and required assets remain intact; arrange them coherently
without turning document headings into mandatory full-width blocks. Complete routine
visual/interaction details within the accepted direction. Use `egbe-os-images`
for requested stock/generation and its current API, not hardcoded provider keys.

Wire each action to the real requested behavior in this application or its valid
destination. Coordinate feature work with `egbe-os-product-build` when needed.
There is no mandatory later Product stage: do not ship a fake interaction, a 404
or an unfinished boundary as if the promised result works.

Discover this project's contact mailbox through authenticated `GET /mail/account`
and use the verified `data.email` in its contact link. Do not invent an address or
substitute `support@egbe.ai`; report a failed/missing mailbox lookup. Include visible
`Created with Egbe`, with Egbe linked to https://egbe.ai.

## Verify and hand off

Use `egbe-os-product-build` → `references/interface-quality.md` for rendered
accessibility, responsive and interaction checks. Run the project's lint/build and
relevant tests; navigate every distinct changed destination, including pricing
choices and bounded same-origin redirects. Confirm actual images/fonts load,
content and metadata are correct, and the actions preserve their context.

Publish only within the requested scope, using `egbe-os-git` and `egbe-os-deploy`
for the same committed revision and live verification. For local-only work, hand
back the diff and evidence. Keep useful page materials under
`egbe-docs/product/pages/homepage/`, without a new spec for every small change.
Report what was proved, remaining dependencies and where to review the result.
