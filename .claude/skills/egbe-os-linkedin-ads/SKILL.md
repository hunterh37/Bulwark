---
name: egbe-os-linkedin-ads
description: Build, operate and measure LinkedIn Single Image and Text Ad campaigns.
metadata:
  egbe-when: "Offer for audiences defined by roles or companies; use for existing LinkedIn campaigns."
  egbe-visible: "true"
  egbe-title: "LinkedIn Ads"
  egbe-description: "Run ads through Egbe. Reach professional audiences with image and text ads, manage campaigns and measure results."
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


# LinkedIn Ads

Use from any product repository with `OS_URL` and `OS_API_KEY` (scope `ads`).
No scaffold, instance layout or egbe-os-product-build stage is required. Provider
credentials stay inside Egbe OS; never request them for product code.

`GET /ads/linkedin/skill` returns this entrypoint. Read only the references needed
for the task from the installed bundle. External agents may download
`GET /skills/linkedin-ads` (ZIP), or
`GET /skills/linkedin-ads/resources/<relative-path>`.
Exact schemas are at `$OS_URL/openapi.json`.

| Task | Reference |
|---|---|
| Inspect destination-specific requirements only | [Destination requirements](references/destination-requirements.md) |
| Continue any campaign work | [Artifacts](references/runtime/artifacts.md) |
| Check access, account, Page or Egbe team prerequisites | [Readiness](references/workflows/readiness.md) |
| Resolve planned targeting and assemble creatives | [Targeting and creative assembly](references/workflows/targeting-and-creative.md) |
| Build non-serving objects, upload images or recover a partial build | [Build without delivery](references/workflows/build-paused.md) |
| Authorize delivery or stop it | [Launch and pause](references/workflows/launch-and-pause.md) |
| Read delivery/results or change campaign settings | [Reporting and changes](references/workflows/monitoring.md) |
| Add optional browser/server conversions and inspect attribution | [Conversions](references/workflows/conversions.md) |
| Request bodies, units, controls and errors | [API reference](references/runtime/api-reference.md) |

## Operating boundaries

- Resolve existing campaign IDs before writing. OS creates groups, campaigns
  and creatives DRAFT (non-serving). Activate only with
  founder authorization or an applicable product marketing policy. An audit or
  a request to edit text does not authorize launch, a larger budget or a new campaign.
- Use the configured account and its linked organization Page. Do not substitute
  the Page associated with a developer app or publish an organic post as a fallback.
- Single Image uses Direct Sponsored Content (not the organic feed). Text Ads use
  their separate creative format. These require separate native campaigns.
- Preserve the approved destination, offer, targeting, budget and exact UTM URL.
  Provider minimums are discovered through pricing/creation; do not increase an
  approved budget automatically to meet them.
- Persist operation keys before mutations. An ambiguous result is not a failed
  create: reuse the same request/key and read back. Never use a new key to bypass
  an uncertain operation or exhausted quota.
- Separate configuration, moderation, delivery, product outcomes and attribution.
  ACTIVE does not prove impressions; account access does not prove Page posting
  permission; an empty report does not prove zero spend.
- These API operations do not install recurring jobs. Read access alone does not
  authorize campaign changes.

Return the campaign folder/IDs, actual changes, observed state/time, unresolved
operations and recovery instructions. Do not commit/push artifacts solely because the skill ran.

## Scope

First release: USD daily budgets, manual CPC, website visits, Single Image and
Text Ads, native targeting, campaign controls, reporting and actual-spend sync.
Optional Insight Tag/CAPI rules, explicit campaign associations, runtime events
and per-rule reports use the conversions workflow. They do not change manual
CPC, budgets or delivery status and are not prerequisites for an authorized
traffic campaign. Runtime event delivery/readback accepts scope `analytics`;
management requires `ads`. No raw passthrough, audience uploads, organic
publishing, automatic conversions or conversion bidding.
