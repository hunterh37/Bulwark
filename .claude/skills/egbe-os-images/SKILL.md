---
name: egbe-os-images
description: Generate images or find stock photography and illustrations.
metadata:
  egbe-when: "Use when a product, website or campaign needs visuals."
  egbe-visible: "true"
  egbe-title: "Images"
  egbe-description: "Generate images or find stock photography for your product, website and advertising."
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


# Images

Image generation and stock image search through Egbe OS. Authenticate with
`Authorization: Bearer $OS_API_KEY`. The provider keys live on the gateway —
you never handle them.

Base URL: `https://os.hz.egbe.dev`.

Use only the `OS_URL` and `OS_API_KEY` supplied to the current workload. Product
server code reads those same names; the Site Gateway injects a separate product
identity automatically. Never mint or deploy an image-specific key, and never
introduce `IMAGE_API_KEY` for this OS capability.

Available options:

- [Image generation](#generate) from a text prompt.
- [Stock image search](references/stock-images.md) through Pixabay.

## Generate

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/images/generations" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"prompt":"a minimalist logo of a fox, flat vector","model":"gemini-flash-image"}'
```

Response:

```json
{
  "model": "gemini-flash-image",
  "backend": "litellm",
  "size": null,
  "images": [{
    "b64_json": "<base64>",
    "mime_type": "image/png",
    "url": "https://supabase.hz.gcp.egbe.dev/storage/v1/object/public/img_<you>/gen/<id>.png",
    "stored": true
  }],
  "count": 1
}
```

Each image is also **saved to your own image bucket** and gets a stable public
`url` (`stored:true`) — use it directly on landing pages, no re-upload needed.
If storage is briefly unavailable the image still comes back as base64 with
`stored:false`; just retry later if you need the URL.

Save the first image:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/images/generations" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"prompt":"a red apple on a wooden table"}' \
| python3 -c 'import sys,json,base64; d=json.load(sys.stdin)["data"]; open("out.png","wb").write(base64.b64decode(d["images"][0]["b64_json"]))'
```

## Models

`model` is optional — omit it for the default (`gemini-flash-image`). Aliases:

- `gemini-flash-image` — default, Gemini 2.5 Flash via OpenRouter, fast (~seconds)
- `gpt-image-2.5-flare` — fast, high-quality everyday generation via CLI Proxy
- `gpt-image-2.5-sunburst` — demanding quality via CLI Proxy
- `gpt-image-2`, `gpt-image-mini`, `gpt-image`, `dall-e-3` — compatibility aliases
  for Flare; `dall-e-3` does not invoke the retired DALL·E model
- `gemini-3-pro-image-preview` — Gemini via OpenRouter, high quality

Choose Flare for everyday OpenAI image generation and Sunburst when quality
matters most. OpenAI image models use CLI Proxy; the existing Gemini fallback
can serve a request if the selected OpenAI model is temporarily unavailable.
All requests keep the same OS account authentication and quota controls.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/images/generations" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"prompt":"a product photograph of a blue ceramic mug","model":"gpt-image-2.5-flare","size":"1536x1024","n":1}'
```

`size` is forwarded to the provider. Request `n=1..4` images; each generated
image counts against your quota. OpenAI requests expand into individual image
calls, so requesting several images takes longer.

List them any time with `GET /images`.

## Limits

Two quotas apply:
- **Generation** — `image-gen:generations`, 100/day. `n` > 1 charges per image.
- **Image uploads** — `image-storage:bytes`, 500 MB total uploaded image data.
  This cumulative allowance does not reset. Deleting images from your bucket
  does not automatically restore it.

A `429` means you've hit a cap. Check both:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/me/limits?resource=image-gen" -s
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/me/limits?resource=image-storage" -s
```
