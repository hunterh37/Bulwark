---
name: egbe-os-analytics
description: Set up tracking and report visits, registrations, purchases, revenue and funnel performance.
metadata:
  egbe-when: "Use for traffic/conversion evidence; offer when tracking gaps prevent measuring progress."
  egbe-visible: "true"
  egbe-title: "Product analytics"
  egbe-description: "Connect web analytics and see how people use your product, where they drop off and which channels bring signups and purchases."
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


# Analytics

Privacy-friendly product analytics through the egbe OS analytics capability.
Authenticate with `Authorization: Bearer $OS_API_KEY`. Base URL:
`https://os.hz.egbe.dev`.

This skill is the source of truth for product analytics event names, attribution,
and validation rules. Product workflows reference this
contract instead of inventing event names, UTM fields, or attribution payloads.

The canonical contract defines valid event semantics and delivery, not the
complete measurement inventory for every product. Derive applicable coverage
additively from the caller-supplied product requirements and real behavior.
Never select one product-type minimum as a substitute for that inventory.

## Canonical Event Contract

Read the machine-readable event config:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/analytics/events" -s
```

Canonical product events:

- `campaign-visit` - system first-touch acquisition event emitted by the shared
  tracking snippet for explicit UTM/click-id campaign attribution. Keep this
  exact name; analytics-gateway campaign reports are built around it.
- `cta_click` - primary conversion-driving CTA click.
- `button_click` - meaningful non-primary button click.
- `activated` - real first-value/core-action completion.
- `signup_started`
- `signup_submitted`
- `signup_completed`
- `email_verified`
- `paywall_view`
- `checkout_started`
- `purchase`
- `subscription_renewed`
- `subscription_canceled`
- `refund`

Use event payload fields for product-specific details. Do not encode page,
product, button, or activation details in the event name. For example, use
`activated` with `activation_type: "audit_generated"` rather than
`activation:audit_generated`.

## Complete Product Funnel

When planning or implementing analytics across a complete Product journey,
read:

```text
references/workflows/product-funnel-tracking.md
```

Use it to account for every caller-required measurement moment, map applicable
pageviews, meaningful interactions, core outcomes, signup, and verification to
the live canonical contract, reuse existing analytics wiring, and select only
the focused workflows the product needs.

## Landing Click Tracking

When instrumenting public landing, pricing, demo, or pre-auth product surfaces,
use this installed skill and read:

```text
references/workflows/landing-click-tracking.md
```

That workflow explains how the canonical click payload fields map to HTML
`data-umami-event-*` attributes and includes complete `cta_click` and
`button_click` examples. It distinguishes ordinary navigation from
JavaScript-handled links: use a button for an in-page action or emit once from
the existing link handler without a declarative trigger. It also owns bounded
verification: inspect declarative attributes, and check JavaScript-owned CTA
behavior with a real click while the tracker is loaded and collection is isolated.

Use `cta_click` for the page's primary conversion or evaluation action. It is
not limited to `/signup`; a product demo, generated sample, waitlist, checkout,
contact-sales, or install action can be a CTA when that is the primary next
step. Use `button_click` for meaningful secondary interactions only.

## Signup Lifecycle Tracking

When instrumenting signup, registration, account creation, or lead-capture
flows, use this installed skill and read:

```text
references/workflows/signup-lifecycle-tracking.md
```

That workflow explains browser `signup_started` / `signup_submitted` delivery,
backend-confirmed `signup_completed`, conditional `email_verified`, first-touch
attribution handoff, and the short-lived pending queue pattern for redirecting
signup flows.

## Activation Tracking

When instrumenting a product's real first-value moment or core action
completion, use this installed skill and read:

```text
references/workflows/activation-tracking.md
```

That workflow explains when to emit canonical `activated`, how to use
`activation_type`, how to preserve first-touch attribution, and how to deliver a
backend-confirmed activation descriptor from the browser session.

## Payment Lifecycle Tracking

When instrumenting paywalls, checkout, purchases, subscriptions, cancellation,
or refunds, use this installed skill and read:

```text
references/workflows/payment-lifecycle-tracking.md
```

That workflow separates browser-session payment events from signed
out-of-session lifecycle events and defines how checkout attribution reaches
durable payment state. The machine-readable event contract remains authoritative
for required payload fields.

## Attribution

The shared tracking snippet stores first-touch attribution in the browser and
exposes it as:

```js
window.__egbeAttribution.read()
```

The snippet emits `campaign-visit` only when the visitor has explicit campaign
or click-id attribution such as `utm_*`, `gclid`, `fbclid`, `msclkid`, or
`ttclid`. Referrer-only visits do not fire `campaign-visit` by themselves; use
Umami's native referrer fields for organic/referral reporting. When
`campaign-visit` does fire, include `referrer` as an optional payload field if
the browser provides one.

Forward that payload into signup and checkout requests when the product has a
backend flow. Persist the first-touch fields with the durable signup, user, or
payment metadata so later revenue reporting can join back to the original
channel.

Recommended attribution fields:

- `visitor_id`
- `visit_id`
- `first_utm_source`
- `first_utm_medium`
- `first_utm_campaign`
- `first_utm_content`
- `first_utm_term`
- `first_gclid`
- `first_fbclid`
- `first_msclkid`
- `first_ttclid`
- `first_landing_path`
- `first_referrer`
- `first_seen_at`

First-touch fields should remain stable for the visitor. Later touch data may
be stored separately, but channel-level reports use first-touch by default.

## Lifecycle Event Delivery

Separate two responsibilities:

- **confirmation source**: the code that knows the durable lifecycle fact is
  true;
- **Umami delivery**: the code that sends the canonical event to Umami.

For user-session funnel events, the backend may confirm the fact, but the
browser must deliver the Umami event with `window.umami.track(...)`. Direct
backend `/api/send` calls can appear in aggregate charts but may receive a
different Umami `session_id`, so they do not reliably appear in the user's
session timeline.

Use this pattern for browser-session lifecycle events:

1. Browser sends first-touch attribution from `window.__egbeAttribution.read()`
   with the product request.
2. Backend performs the durable state change.
3. Backend returns an analytics descriptor only after success:

```json
{
  "ok": true,
  "analytics": {
    "name": "signup_completed",
    "data": {
      "product_slug": "my-app",
      "path": "/signup",
      "surface": "signup_form",
      "account_id": "123",
      "visitor_id": "...",
      "visit_id": "...",
      "first_utm_source": "meta"
    }
  }
}
```

4. Browser sends the descriptor with the loaded Umami tracker:

```js
if (data.analytics?.name && window.umami?.track) {
  window.umami.track(data.analytics.name, data.analytics.data || {});
}
```

If the success flow redirects immediately, put the descriptor in a short-lived
`sessionStorage` pending queue, navigate, then flush it from the next page with
`window.umami.track(...)`.

Use server-confirmed browser delivery for:

- `activated` when first value is created by an API/server action;
- `signup_completed`;
- `email_verified` when the verification completes in a browser return page;
- `checkout_started` before redirecting to checkout;
- `purchase` when a checkout success page can confirm paid state with the
  backend.

Backend direct delivery is only for webhook, renewal, refund, admin/system, or
other out-of-session events with no browser session to join:

- subscription renewals;
- refunds;
- webhook-only purchases where no success return can emit from the browser;
- admin/system subscription cancellations.

When backend direct delivery is used, persist first-touch attribution with the
account/payment metadata so revenue and retention reporting can still join back
to the acquisition channel. Treat Umami `{"beep":"boop"}` as filtered delivery,
not success, if a backend collector send is used.

Do not use optional `engagement-click`, `engagement-scroll`, or
`engagement-time` telemetry as canonical funnel coverage. Those events are not
aliases for `cta_click`, `button_click`, or lifecycle events.

## Register a Site and Get Tracking

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/analytics" -s -X POST  \
  -H "Content-Type: application/json" \
  -d '{"app":"my-app","domain":"my-app-abc1234.n.egbe.app"}'

OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/analytics/my-app/tracking" -s
```

**Always pass `domain` = your deployed public host.** Umami only counts pageviews
whose hostname matches the site's registered `domain`; if you omit it the domain
stays null and every event is dropped, so stats read 0 no matter how much real
traffic arrives. Use the `host` the deploy returned (`<slug>-<public_id>.n.egbe.app`),
not the bare slug. You can re-POST with an updated `domain` any time.

Embed the returned `trackingSnippet` once in the app shell/layout and complete
the required Session Replay setup below. Prefer the shared snippet over
hand-building a raw Umami `<script>` because it includes first-touch campaign
attribution and `campaign-visit` support.

## Session Replay

Session recording is required when setting up analytics for a new product,
including local-agent work without a preset or scaffold. The standard scaffold
already performs this setup; preserve its tracker, recorder, and configuration.

Sites are provisioned with session replay enabled, but the base `trackingSnippet`
(`script.js`) does **not** load the recorder by itself. Replay stays silently at
zero sessions until you embed a **second** tag.

### Set up recording without a scaffold

1. Register the site with its public hostname as described above.
2. Explicitly enable recording and save the product settings: `sampleRate: 1.0`
   (100% of sessions), `maskLevel: "moderate"`, and `maxDuration: 1800000`
   (30 minutes). Do not rely on the gateway's older sampling/duration defaults.

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/analytics/my-app/replay" -fsS -X POST  \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"replayConfig":{"sampleRate":1.0,"maskLevel":"moderate","maxDuration":1800000}}'

OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/analytics/my-app/tracking" -fsS
```

3. Read `data` from the tracking response. It contains a ready-to-paste
   `recorderSnippet` alongside `trackingSnippet`:

```json
{
  "trackingSnippet": "<script defer src=\".../script.js\" data-website-id=...></script>",
  "replayEnabled": true,
  "replayConfig": {"sampleRate": 1, "maskLevel": "moderate", "maxDuration": 1800000},
  "recorderScriptUrl": "https://analytics.hz.egbe.dev/recorder.js",
  "recorderSnippet": "<script defer src=\".../recorder.js\" data-website-id=... data-sample-rate=... data-mask-level=... data-max-duration=...></script>"
}
```

4. Embed **both** tags once in the shared app shell/layout — `trackingSnippet`
   for pageviews and events, `recorderSnippet` for session replay on all pages.
   Keep the recorder's returned `src`, `defer`, `data-website-id`,
   `data-sample-rate="1"`, `data-mask-level="moderate"`, and
   `data-max-duration="1800000"`. In Next.js, use `next/script` with stable IDs
   and `strategy="afterInteractive"` in the root layout, preserving the same
   attributes. Keep the tracker and its attribution script as well.

If replay is disabled or the recorder snippet is missing after setup, resolve
the configuration error before considering analytics setup complete. A site
with only the base tracker does not have session recording.

5. Add a privacy-page disclosure that the product uses masked session recordings
   of page interactions to improve usability, with recording enabled for all
   sessions and capped at 30 minutes. Preserve the scaffold's disclosure when
   using it, and link the page from the product footer. Exclude sensitive displayed
   content using `blockSelector` in `replayConfig` (returned as
   `data-block-selector`); input masking alone does not hide all page text.

Verify the wiring and attributes locally. After publication, confirm the Replays
list in the site's Umami dashboard (or its share link) fills as real sessions
arrive. Do not send synthetic production events for this check.

## Read Stats and Campaigns

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/analytics/my-app/stats?period=7d" -s

OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/analytics/my-app/campaigns?period=all" -s
```

`period` is `1h | 24h | 7d | 30d | all` (default `24h` for stats, `all` for
campaigns). For a calendar day or another exact interval, supply both `from`
and `to` as ISO 8601 timestamps with a timezone (`Z` or an explicit UTC offset).
The interval is start-inclusive and end-exclusive: `[from, to)`. These bounds
override `period`; `to` must be later than `from`. Timestamps are normalized to
UTC at millisecond precision; date-only or timezone-less values are rejected.

For example, the full day 20 October 2026 in Europe/Lisbon is:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/analytics/my-app/stats" -sG  \
  --data-urlencode 'from=2026-10-20T00:00:00+01:00' \
  --data-urlencode 'to=2026-10-21T00:00:00+01:00'
```

Use the same bounds with `/campaigns`. Derive each boundary in the report's
timezone, including its offset at that instant: a calendar day can be 23 or 25
hours across daylight-saving changes. For today so far, use local midnight to
the report cutoff; for the previous complete day, use consecutive local
midnights. A rolling `period=24h` is not either calendar-day window.

Stats are for reporting and real channel iteration decisions. Do not send
synthetic product events just to make stats pass a readiness check.

For individual event rows, read `/analytics/<appSlug>/events` and
`/analytics/<appSlug>/event-data` with `startAt` / `endAt` (inclusive UTC Unix
milliseconds), `page` (from 1) and `pageSize` (up to 500). Each envelope's `data`
contains `{data: [...], count, page, pageSize}`. Join event `id` to property
row `eventId`; paginate both through `count` with the same window. For a funnel
analysis, use the [session evidence collector](references/session-funnel.md)
to retain sanitized inputs and reproduce the calculation offline.

## Reporting customer metrics

When reporting registrations, buyers, purchases, or revenue, exclude known
synthetic activity from customer totals. Check the available account/payment
records and product verification history for validation identities, agent or
smoke/E2E runs, and explicit test markers such as `livemode=false` or
`metadata.egbe_test`. A live-mode payment can still be a documented test.

Use evidence tied to the account or transaction, not suspicious email spelling
alone. Separate unresolved records from confirmed tests and qualify totals when
their customer status is uncertain. Apply the same exclusions to related
registration, buyer, purchase, and revenue calculations; count distinct accounts
or buyers separately from payment/event counts. A pending checkout is not a
purchase.

Prefer the product's account records for registrations and confirmed payment
records for purchases. If only aggregate analytics is available and test activity
cannot be isolated, label it as unfiltered events, not verified customer totals.
Do not estimate exclusions from unrelated periods or incomplete samples.

Briefly state the source, reporting period, excluded test counts and evidence,
and any unresolved activity or coverage gaps. Filter the report, not the source
records; use existing data rather than adding instrumentation for this answer.

## Public Dashboard Share Link

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/analytics/my-app/share" -s -X POST
```

The response carries `shareUrl`.

## List and Inspect Sites

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/analytics" -s

OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/analytics/my-app" -s
```

## Validation Policy

Verify instrumentation proportionally. Do not use synthetic product events as
funnel-readiness proof.

- Setup: the analytics site exists and tracking config is available.
- Wiring: the tracking snippet or public analytics env is present in the app
  shell and live app wiring.
- Declarative interaction tracking: inspect the built or rendered clickable
  element and its canonical `data-umami-event-*` attributes. Static attributes
  do not require a browser journey or network interception proof.
- Imperative behavior: when event delivery depends on a runtime branch or an
  authoritative success boundary, drive the smallest relevant flow and
  intercept/mock analytics delivery without writing test events into production
  stats.
- Observation: read real stats from real users for reports and channel-level
  decisions.

Do not fake non-existent lifecycle events. If a product has no signup, payment,
subscription, or refund lifecycle yet, mark that area as not applicable or
pending in product metadata instead of emitting fake events.

## Privacy

Do not put raw emails, secrets, tokens, direct personal identifiers, or payment
details into Umami payloads. Use non-sensitive internal IDs only when needed.
