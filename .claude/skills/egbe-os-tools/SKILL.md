---
name: egbe-os-tools
description: Call low-level external-provider tools.
metadata:
  egbe-when: "Use when no higher-level Egbe capability covers the operation."
  egbe-visible: "true"
  egbe-title: "Video & creative research"
  egbe-description: "Generate videos for your marketing and research competitor creatives through the Meta Ad Library."
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


# Tools

Low-level external capabilities behind one endpoint. Call
`/tools/{provider}/{path}` with `Authorization: Bearer $OS_API_KEY`; we forward
to the right provider. List providers with `GET /tools`.

Prefer higher-level OS capabilities when they exist:

- `/search/skill` for Brave, Perplexity, and Places search
- `/scrape/skill` for Apify scraping
- `/images/skill` for image generation
- `/ads/google/skill`, `/ads/meta/skill`, or `/ads/reddit/skill` for the selected ad channel
- `/outreach/skill` for Apollo lead sourcing and Instantly campaigns

Base URL: `https://os.hz.egbe.dev`.

## Web & places search → use `/search`

Search has its own capability with one unified result shape. See `GET /search/skill`:
`POST /search/web/brave`, `POST /search/web/perplexity`, `POST /search/places`.

## Generate an image

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/tools/images/generations" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"prompt":"a minimalist logo of a fox","size":"1024x1024"}'
```

## Generate a video

Talking-head and other long-running video generation goes through the low-level
tools endpoint:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/tools/videos/generations" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"prompt":"A founder speaks directly to camera about how the product saved hours each week.","duration_seconds":10,"aspect_ratio":"9:16","generate_audio":true}'
```

Poll status:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/tools/videos/generations/<request_id>?model=fal-ai/kling-video/v2.6/pro/text-to-video" -s
```

Upload a completed generated talking-head video into Meta and get `video_id`:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/tools/videos/generations/<request_id>/meta-upload" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"model":"fal-ai/kling-video/v2.6/pro/text-to-video","filename":"03-talking-head.mp4"}'
```

## Scrape the web (Apify)

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/tools/apify/run-sync" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"actor":"apify/web-scraper","input":{"startUrls":[{"url":"https://example.com"}]}}'
```

## Meta Ad Library

Use this for read-only competitor ad research:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/tools/meta-ad-library/search" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"query":"language learning","countries":["ALL"],"activeStatus":"ALL","adType":"ALL","searchType":"KEYWORD_UNORDERED","limit":50,"sortBy":"none"}'
```

If the upstream Meta app lacks Ad Library permission, treat the research as
blocked rather than fabricating competitor ads.

## Google paid search of a competitor (SpyFu)

Read-only Google Ads intelligence for one domain: estimated monthly budget,
paid clicks and paid keyword count with history, PPC competitors, the
keywords it buys, its ad copy over time, and keywords shared by up to three
domains.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/tools/spyfu/domain-stats" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"domain":"competitor.com","country_code":"US","months":12}'
```

Other operations take the same `domain` and `country_code`:
`ppc-competitors`, `ppc-keywords`, `paid-serps`, `ad-history` (optional
`keyword`, `since`, `until` as `YYYY-MM-DD`), plus `kombat`
(`include_domains`, `exclude_domains`, `intersection`) and `keyword-ads`
(`keyword`). `country_code` is one of 28 markets; `GB` is accepted as `UK`.

SpyFu bills every returned row, so ask for the rows you need (`max_rows`,
default 100, at most 500). Each answer reports `rows_billed` and `cost_usd`.
The per-claw daily `spyfu:rows` limit counts those rows: near the limit a
list answer is cut to the rows left and says `limited_by_quota: true`, and
`domain-stats` answers 429 instead of a shorter history. `has_more` tells
whether another page exists. `found: false` from `domain-stats` means SpyFu
has no data for the domain, not zero spend.

## More providers

For delegated research or processing with Theona agents, follow
[Theona runs](references/theona.md): discover the agent, start a run, and
continue using its returned project-owned handle.

`GET /tools` lists the low-level providers. Do not use `/tools/apollo`,
`/tools/instantly`, or `/tools/*-ads` for normal outreach or ads workflows;
use `/outreach/skill` or the selected channel's `/ads/{source}/skill` instead.
