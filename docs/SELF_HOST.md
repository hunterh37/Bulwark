# Infrastructure and self-hosting

## What exists today (commit main)
Docs (PRD, architecture, security model), workspace config, shared TypeScript types,
and infra/terraform/main.tf defining 3 SQS queues and 1 KMS key. No service code,
no deployed resources. Nothing runs yet.

## Deployment model
Bulwark splits into a control plane and a runner (data plane).

| Part | Contains | Where |
|---|---|---|
| Control plane | web dashboard, API, accounts, billing, policy, fix-class stats | Bulwark cloud (SaaS) or customer |
| Runner | scanner, fixer, sandbox, GitHub/GitLab client, local queue, local findings store | Always in the place the customer picks |

The runner holds the repo credentials and all source code. It makes outbound HTTPS
calls only (to the control plane, the git host, and the LLM endpoint). No inbound
ports, so it works behind utility firewalls.

## Three tiers

1. Hosted. Runner and control plane both on Bulwark AWS. Team plan default.
2. Hybrid. Control plane on Bulwark cloud; runner in the customer VPC. Only finding
   metadata (rule, file path, severity, PR URL) goes to the control plane. Code stays home.
3. Fully self-hosted / air-gapped. Both planes in the customer environment. LLM via
   their Bedrock, Azure OpenAI, Vertex, or a local model. License key checked offline.
   Required for utilities under NERC CIP and for OT networks.

## Packaging (one artifact set for all tiers)

| Target | Artifact |
|---|---|
| Kubernetes (EKS, AKS, GKE, OpenShift, Rancher) | Helm chart deploy/helm/bulwark |
| AWS | Terraform module deploy/terraform-modules/aws (ECS or EKS, RDS, SQS, KMS) |
| Azure | Terraform module deploy/terraform-modules/azure (AKS, Postgres Flexible, Service Bus, Key Vault) |
| GCP | Terraform module deploy/terraform-modules/gcp (GKE, Cloud SQL, Pub/Sub, KMS) |
| Single VM / on-prem | docker compose deploy/compose |
| Air-gapped | Signed OCI image bundle + offline rule and CVE DB snapshots |

To make this possible the code must avoid cloud lock-in:
- Queue behind an interface: SQS, Service Bus, Pub/Sub, or Postgres-backed (pg-boss)
  for the compose and air-gapped installs.
- Postgres as the only database.
- Object storage via S3 API (S3, MinIO, Azure via gateway).
- Secrets via env or mounted files; KMS/Key Vault/Vault adapters.
- LLM provider interface: Anthropic API, Bedrock, Vertex, Azure, local OpenAI-compatible.
- Sandbox: Firecracker where nested virt or metal exists, gVisor (runsc) on regular
  Kubernetes nodes as fallback.
- Git host interface: GitHub App, GitHub Enterprise Server, GitLab, Bitbucket, Azure DevOps.

## Customer install (hybrid, target experience)
1. Sign up, create org, choose "Run in my cloud".
2. Dashboard shows a one-time runner token and a command:
   `helm install bulwark-runner oci://ghcr.io/hunterh37/charts/bulwark-runner --set token=...`
   or `terraform apply` with the AWS/Azure/GCP module.
3. Runner registers outbound, appears as online in the dashboard.
4. Connect git host; scans start.

## Supply chain (customers will audit this)
Images signed with cosign, SBOM per release (Syft), SLSA provenance from GitHub
Actions, reproducible version pins, published CVE scan of our own images.

## Hackathon scope
Hosted tier only: one runner container plus API on a single host via docker compose.
The interfaces above are defined from the start so hybrid and self-hosted need no rewrite.
