---
name: egbe-os-design
description: Search the design-reference catalog and retrieve concrete design systems for interface work.
metadata:
  egbe-when: "Use for interface design; offer when inconsistent visuals need a coherent reference."
  egbe-visible: "true"
  egbe-title: "Design systems"
  egbe-description: "Give your product a consistent visual language using reference design systems for typography, colors and components."
  egbe-category: "Product & design"
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


# Design references

Search reference design systems from shipped product sites and retrieve their
concrete values and source attribution. The caller chooses the direction and
scope; a catalog reference is not a mandatory design or approval of a brand.

Authenticate with `Authorization: Bearer $OS_API_KEY`. Mirrored catalog reads,
facets, browsing and lexical search have no per-call charge. Semantic search
uses the caller's wallet-tracked `ai-api` credential: each semantic query pays
for its query embedding, and the caller that starts a cold or refreshed shared
corpus build also pays for embedding the roughly 1,300 catalog entries. A
restart, catalog update or embedding-model change can require that corpus
build again. Check `scorer` in the response; a lexical fallback does not erase
charges for embedding work already attempted.

## Workflow

```
GET /design/facets  ->  POST /design/styles/search  ->  GET /design/styles/{id}/design.md
```

Save the returned markdown as `egbe-docs/product/design-reference.md` when using it
as source material. Keep it distinct from the accepted `product/design.md` direction;
preserve attribution and record the selected style ID/source with the task.

## 1. See what the catalog actually contains

Search is **semantic** (embedding similarity — understands meaning, and other
languages) when your account has an ai-api credential, and **lexical** (token
overlap) otherwise. This is automatic; check the search response's `scorer`
field to see which one answered. For lexical queries specifically, invented
tags match nothing while words that exist in the catalog match well — start
here and reuse these values as query terms either way.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/design/facets?theme=dark&limit=25" -s
```

Returns ranked `fonts` (Inter, Geist Mono, DM Sans…), `colors` (Graphite, Paper
White, Ink Black…) and `themes` with counts.

## 2. Search

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/design/styles/search" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"query":"editorial serif on cream paper","theme":"light","limit":5}'
```

Each hit carries `style_id`, `site_name`, `url`, `theme`, `north_star` (a
one-line description of the visual direction), `fonts`, `colors`,
`thumbnail_url` and `score`. With semantic search, describe surfaces, type and
mood in any language ("тёплый editorial минимализм на кремовой бумаге" works);
with lexical, stick to English words from the catalog's own vocabulary
("near-black canvas, mono labels, one acid accent") rather than a business
category.

Browsing works too, when you already know the constraint:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/design/styles?font=Geist&theme=dark&limit=10" -s
```

## 3. Take the design system

```bash
mkdir -p egbe-docs/product
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/design/styles/$STYLE_ID/design.md" -s  \
 | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["markdown"])' > egbe-docs/product/design-reference.md
```

`GET /design/styles/{id}` returns the same content as JSON when you want to read
specific fields instead of the whole document:

- `colors` — hex + name + **role** ("the one chromatic button in the system")
- `surfaces` — elevation levels with the hex for each
- `typography` / `type_scale` — families, weights, sizes, letter-spacing per role
- `spacing` — page max width, section gap, element gap, card padding, radii
- `components` — spec text per component (button, card, nav, input…)
- `dos` / `donts` — the rules that keep a copy from looking like a knock-off
- `guides` — an "Agent Prompt Guide" with ready component prompts, when present
- `similar` — sibling styles with their `style_id`, for a second opinion

## Errors

- `503` — the mirror is still warming on a freshly started gateway (first walk
  is ~1 min). Retry in ~30s; after that it is memory-fast and refreshes daily.
  If `data.last_error` is set, an earlier build failed; treat repeats like `502`.
- `422` — `style_id` must be a uuid from a search result.
- `502` — the upstream catalog is unreachable and we have no cached copy. The
  message carries the upstream reason; facets, search and browse also return
  the mirror status (with `last_error`) in `data`, while style detail and
  `design.md` return `data: null`. Retry about a minute later, at most 2–3
  times; if it still fails, continue without a catalog reference and tell the
  user the design catalog is unavailable.

Semantic search never returns an error of its own: no ai-api credential, a
still-building vector cache, or an embeddings-call failure all degrade silently
to the lexical result for that one request — `scorer` in the response tells you
which one you got.

Catalog content © Refero (`styles.refero.design`), mirrored unmodified and
attributed at the bottom of every downloaded design reference.
