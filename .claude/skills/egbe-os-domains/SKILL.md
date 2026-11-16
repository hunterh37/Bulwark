---
name: egbe-os-domains
description: Assign/move .egbe.app addresses or arrange admin setup of custom domains.
metadata:
  egbe-when: "Use when a deployed app needs a named address or domain change."
  egbe-category: "Development & hosting"
  egbe-visible: "true"
  egbe-title: "Website addresses & domains"
  egbe-description: "Choose or move your .egbe.app address, or arrange a custom domain with help from the Egbe team."
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


# Your app's public address

Every app you deploy always has a **canonical host** — `my-app-e64a1fbe2153.n.egbe.app`.
It works, but it carries your instance id, so it reads like plumbing rather than
a product.

A **domain** is a second, prettier address layered on top: `my-app.egbe.app`.
Both point at the same app. The canonical host never stops serving, so attaching
or releasing a domain can't take your app down.

Base URL: `https://os.hz.egbe.dev`. Authenticate every call with
`Authorization: Bearer $OS_API_KEY`.

## You usually don't have to do anything

Your **first deploy claims a domain for you** from the app's slug: deploy
`my-app` and it comes up on `https://my-app.egbe.app`. The deploy response and
`GET /deploy/<slug>` both carry it:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/deploy/my-app" -s
# data: { "host": "my-app-e64a1fbe2153.n.egbe.app",   <- canonical, always serves
#         "domain": "my-app.egbe.app",                <- the alias, null if none
#         "url": "https://my-app.egbe.app" }          <- give THIS to customers
```

Always hand customers `url`. It is the domain when you have one and falls back to
the canonical host when you don't, so it is correct either way.

## Choosing a different name

Use the founder's selected name or recorded naming delegation. Otherwise suggest
available alternatives without claiming availability before verification,
recommend one and wait for a choice or delegation, once or throughout this
business. A taken name is not permission to silently choose another public brand.
Apply the same decision boundary before releasing or redirecting an established
customer-facing address; return unresolved choices to the caller when needed.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/domains" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"slug":"my-app","name":"acme"}'      # -> https://acme.egbe.app
```

`name` is the label only — letters, digits and dashes, no dots. `acme` becomes
`acme.egbe.app`. Names are first-come, first-served across the whole platform: a
name another business already holds comes back as `domain_taken`, and a handful
of platform names (`www`, `mail`, `api`, `admin`, …) are reserved.

## One domain per business

The limit is `site-gateway:domains`, **1**. It is an inventory limit — it never
resets; you free it by releasing the domain.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/me/limits?resource=site-gateway:domains" -s
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/domains" -s   # what you hold, and where it points
```

So a second app does **not** get a pretty address — it stays on its canonical
host, and the deploy response says so in `warnings`. That is deliberate: a
business ships one brand.

## Moving it to another app

Pointing your existing domain at a different app is a move, not a second claim —
it does not need a release first:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/domains" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"slug":"my-other-app","name":"acme"}'
```

To give the name up entirely and free your slot:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/domains/my-other-app" -s -X DELETE
```

Deleting an app (`DELETE /deploy/<slug>`) releases its domain for you.

## Bring your own domain (client landings, requires Egbe admin setup)

A paid-ads test for a **client** must land on the client's own domain
(`try.client.tld`), not on `*.egbe.app`: Meta verifies the destination domain
in the advertiser's Business Manager, Google rejects landings on an unrelated
domain, and attribution breaks when the funnel continues on the client's site.

This is a separate allowance, `site-gateway:external-domains`, and it is **0 by
default** — an Egbe admin raises it for the one business running the test. Until
then the call below comes back `external_domain_limit_reached`. It does not
touch your `<name>.egbe.app` alias: an app can carry both.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/domains" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"slug":"landing","host":"try.client.tld"}'
# data: { "host": "try.client.tld", "url": "https://try.client.tld", "external": true,
#         "dns": [ { "type":"CNAME", "name":"try.client.tld",
#                    "value":"landing-e64a1fbe2153.n.egbe.app" },
#                  { "type":"CNAME", "name":"_acme-challenge.try.client.tld",
#                    "value":"_acme-challenge.try-client-tld.n.egbe.app" } ],
#         "tls": { "ready": false, "reason": "Pending", ... } }
```

Hand the domain owner **both** `dns` records, exactly as returned. If they use
Cloudflare or a similar proxy, the records must be **DNS only** (grey cloud) —
a proxied record breaks both the certificate and the routing. Use a subdomain;
an apex only works where the provider supports CNAME flattening.

The second record is how ownership is proven: only whoever controls the zone
can point it at us, and the certificate for the host is issued through it. Until
it issues, `tls.ready` is `false`, the host serves nothing and the app keeps
serving on its canonical host and alias. Poll `GET /domains` — once `tls.ready`
is `true`, `url` serves the app over HTTPS. `tls.reason` / `tls.message` say
what it is waiting for (almost always the `_acme-challenge` CNAME).

When an app has both an alias and an external host, `url` is the external host.
Release just the external one and keep the alias with
`DELETE /domains/landing?host=try.client.tld`; deleting the app releases both.

## When something goes wrong

| Response | What it means |
| --- | --- |
| `domain_taken` | Another business holds that name or host. Pick a different one. |
| `domain_limit_reached` | You already use your one domain. Release it, or move it instead. |
| `reserved_domain_name` | Platform-reserved label. Pick a different one. |
| `app_not_found` | Deploy the app first — a domain points at a live app. |
| `external_domain_limit_reached` | Bring-your-own domains are not enabled for this business. Contact the Egbe team. |
| `external_host_not_allowed` | `host` was under `egbe.app` / `egbe.dev`. Use `name` for a pretty alias. |
| `invalid_external_host` | Not a valid host name. Pass a full subdomain like `try.client.tld`. |
| deploy `warnings` mention the domain | The app is live on its canonical host; only the alias didn't attach. Nothing is down. |
