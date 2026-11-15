# Buildout status (2026-11-15, version 1.1.0)

Live at https://bulwark-cloud.onrender.com, commit on main deployed through the Render API.
Checks: unit 13/13, eval gates pass, end-to-end 42/42 against production (opened, verified and closed
hunterh37/bulwark-e2e-plant PR #8), CI green on main.

## What the review found

The 1.0.0 rules matched any line that mentioned a protocol identifier. On 15 public OT repositories
(10,233 files) they reported 5,192 findings; 4,829 came from three rules. The eval corpus had been
written with the rules, so it showed 1.000 precision while the product was unusable on real code.

## Shipped in 1.1.0

| Area | Change | Evidence |
|---|---|---|
| Rules | Call-shaped matching; comments, imports, declarations, translation files and loopback binds skipped; test, example and third-party paths reported at low severity | packages/cloud/eval/FIELD.md: 47 live findings, hand-labeled precision 0.66 (31 true, 16 false) |
| Corpus | 77 labeled lines including the field false positives, 12 fix cases | eval/REPORT.md: precision 1.000, recall 1.000, autofix 11/11, deps 4/4 |
| Findings | CWE id, fingerprint, first-seen date, new flag; ignored and PR-open state carries across scans | e2e "rescan keeps ignored status, 0 new" |
| Dependencies | CISA KEV flag raises severity to critical; 1,781 entries loaded in production | /healthz `kev` |
| SBOM | CycloneDX 1.5 per repository from the portal and from the Edge runner | e2e "sbom CycloneDX 1.5" |
| Evidence | Printable report at /v1/me/report: scope, commits, findings, fixes, audit log, mapping to IEC 62443-4-1 practice areas, CRA Annex I Part II, NERC CIP-013 | e2e "evidence report" |
| Monitoring | Rescan every 6 h, daily or weekly per organization; alert webhook for new high and critical findings | src/jobs.ts `scheduleDue`, src/notify.ts |
| CI | action.yml at the repo root; runner flags `--fail-on`, `--osv`, `--list` | e2e "edge CI gate exits 2" |
| Account | Password change, self-serve organization deletion, free plan limit of 3 repositories | e2e |
| Hardening | CSP and HSTS headers, runner upload validation, webhook URL checks against private addresses, error handler without stack traces | test/modules.test.mjs, e2e "security headers" |
| Portal | Finding filters, fix dialog with diff and rescan result, Settings pane, docs page at /docs | packages/cloud/public |
| Material | 30 s demo with real portal footage, 6-page overview PDF | promo/renders/bulwark-demo-30s.mp4, docs/Bulwark-Overview.pdf |

## Needs the account owner

1. Render free tier. The web service sleeps after 15 minutes idle, which pauses scheduled rescans until the next request. bulwark-db expires 2026-12-15. Move both to paid plans.
2. Billing. No checkout exists. Stripe account and price ids are needed before Team can be sold.
3. GitHub App plus GITHUB_WEBHOOK_SECRET for scan on push, and an OAuth app (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET) for one-click connect.
4. GITHUB_TOKEN on the service lifts the 60 per hour unauthenticated GitHub limit for public-repo scans.
5. ANTHROPIC_API_KEY on the service enables model patches for rules without an autofix.
6. A domain and a contact address. The landing page sends pilot requests to GitHub issues.
7. Edge image: edge-image.yml pushes ghcr.io/hunterh37/bulwark-runner:1.1.0 on the main push; confirm the package is public.

## Open engineering

- Field precision of ot.dnp3-no-sa (0.38) and ot.opcua-security-none (0.50). Both fire inside library wrappers.
- Recall on real repositories is unmeasured. It needs labeled code from design partners.
- Matching is per line with no data flow.
- Customer tests are not run before the pull request; the customer's CI runs on the branch.
- One user per organization. No password reset email, no SSO, no roles.
- Rate limits are in memory, per instance.
- The GitHub Action downloads the runner from the hosted service at run time. A tagged release with the runner attached would pin it.
- No paying customer and no design partner yet. Market notes with unconfirmed items: notes/research-market.md.
