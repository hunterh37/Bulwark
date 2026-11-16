---
name: egbe-os-destination-readiness
description: Audit landing-page claims, visitor journey, identity, terms and data handling without changing the product.
metadata:
  egbe-when: "Use before traffic or after page changes; offer when the promise or visitor path is unclear."
  egbe-visible: "true"
  egbe-title: "Destination readiness"
  egbe-description: "Check your landing page and signup, booking or purchase path before sending traffic. Find broken steps, confusing promises and missing disclosures, with concrete fixes."
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


# Destination readiness

Answer: **Can the intended visitor understand this offer and safely reach the
promised next step on the current site? What must change, and why?** Think as a
careful prospective customer, not a checklist scorer. A technically reachable
page can still make the wrong promise or ask for trust it has not earned.

This is the network-independent check. It requires the product URL, intended
offer and next action, not an ad account or performance data. A caller may add
advertising-network destination references and supply an existing work folder;
apply those to the same evidence and result. For named or already planned networks,
use [network requirements](references/network-requirements.md); otherwise label
coverage common-only.

For an acquisition test, take the intended audience, promise and next step from
the caller's concrete plan. Verify that
journey; do not select a new offer, audience or test. Return a material conflict
to the same method/plan decision rather than resolving it through a redesign.

## Workflow

1. **Frame the actual path.** Identify the product repository and deployed URL,
   the visitor's promise and intended next action from the request, site and
   relevant product documents. Distinguish the advertised promise from what the
   current page says. Ask only when an ambiguity changes the check; give a
   recommended interpretation with the question. Prepare the run using
   [evidence and output](references/report.md).
2. **Map from the project first.** When application source is available, start
   with the [focused repository inspection](references/checks.md#start-with-the-project-source).
   Map each materially distinct route as promise → entry URL → primary CTA →
   signup, booking or purchase destination. Include meaningful offer, locale or
   device variants and where information, commitment or money is requested.
   With only documents or a URL, map the public path directly.
3. **Verify the deployed experience.** Read [checks](references/checks.md).
   Use the map for targeted checks of actual entry pages, links and next steps;
   capture evidence where expectations change or the implementation needs live
   confirmation. Use rendered pages for interactive or visual claims;
   source code and HTTP responses can corroborate but cannot prove those claims.
   Prior reports are leads, not evidence that today's deployment is unchanged.
4. **Explain the consequential gaps.** Separate observed failures, trust or
   clarity problems, policy requirements and uncertainties. For each finding
   explain the visitor consequence and the smallest coherent repair. A local
   mismatch may require aligning the promise and destination, not merely
   changing a label. Report the affected path, not a verdict about the whole
   product. Reuse common observations across supplied network checks.
5. **Check the conclusion.** Review the evidence before delivering: did a guessed URL become a claim of absence, a
   provider name become a false brand alarm, an inaccessible step become a
   failure, or a cosmetic preference become a blocker? Also check the reverse:
   did a 200 response or polished page hide missing substance or a broken CTA?
   Resolve contradictions where safe; otherwise preserve the uncertainty.
6. **Deliver a decision the founder can act on.** Use the
   [report contract](references/report.md): scope-specific conclusion, evidence,
   prioritized repairs and observable recheck conditions. Explain why each
   recommendation matters and link its supporting section in the founder brief.

## Inspection boundary

Browse and read existing authorized evidence only. Do not submit forms, create
accounts/bookings/checkout sessions, send messages, pay or alter the site or
campaigns to complete a check. Inspect a CTA's action before following it if it
could create state; stop at that boundary and name what remains unverified.
Use only public or task-authorized access, and sanitize evidence before saving.

The conclusion covers destination readiness, not targeting, bids, budgets,
campaign/ad-group/ad configuration, event instrumentation or optimization.
It is neither provider approval nor a legal certification or product-demand
assessment. Lack of traffic is not a reason to postpone this check.
