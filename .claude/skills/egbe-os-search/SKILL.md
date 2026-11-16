---
name: egbe-os-search
description: Search the web and local businesses; retrieve place details and Google reviews.
metadata:
  egbe-when: "Use when decisions need current sources or local-business discovery."
  egbe-visible: "true"
  egbe-title: "Web & places search"
  egbe-description: "Find web pages, local businesses, and available Google reviews for research and product features."
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


# Search

Web and places search behind concrete routes. Every provider returns the **same**
`SearchResponse` shape, so you parse the answer the same way no matter which one
you call. Authenticate with `Authorization: Bearer $OS_API_KEY`. A scoped key
needs the `tools` scope: without it every search route answers 403.

Base URL: `https://os.hz.egbe.dev`.

## Unified shape

```json
{
  "provider": "brave",
  "query": "best ramen in Tokyo",
  "answer": null,
  "results": [
    {"title": "...", "url": "https://...", "snippet": "...", "score": null, "source": "brave", "metadata": {}}
  ],
  "citations": [],
  "count": 1
}
```

- `answer` — a synthesized text answer (only Perplexity fills this; `null` otherwise).
- `score` — a rating when the provider has one (Places stars); `null` otherwise.
- `metadata` — provider-specific extras (place_id, result age, etc.).

## Web search (Brave) — 250/day

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/search/web/brave" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"query":"best ramen in Tokyo","count":5,"country":"jp","lang":"en"}'
```

`country` selects a Brave search region, not the product's target market. The
supported values (checked 2026-09-24 against the
[official API reference](https://api-dashboard.search.brave.com/api-reference/web/search/get)) are:

```text
AR AU AT BE BR CA CL DK FI FR DE GR HK IN ID IT JP KR MY MX NL NZ NO CN
PL PT PH RU SA ZA ES SE CH TW TR GB US ALL
```

OS normalizes case. ISO codes outside this list, including `AE` and `OM`, are
not supported search regions. Use `country: "ALL"` with the target country,
relevant official domains (`site:`) and language in the query; `lang` sets the
search language. Record that this is all-regions search, not local market data.
Omitting `country` uses the provider's US default, not an unbiased global search.
A 422 region error is not evidence of missing demand; correct the region once
and keep the intended market unchanged. Read original pages before treating
snippets as evidence; country search results are not a company census.

## AI research (Perplexity) — 20 successful submissions/claw/day, slow

Returns a synthesized `answer` plus `citations`. Heavily rate-limited (20 per
day per claw). This OS allowance is separate from the shared Perplexity API
credit balance. An upstream `insufficient_quota` error is a billing/credit
failure, not exhaustion of this daily allowance; stop and surface the error
instead of retrying or switching research providers.

**Deep research takes minutes — do NOT call it synchronously.** A blocking call
outlives your HTTP client timeout and you get a dropped connection (HTTP 000)
with no response body. Use the async submit/poll pair instead:

```bash
# 1. submit — returns immediately with a request_id
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/search/web/perplexity/async" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"query":"What changed in EU AI Act enforcement in 2026?"}'
# -> {"request_id":"<id>","status":"PENDING","poll":"GET /search/web/perplexity/async/<id>"}

# 2. poll until status is COMPLETED, FAILED, CANCELLED or INCOMPLETE
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/search/web/perplexity/async/<id>" -s
```

Stop polling on any terminal status. `INCOMPLETE` means the provider stopped
before finishing (for example, output truncation); partial `answer` and `results`
may still be present. Inspect `error_message` for unsuccessful runs and preserve
the request ID rather than resubmitting automatically.

Async research uses Perplexity Agent background runs. Legacy Sonar model names
map to the provider's recommended presets (`sonar-deep-research` → `high`).
Async options: `model` (default `sonar-deep-research`), `reasoning_effort`
(`low|medium|high`), `system_prompt`.

The synchronous route still exists for quick calls, but it is bounded by a short
timeout: if it can't finish in time it returns a `504` envelope pointing you at
the async route rather than hanging.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/search/web/perplexity" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"query":"quick fact-check","preset":"deep-research"}'
```

Optional (sync): `preset` (research depth, default `"deep-research"`) and
`system_prompt`.

## Places (Google) — 200/day

Local businesses. `score` is the star rating; `url` links to Google Maps.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/search/places" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"query":"ramen in Shibuya","max_results":5,"region_code":"jp"}'
```

Optional: `language_code` (e.g. `"ja"`) for localized results.

### Place details and reviews

For business research or reputation monitoring, follow
[the Google Places workflow](references/google-places.md). It covers project
quotas, selecting `data.results[].metadata.place_id` from search, and fetching
details and available reviews through the existing OS `/tools/places/*` routes.
These operations return provider data inside the OS envelope; their shapes
are described in the workflow. Google returns at most five reviews per place,
not a complete review history.

If this skill was read inline from `/search/skill`, the supporting workflow is
available at `GET /skills/search/resources/references/google-places.md` or in
the complete `/skills/search` bundle.

List providers and the shape any time with `GET /search`.
