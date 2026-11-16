---
name: egbe-os-wallet
description: Read wallet funds, current operating charges and service limits, or prepare a top-up link.
metadata:
  egbe-when: "Use when a spending decision or customer commitment depends on available resources, or the wallet needs replenishing."
  egbe-visible: "true"
  egbe-title: "Egbe Wallet control"
  egbe-description: "Check available funds and operating charges or prepare a top-up link when needed."
  egbe-category: "Business operations"
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


# Wallet

The prepaid Wallet funds periodic project operation and metered services such
as AI and paid tools. New accounts start with a small free-tier balance. Read
the project's current policy before inferring a charge or funded runway.

Base URL: `https://os.hz.egbe.dev`. Authenticate every call with
`Authorization: Bearer $OS_API_KEY`.

## Check balance

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/wallet/balance" -s
```

Response `data.wallet`:
- `available_to_spend_cents` — what you can spend now (settled minus held).
- `settled_balance_cents` — settled funds.
- `held_cents` — reserved by in-flight operations.

## Read the operating policy

Before budgeting continued operation or making customer commitments, read the
balance and this project's existing policy:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/wallet/policy" -s
```

`data.policy` is a read-only snapshot. It does not debit the Wallet, advance a
billing clock, buy credit or change a subscription.
Existing authentication fences still apply: read it before making commitments,
and do not assume an agent can keep querying after work/access is disabled.
Use the owner's normal Dashboard recovery path if access is blocked; never ask
for administrator credentials to bypass the fence.

- `wallet_funded_project` identifies whether this policy applies. `false` and
  null policy fields mean no wallet-funded enrollment, not free legacy service.
- `service_fee` gives the existing installment in cents, its interval in
  seconds, the billable states, and the persisted billing clock. A delayed
  sweep can charge several completed intervals; a small remaining balance is
  not a cap on a due installment. Paused states are not currently billable.
- `welcome_credit_expires_at` describes a remaining welcome-credit bucket in
  this Wallet. It does not assert that every positive balance is promotional.
- `depletion` explains when new paid work stops and the purchased-funds runtime
  grace conditions. Grace is conditional, time limited and subject to the
  owner's aggregate floor across wallet-funded businesses; it is not extra
  spendable credit or guaranteed service continuity.
- `retention` gives the pause retention period and any recorded deletion
  deadline. Read the actual state/deadline rather than inventing a recovery date.

`commercial_pricing` reports the usage markup, top-up fee and revenue share.
Paid usage carries a 15% Egbe service fee on the underlying service price:
$10 of usage + $1.50 fee = $11.50 total. Top-ups credit the full amount with no
Egbe top-up fee. Egbe takes no revenue share; processor fees, taxes, refunds and
chargebacks can still affect payouts. Transfers, credits, promotional expiry
and the periodic business fee do not incur the usage markup. Promotional funds
pay the same usage prices as purchased funds. Underlying prices can be
provider-reported costs or configured rates/estimates, not exact invoice costs.

Quote budgets including the usage fee before approval. Provider campaign
budgets and hold API amounts remain underlying-service amounts: a $10 provider
budget reserves $11.50 including the fee. For an approved total Wallet budget,
fit the provider budget and fee inside it. Unused reservations are released
without a fee. Fractional cents carry forward; do not round up each request.
Journal metadata exposes `usage_base_cents`, `egbe_usage_fee_cents` and
`usage_total_cents` for itemized charges. Fees apply only to new usage journals;
retries do not add another fee.

Additional service usage is separate from the periodic fee. This snapshot and a
positive balance do not establish the full hosting, database, tool or customer
fulfillment cost, funded runway, or a hard spending limit. Report current rates
where available and distinguish missing cost data from a zero charge.

When present, `usage_cost_basis` describes current managed Wallet accounting:
AI, paid tools and advertising can produce additional usage debits. Managed app
hosting and the attached database currently have no separate usage meter in
that accounting path; the periodic project fee still applies. This is not a
perpetual free-service promise, a provider price quote or a statement about
external/manual charges. The Wallet is not a hard spending cap: reconciliation
of incurred usage and due fees can exceed a small available balance. A null or
missing basis is unknown, including legacy projects and older deployments.
Use capability-specific costs or proportionate estimates for variable work.
Sale deductions, refunds, chargebacks and payout timing remain separate
commercial questions; absence of a Wallet debit does not erase those liabilities
or establish a required gross-refund Wallet deposit.

Read the current [Egbe commercial terms](https://egbe.ai/terms/) separately for
sale and top-up fees, merchant responsibilities, payouts and refunds. Do not
substitute a generic direct-provider tariff. If policy discovery is unavailable
during rollout, report that gap; do not infer a zero-cost policy or buy credit.

## Work within an authorized amount

The periodic fee belongs to the existing active project. It accrues whether or
not you build, publish or attach the managed database; stopping it means pausing
or deleting the project, which is the owner's choice. Authorized product work
does not create that commitment. Under `usage_cost_basis`, the Wallet usage that
building adds comes from the AI, paid-tool and advertising operations you choose,
plus any option a capability marks as consuming Wallet resources, such as a warm
`min_instances` deployment.

When the founder has authorized a specific amount for this work, including any
recurring fee they accepted, that authorization covers operations whose expected
cost fits within it. Without a hard platform cap, you enforce the limit: prefer
unmetered capabilities, estimate metered work before starting it, recheck the
balance at material points and stop before an operation would exceed the
remaining authorized amount. Report the limit as manually enforced. Do not
withhold authorized work, ask again for the same permission or require a
platform-enforced cap because the Wallet does not provide one. The authorization
never covers top-ups, card charges, purchases, spending the founder excluded such
as advertising, or anything beyond the stated amount. Whether the remaining
credit can sustain a customer promise is an offer-sizing question, not a reason
to skip authorized preparation.

## Top up

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/wallet/topup" -s -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"amount_cents":1000}'
```

Optional `currency` (default `"usd"`). Starts a top-up (min `100` cents = $1.00) and returns a top-up intent with a
`checkout_url`. Open that Stripe checkout link and complete payment; your wallet is credited automatically once the
payment succeeds. If `checkout_url` is `null`, retry shortly.
