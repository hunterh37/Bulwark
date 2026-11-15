# Next steps status (2026-11-15)

Built, deployed to https://bulwark-cloud.onrender.com and tested (prod e2e 33/33, unit 6/6, eval gates pass):

- Fix pipeline: Fix button, dry-run diff, rescan gate, PR from default-branch head. Prod e2e opened, verified and closed hunterh37/bulwark-e2e-plant PR #3.
- deps-osv module: npm, PyPI, Go lockfiles against OSV.dev; Edge runners query through /v1/runner/osv.
- Signed Edge image: ghcr.io/hunterh37/bulwark-runner:1.0.0, public, cosign keyless signature, built by .github/workflows/edge-image.yml.
- Eval harness: packages/cloud/eval (47 labeled lines, 11 fix cases, 4 lockfiles). precision 1.000, recall 1.000, autofix 10/10, deps 4/4. CI runs it on every push. Corpus was written with the rules; it guards regressions and does not measure field accuracy.
- Rate limits: 20 auth POSTs per IP per 15 min, 600 API requests per IP per min.
- Privacy page at /privacy. CI workflow fixed (was calling missing pnpm scripts).

Needs an account owner (credentials or billing, not doable from the CLI):

1. bulwark-db free Postgres expires 2026-12-15. Upgrade in Render to basic-256mb.
2. Free web service sleeps after 15 min idle. Starter plan removes the cold start.
3. GitHub OAuth App for one-click connect: callback https://bulwark-cloud.onrender.com/v1/me/github/callback, then set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.
4. Connect GitHub in Render account settings so pushes auto-deploy (deploys are triggered by API today).
5. GITHUB_TOKEN on the service (bot account, public_repo read) lifts the 60/hour unauthenticated GitHub limit.
6. ANTHROPIC_API_KEY on the service enables model patches for rules without an autofix.
7. GitHub App plus GITHUB_WEBHOOK_SECRET for scan-on-push.

Open engineering items: run customer tests in a Bulwark sandbox before the PR, a field corpus from public SCADA/OCPP repos, Helm chart, password reset email.
