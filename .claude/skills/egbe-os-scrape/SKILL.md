---
name: egbe-os-scrape
description: Extract structured data from websites and supported platforms.
metadata:
  egbe-when: "Use when research needs collected web data rather than search results."
  egbe-visible: "true"
  egbe-title: "Web data extraction"
  egbe-description: "Collect structured information from websites for research or data-powered product features."
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


# Scrape (Apify)

Structured web scraping behind one shape. Address everything as
`/scrape/{source}/...` where `source` is `apify` (the only source today; more drop
in later). Authenticate with `Authorization: Bearer $OS_API_KEY`.
Base URL: `https://os.hz.egbe.dev`.

Use only the `OS_URL` and `OS_API_KEY` supplied to the current workload. Product
server code reads those same names; the Site Gateway injects a separate product
identity automatically. Never mint or deploy an Apify-specific key, and never
introduce `APIFY_API_KEY` or a direct provider token for this OS capability.

The lifecycle is the same regardless of source:
**account → discover an actor → run it → read the rows.**

## Account

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/scrape/apify/account" -s
```

Returns the provider account (plan, usage, remaining credit) under `data.raw`.

## Discover an actor

An "actor" is a ready-made scraper. Search the store, or skip straight to a known
actor id if you already know one (e.g. `apify/google-search-scraper`,
`compass/crawler-google-places`, `vdrmota/contact-info-scraper`).

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/scrape/apify/actors?query=google%20maps%20reviews&limit=5" -s
```

`data.actors` is a compact `[{id, name, title, description}]` list. For the full
input schema of one actor:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/scrape/apify/actors/apify/google-search-scraper" -s
```

## Run — synchronous (default)

The simplest path: `sync` is true by default, so the call blocks and returns the
scraped rows directly. Keep `limit` small to save credits, and always set the
actor's own cap field (`maxResults`, `maxPagesPerQuery`, …) inside `input`.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/scrape/apify/run" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{
    "actor": "apify/google-search-scraper",
    "input": {"queries": "best AI tools 2026", "maxPagesPerQuery": 1, "countryCode": "us"},
    "limit": 20
  }'
```

`data` carries `rows` (the scraped records), `count`, and `raw`.

## Run — asynchronous (long jobs)

For big crawls pass `"sync": false`. You get a run handle back instead of rows;
poll the run, then read its dataset when it's `SUCCEEDED`.

Send a stable `Idempotency-Key` for every logical actor run. Persist the returned
`run_id` and `dataset_id`, then reuse or poll them after a retry instead of
starting another paid run. The header is a best-effort retry identity, not a
durable exactly-once guarantee if the start response is lost before the handle
is persisted.

```bash
# 1. start
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/scrape/apify/run" -s -X POST  \
  -H 'Idempotency-Key: places-ramen-tokyo-v1' \
  -H 'Content-Type: application/json' \
  -d '{"actor":"compass/crawler-google-places","input":{"searchStringsArray":["ramen Tokyo"],"maxCrawledPlacesPerSearch":50},"sync":false}'
# -> data: {run_id, status, dataset_id}

# 2. poll
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/scrape/apify/runs/<run_id>" -s

# 3. read rows once SUCCEEDED
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/scrape/apify/datasets/<dataset_id>?limit=50" -s
```

## Passthrough — the native API

Anything the normalized verbs don't cover reaches the provider's own API:

```bash
# GET /scrape/apify/raw/store?search=tiktok  ->  tools-gateway /v1/apify/store?search=tiktok
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/scrape/apify/raw/store?search=tiktok&limit=3" -s
```

Body and query string are forwarded as-is.

## Notes

- Set `$OS_URL` to `https://os.hz.egbe.dev` (or your local gateway).
- Always cap results: a `limit` on the call **and** the actor's own cap field in `input`.
- A non-empty result isn't proof of relevance — check the rows actually match the
  requested place/topic/geography before trusting them.
- Actor ids accept both `user/actor` and `user~actor` forms.
