---
name: egbe-os-llm
description: Add LLM-powered assistants, text generation and document analysis.
metadata:
  egbe-when: "Use when a product needs AI features."
  egbe-visible: "true"
  egbe-title: "AI features"
  egbe-description: "Add AI-powered text generation, chat and other language-model features to your product."
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


# LLM

OpenAI-compatible chat completions, routed through your account — you don't
handle the model key. Authenticate with `Authorization: Bearer $OS_API_KEY`.

Base URL: `https://os.hz.egbe.dev`. Endpoint: `POST /v1/llm/chat/completions`
(standard OpenAI body in, standard completion out).

Use only the `OS_URL` and `OS_API_KEY` supplied to the current workload. Product
server code reads those same names; the Site Gateway injects a separate product
identity automatically and OS routes its spend through the product AI role.
Never mint or deploy an LLM-specific OS key, and never introduce `LLM_API_KEY`
for this capability.

## Models

Model names are **egbe catalog slugs**, not the public OpenAI/Anthropic names —
`gpt-4o`, `gpt-3.5-turbo` or `claude-3-sonnet-20240229` are rejected upstream
with `Invalid model name`. Discover the slugs your account can use:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/v1/llm/models" -s
```

This returns the standard OpenAI `{ "data": [ { "id": "<slug>" }, ... ] }` shape.
Typical slugs include `gpt-6-luna`, `gpt-6.1-sol`, `gemini-3-pro`,
`bedrock-sonnet-4.6`, and `bedrock-glm-5`.
Pass only a slug returned for the current account.

Use `gpt-6.1-sol` for general work at `medium`, or `high` for harder tasks.
Use `gpt-6-luna` at `low` or `medium` for focused summaries, extraction, and
inexpensive pipelines. Sol supports `low`, `medium`, `high`, `xhigh`, and `max`;
Luna also supports `none`. Both default to `medium`; explicit supported effort
values take precedence. The gateway bridges GPT chat requests to upstream
Responses so function tools retain the requested reasoning effort.

## Chat

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/v1/llm/chat/completions" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{
    "model": "gpt-6-luna",
    "messages": [{"role":"user","content":"Say hi in 3 words."}]
  }'
```

The response is the standard chat-completions shape (`choices[0].message.content`),
so existing OpenAI SDKs work by pointing `base_url` at `$OS_URL/v1/llm` and using
your `$OS_API_KEY`.

## Streaming usage

Streamed responses report token usage only when the request sets
`"stream_options": {"include_usage": true}`; the usage arrives in a final chunk
with empty `choices`. Some harnesses omit it for custom endpoints. OpenClaw
does unless each model entry of its custom provider for this endpoint sets
`compat.supportsUsageInStreaming: true`. Without it, that harness and its
telemetry record zero tokens for every call.

## Speech evidence

`GET /v1/media` advertises whether speech transcription is configured.
`POST /v1/media/transcribe` accepts a local audio upload encoded in JSON:
`schema_version: 1`, `media_type`, `sha256` and `content_base64`, with an optional
two- or three-letter `language` hint. Supply the actual SHA-256 of the decoded
audio. Supported types are WAV, MP3, MP4 audio, WebM, Ogg and FLAC, with a 24 MiB
decoded bound. Remote URLs and caller-selected models are rejected. The account's
provisioned AI key pays for the server-configured `media-transcription` role.
The response preserves text, available language and timestamped segments as
speech evidence; it does not prove the competitor's claims.

The deployment must explicitly set `OS_MEDIA_TRANSCRIPTION_MODEL` to an audio
model configured in that account's upstream. It must support multipart
`/v1/audio/transcriptions` with `response_format=verbose_json`. There is no
catalogued default audio model in this repository. A missing policy returns 503;
video research can still analyse available frames and report the speech gap.
