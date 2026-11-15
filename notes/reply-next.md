# Next steps, in order

1. Postgres plan. bulwark-db is on Render free and expires 2026-12-15 (data deleted). Upgrade to basic-256mb before then.
2. Web plan. Free web service sleeps after 15 min idle; first request takes ~50 s. Starter ($7/mo) keeps it warm for demos.
3. GitHub OAuth App. Create at github.com/settings/developers, callback `https://bulwark-cloud.onrender.com/v1/me/github/callback`, set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET on the service. The portal then shows "Connect with GitHub" instead of token paste.
4. Render auto-deploy. Pushes do not trigger deploys because the repo is linked by public URL. Connect the GitHub account in Render (Account settings > Git) so `autoDeploy` works.
5. Scan on push. Create a GitHub App with webhook `/v1/github/webhook` and set GITHUB_WEBHOOK_SECRET. Code already enqueues a scan per push.
6. Fix pipeline. `fix` jobs are stubbed: Claude patch generation, tests in a sandbox, PR only when tests pass and the finding is gone. This is the product's main claim and is not built.
7. Second module. `deps-osv`: parse package-lock, requirements.txt, go.sum and query OSV for CVEs. Utilities ask about vulnerable dependencies first.
8. Edge hardening. Sign the runner (Sigstore/cosign), publish the Docker image to GHCR, and ship an offline module-update bundle for air-gapped sites.
9. Unauthenticated GitHub API limit is 60 requests/hour per Render IP. Public-repo scans by users without a token will fail under load; use a server-side GitHub App token.
10. Custom domain, rate limiting on /v1/auth, password reset email, and a privacy page before any utility pilot.
