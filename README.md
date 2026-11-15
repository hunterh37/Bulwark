# Bulwark

Code scanning for power, water, EV charging and building automation software. Bulwark flags
insecure Modbus, DNP3, IEC 61850, IEC 60870-5-104, OCPP, OPC UA and BACnet configuration,
default credentials, leaked secrets and vulnerable dependencies (OSV.dev, CISA KEV). It opens a
fix pull request after rescanning the patch, and exports a CycloneDX SBOM and an evidence report.

Runs three ways: a GitHub Action in CI, Bulwark Cloud on a schedule, or the Edge runner inside a
plant network (connected or air-gapped).

```yaml
- uses: actions/checkout@v4
- uses: hunterh37/Bulwark@main
  with:
    fail-on: high
```

Measured accuracy: [eval/REPORT.md](packages/cloud/eval/REPORT.md) (labeled corpus, CI gate) and
[eval/FIELD.md](packages/cloud/eval/FIELD.md) (15 public OT repositories, hand labels).
Status: [notes/reply-next.md](notes/reply-next.md). Market research: [notes/research-market.md](notes/research-market.md).

Built at Sundai Hack 149 (MIT, Nov 15 2026).

| Path | Purpose |
|---|---|
| packages/cloud/public | Landing page + customer portal, served by bulwark-cloud |
| apps/web | Earlier Next.js prototype (not deployed) |
| packages/cloud | Bulwark Cloud: accounts, GitHub, modules, scans, runner API (Render) |
| packages/cloud/src/modules | Detector modules: grid-ot, secrets-core, deps-osv |
| packages/cloud/eval | Labeled corpus, field eval on pinned public repos, reports |
| action.yml | GitHub Action: CI gate, SARIF, SBOM |
| packages/cloud/src/runner | Bulwark Edge runner, bundled to one file |
| deploy/edge | Edge kit: Dockerfile, compose, systemd installer |
| render.yaml | Render Blueprint for all hosted services + Postgres |
| services/scanner, fixer, sandbox | Design stubs for the AWS target (README only, not built) |
| packages/shared | Types, finding schema, queue job contracts |
| infra/terraform | AWS: VPC, ECS Fargate, RDS Postgres, SQS, S3, KMS |
| docs | PRD, architecture, security model |

Spec: [docs/PRD.md](docs/PRD.md). Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Infrastructure

Hosted (live): Render runs one Node service, `bulwark-cloud` (portal, API, job worker), plus
Postgres `bulwark-db`. GitHub webhooks hit the API; the worker scans, patches, and opens PRs.
Config: [render.yaml](render.yaml).

Scale-out design (not built): AWS via [infra/terraform](infra/terraform), with ECS Fargate
workers, SQS, RDS, S3, KMS and a sandbox that runs customer tests on the patched tree.

Self-host and air-gapped Edge: [docs/SELF_HOST.md](docs/SELF_HOST.md). Diagram:
[docs/Bulwark-Infrastructure.pdf](docs/Bulwark-Infrastructure.pdf).

Live: https://bulwark-cloud.onrender.com. Infrastructure: [docs/Bulwark-Infrastructure.pdf](docs/Bulwark-Infrastructure.pdf).
Tests in packages/cloud: `npm test`, `node eval/run.mjs`, `node test/e2e.mjs <url>`, `node eval/field.mjs <cache-dir>`.
