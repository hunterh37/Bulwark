# Bulwark PRD

## Problem
Utilities, grid operators, DER/EV-charging platforms and energy SaaS run software that
NERC CIP, TSA and CISA guidance now treat as critical. Most of these teams have no
AppSec staff. Scanners produce alert backlogs; nobody writes the fixes.

## Customer
Engineering teams of 20 to 500 at grid-dependent companies: energy SaaS, utility IT/OT
software vendors, EV charging networks, solar/storage fleet operators, grid analytics.
Buyer: CTO or VP Eng. Later: CISO at utilities (enterprise tier).

## Product
1. Signup with Google or GitHub. Install the Bulwark GitHub App on selected repos.
2. Baseline scan of each repo: SAST, dependencies (SCA), secrets, IaC, containers.
3. Continuous: every push, PR, and every new CVE in the OSV feed rescans affected repos.
4. Triage: LLM ranks findings by reachability and grid impact (OT protocol code,
   auth, SCADA/Modbus/DNP3/OCPP handlers ranked higher).
5. Fix: patch generated, applied in a sandbox, customer tests run, finding rescanned.
6. Ship: PR opened with evidence (before/after scan, test log, risk note).
7. Learn: merge rate per fix class; low-merge classes drop to suggestion-only.

## Safety rules for fixes
- Never push to the default branch. PR only. Auto-merge opt-in per fix class
  (dependency patch bumps only at launch).
- PR opens only if: tests pass, finding gone on rescan, no new findings, diff under
  caps (files, lines).
- Protected paths (auth, migrations, infra, OT protocol handlers) require human approval.
- Kill switch per org and global.
- Append-only audit log of every action.

## Data handling
- Code cloned into an ephemeral microVM, deleted after the job. No code at rest.
- Findings stored (file, line, rule, snippet hash), encrypted with per-tenant KMS keys.
- LLM calls go through Claude API with zero data retention.
- Short-lived GitHub installation tokens only.

## Plans
| Plan | Price | Includes |
|---|---|---|
| Free | $0 | 1 repo, scans, no auto-fix |
| Team | $49 per repo per month | Fix PRs, Slack alerts, 30-day audit log |
| Enterprise | Custom | SSO/SAML, self-hosted runner, NERC CIP evidence export, SLA |

## Metrics
Repos connected, findings fixed, PR merge rate, median time to fix, MRR.

## Roadmap
- H0 (hackathon): GitHub App, dependency + secrets scan, fix PR for dependency bumps, Stripe checkout.
- M1: SAST fixes, Slack, dashboard.
- M3: SOC 2 Type I, self-hosted runner, OT-protocol rule pack.
- M6: SOC 2 Type II, NERC CIP-007/010 evidence reports, GitLab.

## Go-to-market
Hackathon: Egbe landing page, waitlist, ad test, outreach (see notes/reply-egbe.md).
After: own domain, content on grid CVEs, free public-repo scan as lead magnet.
