---
name: egbe-os-google-auth
description: Add Google signup and login to a deployed product.
metadata:
  egbe-when: "Use when customers need Google sign-in."
  egbe-visible: "true"
  egbe-title: "Google sign-in"
  egbe-description: "Let customers sign up and sign in with Google without managing your own Google OAuth credentials."
  egbe-category: "Payments & accounts"
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


# Product Google Sign-in

Egbe OS owns the Google OAuth client and verifies the external identity. The
product owns its local user, provider link, session, authorization, and logout.
Product code needs only its normal server-side `OS_URL` and `OS_API_KEY`.
The HTTP examples below describe requests from that backend to its configured
Egbe URL, using its product-runtime credential. Implement them with the
product's HTTP client; no agent catalog, workspace helper or connection identity
belongs in the deployed application.

Never put the OS key in browser code. Never add Google client credentials to the
product, call Google's token endpoint from the product, or treat an email/query
parameter as authenticated identity.

## Start from the product backend

Create a same-origin product route such as `/api/auth/google/start`. It calls:

```http
POST /auth/google/intents HTTP/1.1
Host: <configured Egbe host>
Authorization: Bearer <server-side product key>
Content-Type: application/json

{
    "app_slug": "<deployed-slug>",
    "return_path": "/auth/google/complete?next=%2Fdashboard"
  }
```

Redirect the browser to `data.start_url`. `return_path` is relative and must be
handled by the same product backend. When a product deliberately serves more
than one registered host, pass `return_origin`; Egbe OS accepts it only when it
exactly matches an authoritative deployed origin.

## Exchange on the product backend

Egbe OS returns the browser to `return_path` with either
`egbe_auth_code=<opaque-code>` or `egbe_auth_error=<safe-code>`. Exchange the
opaque code immediately from the server:

```http
POST /auth/google/exchange HTTP/1.1
Host: <configured Egbe host>
Authorization: Bearer <server-side product key>
Content-Type: application/json

{"app_slug":"<deployed-slug>","code":"<egbe_auth_code>"}
```

The result contains `provider`, immutable Google `subject`, verified `email`,
`email_verified`, optional `name`, and optional `picture`. Use
`(provider, subject)` as the external identity key. In one database transaction:

1. return the user already linked to that identity;
2. otherwise link the identity to the existing account with the same normalized
   verified email;
3. otherwise create the local user and identity link;
4. only then create the product's ordinary opaque server-side session.

Unique constraints must make concurrent callbacks converge on one identity and
one user. Do not overwrite an existing password hash when linking Google. Clean
the callback code from the browser URL after the session is established.

## Optional: Google One Tap

One Tap shows Google's floating sign-in prompt (top-right) without a redirect.
It is an addition to the redirect flow above, not a replacement — always keep
the button flow as the fallback: One Tap silently shows nothing when the
visitor has no Google session, dismissed it recently, or the browser blocks it.

How it works: Egbe OS hosts the actual GSI widget in an iframe on its own
origin (`os.hz.egbe.dev`, registered with Google once — product domains never
need Google Console changes). The product page embeds that frame through
Google's intermediate-iframe parent library, the frame posts the signed
credential back to the page, and the product backend exchanges it through
Egbe OS for the same verified identity as the redirect flow.

### 1. Backend: mint an intent

Create a same-origin route (e.g. `GET /api/auth/google/onetap/intent`) that
calls:

```http
POST /auth/google/onetap/intents HTTP/1.1
Host: <configured Egbe host>
Authorization: Bearer <server-side product key>
Content-Type: application/json

{"app_slug":"<deployed-slug>"}
```

and returns to the browser: the `nonce`, the frame URL
`https://os.hz.egbe.dev/auth/google/onetap/frame?nonce=<nonce>`, and the frame
origin `https://os.hz.egbe.dev`. The nonce is single-use and expires with the
intent — mint a fresh one per page load, never cache it.

### 2. Page: embed through Google's parent library

Load ONLY `https://accounts.google.com/gsi/intermediate` on the product page.
Never load `gsi/client` there (the product origin is not registered with
Google), never load `gsi/intermediatesupport` anywhere (it is for a separate
post-login page and crashes an active prompt), and never create the iframe
manually — GSI holds the prompt until Google's parent library completes its
handshake, so a hand-made iframe means the prompt never appears.

On an SPA (or any DOM rendered after load) use the JS API — the
`g_id_intermediate_iframe` div auto-scan only works on statically served HTML:

```js
// After fetching the intent from your backend:
window.addEventListener("message", (event) => {
  if (event.origin !== intent.frame_origin) return;   // https://os.hz.egbe.dev
  const m = event.data || {};
  if (m.type === "egbe:onetap:credential" && typeof m.credential === "string") {
    // POST {credential, nonce} to your backend exchange route (step 3),
    // then navigate on success. Do NOT verify or decode the JWT in the browser.
  }
  if (m.type === "egbe:onetap:closed") {
    console.debug("onetap not shown:", m.reason);      // keep for debugging
  }
});
const s = document.createElement("script");
s.src = "https://accounts.google.com/gsi/intermediate";
s.async = true;
s.onload = () => {
  google.accounts.id.initializeIntermediate({
    src: intent.frame_url,
    done: () => {},  // default `done` reloads the page mid-exchange — override it
  });
};
document.body.appendChild(s);
```

Static pages may instead place, before the script tag:

```html
<div id="g_id_intermediate_iframe" data-src="<frame_url>"></div>
<script src="https://accounts.google.com/gsi/intermediate" async defer></script>
```

Mount this only for logged-out visitors (landing, /login, /signup). Google's
library creates the iframe itself, sizes it as the prompt shows, and sets the
FedCM `allow="identity-credentials-get"` permission — none of that is your
code's job.

### 3. Backend: exchange the credential

The credential message carries a Google-signed JWT. Post it with the nonce to
the product backend, which exchanges it server-side:

```http
POST /auth/google/onetap/exchange HTTP/1.1
Host: <configured Egbe host>
Authorization: Bearer <server-side product key>
Content-Type: application/json

{"app_slug":"<deployed-slug>","nonce":"<nonce>","credential":"<credential>"}
```

The result is the same verified identity payload as `/auth/google/exchange` —
apply the identical linking transaction from the redirect flow, create the
ordinary session cookie, and return the post-login path for the page to
navigate to. A 404 means the nonce is invalid, expired, or already used
(exchanging burns it even when the credential is rejected — the page should
just fetch a fresh intent). Fire the same signup conversion events as the
redirect flow, with its own method label (e.g. `google_onetap`).

### Frame → page message protocol

The frame posts to the embedding page (always check
`event.origin === "https://os.hz.egbe.dev"` first):

| message | payload | meaning |
|---|---|---|
| `{type:"egbe:onetap:credential"}` | `credential` (JWT string) | user picked an account — exchange it now |
| `{type:"egbe:onetap:closed"}` | `reason` (string) | prompt not shown / dismissed |

### Why the prompt may not appear (all of these are normal)

- No Google session in the browser profile → nothing to offer.
- Cooldown: each dismissal (the ✕) suppresses One Tap on that site for
  progressively longer (minutes → hours). Test in an incognito window signed
  in to Google.
- `reason` in the `closed` message is often `unknown_reason` under FedCM —
  Chrome hides the real cause for privacy. That alone is not an error.
- The user is already logged in to the product — you should not have mounted
  the embed at all.
- GSI console warnings about "FedCM becoming mandatory" and "prompt UI status
  methods" on the page are advisory noise from the intermediate libraries —
  ignore them.

A working end-to-end reference lives in the `agent-canvas` product repo
(Forgejo `os-e64a1fbe2153/agent-canvas`): backend routes
`/auth/google/onetap/intent` + `/auth/google/onetap/session` in
`src/index.ts`, page component `GoogleOneTap` in `web/src/App.tsx`.

### Product button


Use Google's pre-approved button assets or follow the official branding
guidelines:

- Guidelines: https://developers.google.com/identity/branding-guidelines
- Assets: https://developers.google.com/static/identity/images/signin-assets.zip

## Product experience and verification

- Place Google on the selected account-entry surfaces with the agreed hierarchy.
  It may be the only method; this integration does not require email login.
- The visible Google control calls the product's same-origin start route, never
  Egbe OS with a browser-visible key.
- Preserve a validated relative continuation through the round trip.
- Show safe retry/cancel states without exposing provider details.
- Verify live Google signup, repeat login to the same account, session refresh,
  protected access, logout, and verified-email linking to an existing local
  account, including a controlled imported account in a Google-only product.
  Preserve its credentials and ownership without adding another login method.
  For a bounded repair, verify the affected behavior and shared dependencies.
  Another working login does not complete an agreed Google flow that is broken.
