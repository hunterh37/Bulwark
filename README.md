# Bulwark

Always-on security for grid software. Bulwark watches connected GitHub repos, finds
vulnerabilities, writes fixes, proves them safe in a sandbox, and opens a pull request.

Built at Sundai Hack 149 (MIT, Nov 15 2026).

| Path | Purpose |
|---|---|
| packages/cloud/public | Landing page + customer portal, served by bulwark-cloud |
| apps/web | Earlier Next.js prototype (not deployed) |
| packages/cloud | Bulwark Cloud: accounts, GitHub, modules, scans, runner API (Render) |
| packages/cloud/src/modules | Detector modules: grid-ot (first module), secrets-core |
| packages/cloud/src/runner | Bulwark Edge runner, bundled to one file |
| deploy/edge | Edge kit: Dockerfile, compose, systemd installer |
| render.yaml | Render Blueprint for all hosted services + Postgres |
| services/scanner | Runs Semgrep, Trivy, gitleaks, OSV against a commit |
| services/fixer | LLM patch generation (Claude API) |
| services/sandbox | Runs customer tests on the patched tree in a Firecracker microVM |
| packages/shared | Types, finding schema, queue job contracts |
| infra/terraform | AWS: VPC, ECS Fargate, RDS Postgres, SQS, S3, KMS |
| docs | PRD, architecture, security model |

Spec: [docs/PRD.md](docs/PRD.md). Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Infrastructure

Hosted (live): Render runs one Node service, `bulwark-cloud` (portal, API, job worker), plus
Postgres `bulwark-db`. GitHub webhooks hit the API; the worker scans, patches, and opens PRs.
Config: [render.yaml](render.yaml).

Production target: AWS via [infra/terraform](infra/terraform). ECS Fargate runs scanner and
fixer, SQS queues jobs, RDS holds findings, S3 stores artifacts, KMS seals repo tokens.
Patches are tested in Firecracker microVMs (services/sandbox).

Self-host and air-gapped Edge: [docs/SELF_HOST.md](docs/SELF_HOST.md). Diagram:
[docs/Bulwark-Infrastructure.pdf](docs/Bulwark-Infrastructure.pdf).

Live: https://bulwark-cloud.onrender.com. Infrastructure: [docs/Bulwark-Infrastructure.pdf](docs/Bulwark-Infrastructure.pdf).
Tests: `npm test` and `node test/e2e.mjs <url>` in packages/cloud.

## Local Foundation-Sec model

A secure on-demand GPU inference API is provided in
[deploy/local-ai](deploy/local-ai/README.md). See the
[API setup and team usage guide](docs/LOCAL_MODEL.md).
This package does not change the existing cloud backend; callers must supply
the documented Bearer Authorization header.
