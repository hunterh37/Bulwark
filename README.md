# Bulwark

Always-on security for grid software. Bulwark watches connected GitHub repos, finds
vulnerabilities, writes fixes, proves them safe in a sandbox, and opens a pull request.

Built at Sundai Hack 149 (MIT, Nov 15 2026).

| Path | Purpose |
|---|---|
| apps/web | Next.js marketing site + customer dashboard |
| apps/api | Fastify API, GitHub App webhooks, Stripe webhooks |
| services/scanner | Runs Semgrep, Trivy, gitleaks, OSV against a commit |
| services/fixer | LLM patch generation (Claude API) |
| services/sandbox | Runs customer tests on the patched tree in a Firecracker microVM |
| packages/shared | Types, finding schema, queue job contracts |
| infra/terraform | AWS: VPC, ECS Fargate, RDS Postgres, SQS, S3, KMS |
| docs | PRD, architecture, security model |

Spec: [docs/PRD.md](docs/PRD.md). Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
