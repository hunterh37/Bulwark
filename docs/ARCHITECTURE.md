# Architecture

```
GitHub ──webhook──> apps/api ──> SQS scan-jobs ──> services/scanner (Fargate)
                       │                                 │ findings
                       │                                 v
Stripe ──webhook──>    │         Postgres (RDS) <── triage (Claude API)
                       │                                 │
apps/web (Vercel) <────┘                    SQS fix-jobs v
                                         services/fixer ──> services/sandbox
                                         (Claude API patch)  (Firecracker on EC2 metal)
                                                                  │ pass
                                                                  v
                                                        GitHub PR via App token
```

| Concern | Choice |
|---|---|
| Web | Next.js on Vercel, Auth.js (Google, GitHub) |
| API | Node 22 + Fastify on ECS Fargate |
| Queue | SQS with DLQ |
| DB | Postgres 16 on RDS, row-level security per tenant |
| Secrets | AWS KMS + Secrets Manager; GitHub App private key in KMS |
| Sandbox | Firecracker microVMs on EC2 metal, no network except package mirrors |
| Scanners | Semgrep, Trivy, gitleaks, osv-scanner |
| LLM | Claude API (triage, patch) |
| Billing | Stripe Checkout + Billing, metered per repo |
| Observability | OpenTelemetry, Sentry |
| IaC | Terraform |
| CI | GitHub Actions |
