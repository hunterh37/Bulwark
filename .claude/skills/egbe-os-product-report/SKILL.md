---
name: egbe-os-product-report
description: Package Business Loop results or requested status reviews as concise updates, Markdown and offline HTML.
metadata:
  egbe-when: "Offer when decisions need a business overview; use for on-demand and scheduled reports."
  egbe-visible: "true"
  egbe-title: "Your product at a glance"
  egbe-description: "See how your product, spending and customer acquisition are doing, what needs attention and what your agent can help improve."
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


# Product report

Help the founder understand what is happening, what matters and what to do next.
Reporting is read-only with respect to the product and external services; it does
not authorize fixes, campaign changes, spending or outreach. Use `egbe-os-product-routines`
to configure or change a schedule, not as a prerequisite for a manual report.

## Establish the context

Identify the business from the project's configured Egbe connection and existing
product records. Reuse local credentials without copying them into artifacts.
Select `brief` for a status request or agreed short update; select `detailed` for
the Business Loop result or an explicit request for a full report.

Use the requested period and project/user timezone. A status request concerns
the current state, with today's results where applicable. A Business Loop reports
its current checkpoint and each measure's actual window; an existing standalone
daily report retains its agreed previous-calendar-day period. Choosing detailed output does not
turn a current-state request into a historical review. Keep current balances
and availability separate from period totals. If the timezone is unknown,
disclose the harness timezone used.

Read [artifact storage](references/artifacts.md), the latest relevant snapshot
and summary, and the previous detailed report when useful. Use known goals,
open issues, agreed experiments and founder decisions to interpret the state;
include them in the report only when relevant to its conclusion or next step.
When a recommendation depends on an earlier decision, read the relevant plan,
audit or decision record and distinguish its findings from current evidence.
When the Business Loop supplies its result, reuse its conclusions, evidence and
current plan. Check coverage and presentation without starting a second business
review or inventing another next step. A contradiction or missing material fact
returns to the caller for resolution; retain useful partial results meanwhile.
For a standalone report needing product interpretation, read the project's `egbe-docs/playbooks/product.md`
and `product/evaluate.md`; use `product/diagnose.md` only when a consequential
question needs it. For market/acquisition interpretation use
`egbe-docs/playbooks/market-and-acquisition.md`, its `evaluate.md` and the relevant
channel supplement, together with the concrete plan. Apply local
adaptations, including how recommendations and decisions are handled. The report
may reason from fresh observations and recommend a next step without an existing
results file; it does not change the product, campaign, accepted plan or standing method.
If these files are inaccessible, disclose that gap and limit dependent judgments
instead of replacing them with a bundled business strategy.
Do not reread all history or imply that an unread audit supports the report.
Establish the product's stage from its records and owned deployed apps, not the
contents of the local folder: a new connection can belong to an existing product.

## Gather supporting evidence

Follow [sources and measurement](references/sources.md). Reuse recent evidence
only when its scope and time fit this report; fetch what is missing or changed.
Supplied Business Loop evidence is reusable under the same checks, without
repeating its collection.
Save the supporting facts and coverage in `snapshot.json`.

Read only the selected reporting guide:

- [Brief update](references/brief.md): a compact status and one useful next step.
- [Detailed result](references/daily.md): a complete `report.md` with the relevant
  findings, work status, decisions and their basis; no fixed business sections.

Keep the work proportional to the decision. A routine report is not a mandatory
full funnel audit, repository review or market study. When a finding needs deeper
investigation, identify the uncertainty and propose a focused next task.

## Prepare, verify and deliver

Write as the founder's partner: use first person for your recommendations and
offers of help. Explain technical findings by their effect on the product or
customer journey; keep implementation terms and diagnostic details in the
supporting evidence unless the founder needs them to decide.
Name pages and steps by their customer purpose, not internal routes; report
whether customers can reach them, not HTTP codes or serving revisions.

For a detailed run, finish `report.md` first. Derive `summary.md` and use `egbe-os-report-ui`
to create `report.html` from that report. Visual composition may differ; facts,
recommendations and material limitations must not. Correct content in Markdown
first, then update both derived outputs. For a brief run, `summary.md` is the
complete authored result; no full report or HTML is required.

Check arithmetic, links and agreement between formats. For each headline and
zero/absence claim, verify that the source's ownership, definition, period and
coverage support the whole claim; narrow it when they do not.
A failed source can still yield a useful partial report; disclose what
could not be checked. If HTML rendering fails, deliver the verified Markdown
and summary, explicitly leaving HTML unfinished.

For scheduled output, honor the caller's notification decision: prepare without
sending when notification is not required. Otherwise send the summary in the
founder's language with light formatting and links to the actual local
artifacts. A local path is not a public URL; use a supported
attachment when the recipient cannot access the file, without publishing it
elsewhere by default. Record the result under the artifact contract. For a
scheduled run, return the artifact path and coverage/delivery outcome to
`egbe-os-product-routines`; a manual report does not create or advance its schedule.
