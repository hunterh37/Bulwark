---
name: egbe-os-research
description: Run and resume deep multi-source research.
metadata:
  egbe-when: "Use when a question needs in-depth evidence or a research job needs continuation."
  egbe-visible: "true"
  egbe-title: "Deep research"
  egbe-description: "Investigate a question across multiple sources and get a structured report with supporting evidence."
  egbe-category: "AI & data"
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


# Deep research

Use this capability when a task needs a cited, multi-source web research report.
OS owns the engine and model routing; callers provide the research question and
instructions, never a provider or model.

Research is asynchronous. Submit once with a stable idempotency key, persist the
returned job ID, and poll that job until it reaches a terminal state.

Authenticate with `Authorization: Bearer $OS_API_KEY`. Base URL: `$OS_URL`
(`https://os.hz.egbe.dev`).

## Submit or recover a job

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/research" -s -X POST  \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "Market demand and competitors for AI tutoring apps for European teens in 2026",
    "instructions": "Return cited Markdown. Separate verified facts, estimates, and evidence gaps.",
    "depth": "deep",
    "idempotency_key": "market-research:target-audience:INPUT_SHA256"
  }'
```

- `query` contains the question and relevant product context.
- `instructions` contains stable scope, evidence, and output requirements.
- `depth` is `standard` or `deep`.
- `idempotency_key` identifies this exact logical attempt. Repeating it returns
  the same job and does not spend another quota unit.

Persist `data.id` before doing other work.

## Poll

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/research/<job-id>" -s
```

Statuses are `queued`, `running`, `completed`, and `failed`.

When completed, read `data.result.markdown`. Do not fetch a public report URL as
an agent input. On failure, inspect `data.error.code` and
`data.error.retryable`; do not silently switch providers or write substitute
research.

## Recover after an interruption or failure

- If submission/polling is interrupted, reuse the same payload and key (or poll
  the saved job ID). A lost POST response does not mean the job was not accepted.
- `failed` is terminal. Repeating its key returns that failure, not a requeue;
  HTTP 202 alone does not mean the engine is running. Read `data.status`.
- For `retryable: true`, a transient failure permits one deliberate new attempt
  after a short wait. Persist a new stable key, e.g. append `:retry-1`, and reuse
  that key for all submission/polling recovery. Stop and report repeated failure.
- For `retryable: false`, report the error and job ID. Model-access or upstream
  authentication errors require Egbe to repair the service configuration. Start
  a new attempt/key only after the cause is addressed.

## Limits

Each newly accepted idempotent job consumes one of 20 monthly research jobs per
instance. Polls, result reads, and duplicate submissions with the same key do
not consume another unit.
Failed jobs receive a best-effort quota refund; a failed refund does not permit
bypassing the quota limit.
