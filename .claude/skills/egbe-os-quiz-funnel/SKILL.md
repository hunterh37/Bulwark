---
name: egbe-os-quiz-funnel
description: Implement and verify an accepted interactive quiz, its answer-dependent results, conversion handoffs and measurement.
metadata:
  egbe-when: "Use when implementing an agreed quiz or inspecting reference funnels to resolve a specific UX question."
  egbe-visible: "true"
  egbe-title: "Quiz funnels"
  egbe-description: "Build an interactive quiz with personalized results, booking, signup or payment handoffs and reliable measurement."
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


# Quiz Funnel

Implement the accepted experience in the product's application. This skill owns
the executable specification, quiz runtime, integration and technical checks;
it does not choose whether the product needs a quiz or prescribe its UX method.

## Start from the task

Reuse the request and accepted project decisions for the audience, questions,
results and intended next action. Resolve only missing or conflicting inputs
needed for the current work; see [inputs](references/inputs.md). Planning,
reference research, local implementation and release are distinct scopes, not
mandatory stages of every request.

For a focused reference investigation, use the optional
[competitor teardown](references/competitor-teardown.md) and its local
[observation contract](references/walk-mechanics.v2.json). Research is not a
compiler prerequisite and need not be repeated to correct an existing quiz.

## Implement the accepted experience

1. Write `egbe-docs/product/quizzes/<quiz-slug>/quiz.json` using the
   [specification contract](references/spec-contract.md). Reuse existing project
   context; no separate approval ledger is required. Check that the bundled
   runtime supports the accepted behavior before choosing it. If it does not,
   explain the mismatch and use the product's implementation path rather than
   silently changing the experience to fit this engine.
2. Compile the specification:

   ```bash
   python3 <skill-root>/scripts/compile-quiz-spec.py \
     --workspace <workspace-root> --quiz-slug <quiz-slug>
   ```

   The compiler writes `QUIZ.md`, `quiz.public.json` and `validation.json`;
   do not edit these outputs by hand. It checks structure, references and
   configured constraints, not whether a claim is true or an experience is good.
   Read diagnostics, especially reachability that could not be verified.
3. Bind the runtime to the product's framework following
   [implementation](references/implementation.md). Follow
   [conversion handoffs](references/conversion-handoff.md) for the chosen
   destination and [measurement](references/measurement.md) for event semantics
   and delivery. Keep authentication, checkout and analytics under their existing
   Egbe contracts.
4. Use [verification](references/verification.md) for the changed behavior.
   Local work does not require a commit or deployment. When release is in scope,
   use the product's established release workflow and `egbe-os-deploy`, then
   verify the live route without creating unintended real conversions or
   polluting production analytics.

## Handoff

Keep the quiz folder with the product's source. Return what changed, validation
performed, remaining gaps and the artifact or route the caller can inspect.
Distinguish a local build, a released route and an observed real conversion.
