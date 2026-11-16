---
name: egbe-os-payments
description: Build or repair Stripe checkout for one-time purchases or subscriptions, discounts, billing and entitlements.
metadata:
  egbe-when: "Use for monetization work; offer when an agreed paid offer lacks a working payment flow."
  egbe-visible: "true"
  egbe-title: "Payments & subscriptions"
  egbe-description: "Accept payments, offer subscriptions and promo codes, and let customers manage their billing."
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


# Payments

Build payments through Egbe OS, not through provider credentials or direct
payment-gateway routes. Base URL: `https://os.hz.egbe.dev`. Authenticate with
`Authorization: Bearer $OS_API_KEY`.

## Reuse the existing integration

Inspect the product repository and its `AGENTS.md`. When it contains
`EGBE:BILLING-FOUNDATION`, reuse the existing subscription foundation: plan
catalog, provider-binding sync, checkout attempt and endpoint, signed webhook
and lifecycle reducer, durable subscription state, entitlement helper, Billing
status and Portal endpoints, and neutral `/account/billing` surface. Do not
copy, replace, or rebuild that core. Complete only the product-specific catalog,
CTA/auth continuation, product enforcement or usage behavior, design and
navigation adaptation, analytics, and semantic verification. Repair integration
defects without creating competing billing state or bypassing its contracts.

For a repository without it, implement against the established application and
database conventions. The bundled `assets/scaffolds/billing-nextjs-subscription/`
is an optional starting point for a compatible new subscription integration,
not a one-time purchase engine. Do not overwrite working code or add a marker
without the implementation it describes.

Product Build's `references/foundations.md` documents the optional local scaffold
helper's `--subscriptions` selection, which previews and installs this foundation
and its required account/session pieces. Use it only for an accepted subscription
offer on a compatible stack; provider setup and product integration remain here.

## Route The Work

- For customer purchase, buyer, or revenue reports, follow **Reporting customer
  metrics** in the `egbe-os-analytics` skill (`GET /analytics/skill`).
- For catalog, provider setup, checkout, and pricing handoff,
  read [references/workflows/product-checkout.md](references/workflows/product-checkout.md).
- For a one-time purchase and its delivery/access lifecycle, also read
  [references/workflows/one-time-purchase.md](references/workflows/one-time-purchase.md).
- For coupons, customer-entered promotion codes, automatic Checkout discounts,
  and discount operations, read
  [references/workflows/discounts-and-promotion-codes.md](references/workflows/discounts-and-promotion-codes.md).
- For signed webhooks, normalized subscription state, and entitlements, read
  [references/workflows/subscription-lifecycle.md](references/workflows/subscription-lifecycle.md).
- For the account billing page, user-menu plan state, and Customer Portal, read
  [references/workflows/account-billing.md](references/workflows/account-billing.md).

Those workflows select the supporting contract, security, and UX references.
Read only the workflow relevant to the requested payment capability.

## Platform Rules

- Use only `$OS_URL/payments/*`; never request Stripe keys or call Stripe or the
  internal payment gateway directly.
- Use one app-owned plan catalog across landing pricing, checkout, billing UI,
  and entitlements.
- Enable customer-entered promotion codes by default in new Checkout and
  Payment Link implementations. Do not create a coupon or code implicitly;
  follow the discounts workflow when the product needs provider resources or
  an automatic discount.
- Treat provider state from `GET /payments/evidence` as Stripe readback and the
  product database as the source of account entitlement state.
- Treat working Auth as an upstream input. Reuse its private validation identity
  and normal server-side session lookup for authenticated Billing work instead
  of replaying signup, password, or email-link entry. Never add a public
  test-login route or alternate Billing-only auth path.
- Send an `Idempotency-Key` on every provider create operation. Reuse the same
  key when retrying the same logical operation.
- Keep provider ids, scoped keys, webhook secrets, customer ids, and checkout
  creation on the server. Never expose them through `NEXT_PUBLIC_*` or browser
  code.
- Use only the `OS_URL` and `OS_API_KEY` supplied to the current workload. The
  Site Gateway injects the separate product identity; never mint, copy, rename,
  or deploy a payments-specific OS key.
- A checkout return URL is navigation, not payment proof. Grant access only
  after a signed live event is durably and idempotently applied.
- Reading account or billing state must not create a provider customer,
  Checkout Session, or Customer Portal Session. Provider creates happen only
  from an explicit user mutation and remain idempotent.
- Checkout and portal server actions implement the portable validate-only
  request contract documented in their workflows. Probe requests reuse the
  normal auth and binding path, return an opaque short-lived OS receipt, and
  never fall through to provider create.
- Use the Egbe OS `egbe-os-analytics` skill as the sole source of payment event names,
  payloads, attribution, and delivery rules.

## Discovery And Readback

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/payments/skill" -s
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/payments/evidence" -s
```

Evidence is scoped to the current instance and intentionally omits customer
email values. Use it to verify provider objects; do not copy it into a second
payment-state artifact.

This GET automatically retries only failures to establish the gateway connection:
at most four attempts with 0.5/1/2-second backoff, within one 55-second budget.
Each connection attempt is capped at five seconds or the smaller remaining budget.
HTTP errors and failures while reading a response are returned without automatic
replay. Payment writes do not inherit this retry behavior.

An error envelope means provider readiness is unconfirmed; it does not establish
that Stripe is unconfigured or that a charge failed. After recovery is exhausted,
a later read may recheck readiness. Preserve the intended integration and the
reported failure; do not replace unavailable evidence with empty records or
change credentials based on a transient connection error.

## Missing product webhook recovery

Products stay active independently of their founder's agent runtime. When a
product webhook returns 404 or 405, Egbe records a deduplicated repair notice in
`GET /notifications` for local-agent projects. Read that notice, fix the signed
receiver, redeploy, and verify actual event delivery. Paid events continue to
return a retryable failure to Stripe until the product accepts them; an inbox
notice does not grant an entitlement or complete delivery. Expired checkout
notices may be acknowledged after the repair notice is durably recorded.
Retries share one unread notice; another failure after it is read reopens the
action. Marking a notice read does not resolve or repair the webhook.
