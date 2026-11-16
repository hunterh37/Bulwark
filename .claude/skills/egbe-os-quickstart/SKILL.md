---
name: egbe-os-quickstart
description: Introduce Egbe, connect a supported workspace or explain how to move to one.
metadata:
  egbe-when: "Use for initial setup or questions about getting started."
  egbe-category: "Business operations"
  egbe-visible: "false"
  egbe-title: "Connect to Egbe"
  egbe-description: "Discover Egbe and connect your AI co-founder to your project, tools and working methods."
---

# Get started with Egbe

Help the founder start useful work with **Egbe**. Introduce its value before
setup, then use the path supported by this environment. Use the supplied `OS_URL`
or `https://os.hz.egbe.dev`. Public instructions need no `OS_API_KEY`.

Before installation, read linked resources at
`GET /skills/quickstart/resources/<relative-path>` on `OS_URL`, with a path
starting in `references/` or `resources/`. `/quickstart` returns JSON with the
instruction in `data.text`; resource URLs return files directly. When a terminal
is available, fetch and read the complete text through curl, not a web summary.
Otherwise use available web-reading tools and retrieve omitted sections before
acting on them; a summary is not the installation procedure.

## 1. Show what Egbe enables

Read public `GET /` and the [introduction example](references/introduction.md).
Use the catalog's descriptions and categories; retain `instruction_url` for
relevant skills and playbooks. The catalog manifest at `/skills` is for the
installer, not this introduction.

Give the founder a warm, compact introduction in their language **now**, before
credential checks, catalog updates, installation or logging. Connect what Egbe
provides to results you can deliver, as in the example. Describe platform
capabilities, not an already configured business; project availability is checked
later. If public discovery fails, explain the gap and follow the environment
recovery below instead of presenting unverified current access as fact.

## 2. Establish the available path

Before saving credentials or installing anything, identify the project's working
directory. Establish from the environment context or native documentation that
its files and configuration persist across sessions and the agent can reuse its
project-scoped skills/instructions there. An empty local or remote project folder
is valid; a repository is not required. A terminal, a writable temporary directory,
an Egbe project key or successful API access does not establish this workspace.

- **Persistent project workspace established:** with commands and safe
  authenticated HTTP available, briefly say where setup will be kept and continue
  through steps 3–7.
- **Introduction and handoff:** if the workspace is absent/unconfirmed, commands
  are unsupported, or installation is declined, follow the
  [informational path](references/without-connection.md) and finish quickstart
  with that handoff, skipping steps 3–7. Do not try to turn the
  chat's temporary execution environment into one through installation or plugins.
- **A supported capability is blocked in an established workspace:** use
  [environment recovery](references/environment.md), explain the concrete remedy
  and retry after approval. Keep that setup pending and continue independent
  discussion. Do not treat it as completed or move installation outside the project.

Public-reading access can be recovered in either path; restoring it does not
establish a persistent workspace. Within a supported workspace, assess scheduling
and logging separately: missing support for either does not prevent development
or a manual report. Use the app's actual capabilities, not its name.

## 3. Install skills, playbooks and project guidance

Follow [catalog installation](references/installation.md) in the established
workspace. It covers both a new installation and an existing catalog. The helper
retrieves the manifest and delivers skills and project playbooks together; do not
assemble download URLs, checksums or version arguments yourself.

Connect and read the installed `EGBE.md` through that guide, once. Use it for the
remaining setup and product work. Initial file delivery is not a methodology
review: read the relevant project playbook when starting the product task.

## 4. Connect and understand the project

Follow [connection setup](references/connection.md): save supplied or existing
credentials locally, retain this agent's identity and verify with `GET /me/limits`.
If the project key is missing, ask for it through the supported private setup
path; public discussion does not require a key or creating a project.
Use the installed helper for subsequent authenticated requests. Public discovery
from step 1 already describes the capabilities; `/me/limits` verifies this
project's identity and limits. Never put credentials in web-search queries or
public URLs.

Use verified limits when recommending project actions. An unused zero allowance
(`max_allowed: 0`, `current: 0`) means unavailable, not exhausted. Keep available
actions from the same service visible: an unavailable own-domain connection does
not hide `.egbe.app` publishing. Mention a limit only if it affects requested
work or the next step; do not turn verification into a quota-warning list.

Tell the founder you are reviewing the business to recommend where to continue.
Read the project's `egbe-docs/playbooks/product/business-loop.md` and use its
initial alignment with the founder. Reuse available materials and clarify only
consequential gaps; a new connection need not mean a new product. Keep any pending
founder question separate from technical setup, which can continue independently.

## 5. Set up session logging

First check the project's saved logging choice in `egbe-docs/telemetry/setup.json`
and project notes, before announcing or preparing logging setup. A saved decline,
skip or disable takes precedence over the standard connection prompt, including
its "enable session logging" and authorization text. Keep logging off and continue
to the next step; do not inspect collectors, issue keys or install anything for logging.
Only an explicit request to reverse the previous choice reopens setup.

Otherwise, read `GET /telemetry/skill` and follow its authorization, connection
and delivery verification workflow. The standard prompt supplies initial consent;
reuse it or an applicable saved grant without asking again. Without applicable
permission, keep logging off, say so briefly and continue; silence is not consent.
When proceeding, briefly explain what is being configured and how to disable it.
Native installation/activation permissions and narrower capture scope still apply.

Prefer supported current-session activation. Save pending verification and give
the required native command if only the founder can invoke it. Installation or
saved keys do not prove delivery; logging failure does not block the next steps.

## 6. Offer the Business Loop

After founder alignment, briefly offer recurring continuation of the project's
Business Loop. Use its method to connect a useful signal, work I can do with
Egbe and feedback that informs the next step; offer a concrete cycle, not merely
regular reports. If the goal or signal is still unclear, continue that discussion
rather than inventing a monitoring task. Propose a useful cadence and supported destination, preferably
a dedicated ongoing Business Loop chat as described in the scheduling reference.
Create it only with explicit agreement to this recurring responsibility; a
connection request or generic request to configure reports is not that agreement.
Reuse a clear existing grant rather than asking again. A saved decline or disable
stays in effect unless the founder asks to change it.

Use `egbe-os-product-routines` and its scheduling reference
`references/product-reporting.md` for registration, verification and any agreed
migration. Existing reporting jobs, their owner, cadence and digest preferences
stay unchanged until migration is explicitly agreed; do not add an overlapping
daily review. Scheduling and logging are independent. If the founder declines,
has not answered, or the environment cannot run or deliver reliably, leave the
loop inactive/pending and continue product work. The same Business Loop and
reports can be requested manually. Explain the actual state and how to change
the schedule or turn it off, without waiting for the first scheduled run.

## 7. Continue with the product

Choose the continuation before loading another workflow:

- **A product task is already requested:** continue within its authorized scope
  through the relevant project method and domain skill. For broader product
  priorities use the project's `egbe-docs/playbooks/product.md`. For authorized publishing, follow `egbe-os-deploy`, including
  its hosting default and repository setup.
- **No product task yet:** use gathered evidence and the relevant project method
  to propose a concrete next step, its benefit and deliverable. With no idea yet, use
  the project Market and acquisition playbook's `market.md` to start the
  conversation in the handoff below: ask an easy question
  about experience, interests or people the founder can reach, and explain what
  useful result you will prepare from the answer. Do not merely suggest choosing
  a direction or ask for a completed brief. With a selected idea but no product,
  use `product.md` to choose the missing definition or coherent release, through
  the current PRD/build capabilities. For an existing business, use its product
  method; retain the Business Loop choice from step 6 instead of offering it again.

Carry existing choices and delegation into that workflow. Ask only for a missing
decision or authorization, following the shared founder-decision policy.
Connection alone does not authorize development, publishing, spending, outreach
or recurring tasks. Preserve the chosen/proposed next action
in existing project notes or a short continuation message.

When steps 3-6 have each reached their outcome, including anything declined,
pending or unavailable, and just before the handoff below, tell Dashboard that
setup has finished so it can show the founder what to do next:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<helper-path>/egbe-curl.py" --egbe-request /me/setup-complete -X POST -s
```

Send it on every run of this setup, once. Retry once on failure, then continue;
it never blocks the handoff and does not need to be mentioned to the founder.
The informational path has no connected project and never sends it.

Give a concise, formatted handoff: actual setup state and the chosen continuation.
Speak in the first person: what I can do with Egbe, why it helps and what you will
get. If input is needed, ask the actual question now, unless the founder asked to
finish without questions: then give the chosen next step and what you will prepare,
and keep the question for a later reply. If work is already authorized, continue
it instead of offering to start again. Keep installation counts, hashes and
verification logs out unless they explain an actionable problem. Include a
compact capabilities table so the final answer stands alone if progress updates
are collapsed; reuse discovery from step 1 and adjust to verified availability.

### Activation, when needed

If native discovery has not loaded installed skills, read their `SKILL.md` and
needed references directly and keep helping in this chat. This does not prove
automatic discovery. Prefer a supported reload; if a new session is truly needed,
give one short activation note after the product handoff, once all setup is done.
Combine skill/collector activation into one transition where possible and resume
pending verification there; do not restart telemetry already active here.
