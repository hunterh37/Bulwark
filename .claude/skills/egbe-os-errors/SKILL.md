---
name: egbe-os-errors
description: Set up Sentry error reporting and inspect project-scoped issues, exception traces and event diagnostics.
metadata:
  egbe-when: "Use when a product has errors to investigate or needs its error reporting connected or checked."
  egbe-visible: "true"
  egbe-title: "Error monitoring"
  egbe-description: "Connect your app to error monitoring so your agent can investigate real browser and server errors."
  egbe-category: "Development & hosting"
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


# Error tracking (Sentry)

Use OS `errors` to connect an app to Sentry and inspect its failures. The gateway
resolves ownership from the project key; no provider token is needed. Preserve
an existing working SDK, DSN and event tags rather than installing them again.
For an existing error, start with [issue diagnostics](#read-issue-diagnostics).

Authenticate with `Authorization: Bearer $OS_API_KEY`.
Base URL: `https://os.hz.egbe.dev`.

## Get a DSN

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/errors/<your-app-slug>" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"target":"api","platform":"node-express"}'
```

`platform` must be one of these values; without it the project gets
`javascript-nextjs`:

| `platform` | Use it for |
|---|---|
| `javascript-nextjs` | Next.js apps, browser and server (the default) |
| `javascript-react` | React or Vite browser apps and other static browser pages, including a Vite SPA served from Convex |
| `node-express` | Node.js or Express servers, APIs, and workers |
| `python` | Other Python services |
| `python-django` | Django |
| `python-fastapi` | FastAPI |
| `python-flask` | Flask |

Any other value, such as `javascript` or `browser`, fails with 400
`invalid_platform`, and the error lists `supported_platforms`. The gateway also
maps a few short aliases (`next`, `react`, `vite`, `node`, `express`) to these
names, but send the full value.

The response carries `project.dsn`. Fetch it again later with:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/errors/<your-app-slug>" -s
```

Use one product slug and separate targets when the product has multiple runtime
services:

- `web` - public frontend or a combined full-stack Next app.
- `api` - separate backend/API service.
- `worker` - background jobs.
- `admin` - separate admin/control surface.

For a single full-stack Next app, `target:"web"` is enough if both browser and
server Sentry are initialized from the same codebase. For separate frontend and
backend services, provision the same product slug with targets such as `web` and
`api`.

## Read issue diagnostics

Use the provisioned product slug and target. The reads below work with ordinary
project credentials and read-only credentials carrying `errors:read` or
`project:read`. They do not grant permission to modify or resolve an issue.

List recent issues (defaults to unresolved, most frequent first):

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/errors/<your-app-slug>/<target>/issues?status=unresolved&limit=10" -s
```

Query params: `status` (`unresolved` | `resolved` | `ignored` | `all`), `limit`
(1-50), `query` (raw Sentry search, overrides `status`), `sort` (`freq` | `date`
| `new`), `statsPeriod` (`24h` | `14d`). `<target>` is the project target
you provisioned (`web`, `api`, `worker`, `admin`).

Take the numeric `id` from the list, not the display `short_id` or a Sentry URL:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/errors/<your-app-slug>/<target>/issues/<issue_id>" -s

OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/errors/<your-app-slug>/<target>/issues/<issue_id>/events/latest" -s
```

The issue response includes its summary, platform and available first/last
release. The event response contains `issue` and `event`: the event ID and time,
release/environment, exception stack frames and breadcrumbs when Sentry captured
them. To inspect the same occurrence again, replace `latest` with its 32-character
hexadecimal event ID. The gateway verifies that both issue and event belong to
the requested product and target.

Diagnostics are a bounded, redacted projection, not a raw Sentry export. User
records, request headers/bodies, frame locals and source context are excluded;
URL credentials and query strings are removed. Inspect truncation markers and
treat missing fields as unavailable, not as evidence that nothing failed.
An inaccessible event does not mean the issue is resolved.

Use the event's timestamp, release, failing frame and breadcrumbs to inspect the
matching product code and reproduce the affected path. Compare the release with
the serving revision through `egbe-os-deploy`; an older event is not proof of a
failure in a later release. Keep the issue/event IDs with the existing repair
evidence so a later run can resume the same investigation.

## Resolve a verified repair

After the affected behavior is verified in the intended release, use the
numeric issue ID to mark it resolved. Resolving the Sentry record does not
repair the app or verify deployment, and the absence of a new event alone does
not prove a fix. A read-only key cannot perform this operation.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/errors/<your-app-slug>/<target>/issues/<issue_id>/resolve" -s -X POST
```

## Wire Env

Set the DSN as `SENTRY_DSN` in server/API/worker runtime env. The same DSN is
public-safe and may also be exposed to browser code when the framework needs a
public build-time variable such as `NEXT_PUBLIC_SENTRY_DSN`.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/deploy" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"slug":"my-app","repo":"my-app","env":{"SENTRY_DSN":"<dsn>","NEXT_PUBLIC_SENTRY_DSN":"<dsn>"}}'
```

Do not put Sentry auth tokens in product env. Product code only needs the DSN.

## Initialize SDK

### Next / full-stack app

Use `@sentry/nextjs` and initialize both client and server sides from the same
DSN when the app is full-stack. Detect the installed Next.js/Sentry versions
and follow their bundled/current file conventions instead of assuming a
training-era filename. Current Next.js with Turbopack uses
`instrumentation-client.ts` for browser initialization and `instrumentation.ts`
for server registration; export `captureRouterTransitionStart` and
`captureRequestError` hooks when the installed SDK exposes them.

```js
// instrumentation-client.ts (current Next.js/Turbopack)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  tracesSampleRate: 0,
});
```

```js
// sentry.server.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
});
```

### Node / API service

```js
import * as Sentry from "@sentry/node";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0,
  });
}
```

### Browser-only app

```js
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  tracesSampleRate: 0,
});
```

## Required Tags

Set these tags before capturing product exceptions:

- `product_slug` - the deployed product slug.
- `openclaw_instance` - the Egbe project identity, under its retained compatibility tag name; it does not require OpenClaw or a hosted agent.
- `runtime_target` - `web`, `api`, `worker`, or `admin`.

Example:

```js
Sentry.setTag("product_slug", process.env.PRODUCT_SLUG || "my-app");
Sentry.setTag("openclaw_instance", process.env.EGBE_INSTANCE_ID || process.env.OPENCLAW_INSTANCE || "unknown");
Sentry.setTag("runtime_target", "web");
```

## Controlled Smoke

For manual verification, you may trigger one controlled test exception and flush
the SDK before returning a response. Do not leave public debug routes enabled in
production, and do not use synthetic Sentry issues as the only proof that product
monitoring is ready. First verify setup and wiring:
Sentry project/DSN exists, deploy env carries the DSN, and product source
initializes the SDK with the required tags.
