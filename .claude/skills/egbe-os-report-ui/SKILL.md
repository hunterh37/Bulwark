---
name: egbe-os-report-ui
description: Style supplied report content as offline HTML with shared UI components.
metadata:
  egbe-when: "Use when an existing report needs a readable visual presentation."
  egbe-category: "Business operations"
  egbe-visible: "false"
  egbe-title: "Report presentation"
  egbe-description: "Package findings and plans into clear, self-contained HTML reports with Egbe's shared design components."
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


# Report UI

Render the caller's content as a readable, self-contained HTML document.
The caller owns the data, subject matter, conclusions, recommendations and chat
summary; this skill owns visual composition and HTML packaging.

## Compose for reading

Treat the supplied content as meaning to present, not markup to translate.
Before choosing components, identify its primary message, supporting information
and reference detail. Give them distinct visual weight and reading order.
The first screen should communicate the primary message and key information
without requiring the reader to work through explanatory paragraphs.

Separate labels, values, states and proposed actions from explanatory prose.
Use proximity, contrast, typography and whitespace to show their relationships;
a reader scanning headings and prominent elements should get the main picture.
Reserve continuous prose for explanations that need it. Choose visual forms
by information shape rather than decorating each paragraph with a card.
Group related detail and use disclosure or navigation when it reduces reading
effort. Small reports may need neither. Avoid competing copies of the overview.

You may shorten labels, combine repeated phrasing and reorganize prose while
preserving meaning, exact values, priorities and links. Keep important caveats
with the claims they qualify and supporting detail reachable. If the content
needs a different conclusion or substantive deletion, return that decision
to the caller rather than silently changing it during rendering.

## Create the HTML

1. Copy [the ready scaffold](assets/scaffold.html) to a new report file.
   It already contains the Egbe theme, logo, interactions and offline policy.
   No build, package installation or server is needed.
2. Update `<title>` and `<html lang>`, then replace the markup between
   `<!-- REPORT_CONTENT_START -->` and `<!-- REPORT_CONTENT_END -->`.
   Keep the embedded `<style>`, shared `<script>` and policy metadata unchanged;
   edit the content region rather than rewriting those large blocks.
3. Read [the component guide](references/components.md) for available components
   and their markup. Open the [gallery](assets/examples/components.html) to
   compare their appearance; its editable region contains complete examples.
   The [editorial example](assets/examples/editorial.html) shows a small
   composition. These are references, not required report sections.

Use semantic headings and controls for the chosen composition. Escape external
text before inserting it; do not paste fetched HTML as report content.

Styles are already prepared: use the documented classes and interaction hooks.
For charts and data-dependent dimensions use inline SVG attributes, not new
Tailwind classes or inline styles. Embed images as data URLs or inline SVG.
Ordinary links to supporting material are allowed.

## Check and deliver

Verify the actual output in the available browser. Prefer `file://` with the
network unavailable when supported; a loopback-only preview is suitable for
visual checks when the browser permits only HTTP. Do not expose the workspace
or credentials directory. Check desktop and narrow layouts, links, used
interactions, keyboard access and print. Verify that the report remains readable
if JavaScript is disabled. Record unavailable checks separately: an HTTP preview
does not prove offline file opening. Inspect embedded assets and the absence of
external runtime requests as an additional packaging check, not a substitute
for the checks that could not run.
Check the actual reading experience: without reading the paragraphs, can the
reader identify the main message, key information and where to go next?
Then check that supporting explanations are easy to reach. Fix
competing emphasis, dense text blocks, awkward wrapping and page-wide overflow.
Confirm that visual compression has not changed or concealed substantive content.

Return a local link to the HTML file.

Keep preview fixtures separate from real reports; do not publish a report or
change the underlying product as part of rendering it.
