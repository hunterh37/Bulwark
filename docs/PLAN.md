# Plan

Bulwark is always-on security for grid-dependent software. Teams connect GitHub once,
and a runner (in our cloud or theirs) scans every change, writes the fix, proves it
passes their tests in a sandbox, and opens a pull request. Code never has to leave the
customer's stack, which is what utilities and energy companies require.

## Initial idea, 3 steps
1. Connect: sign up, install the GitHub App, pick hosted or self-hosted runner.
2. Find: every push and every new CVE triggers a scan for vulnerable dependencies,
   leaked secrets and unsafe code, ranked by grid impact.
3. Fix: Bulwark generates the patch, runs the customer's tests in a sandbox, and opens
   a PR only when tests pass and the finding is gone.

## Hosting
Render hosts everything we run: the landing page and customer portal (apps/web), the
Bulwark Cloud package (packages/cloud: API, job worker, detectors) and Render Postgres,
all defined in render.yaml. Bulwark detection models will run on Render as a private
service that the cloud worker calls. Customers who need their code on their own stack
deploy the runner (Helm, Terraform, docker compose) and it reports to Bulwark Cloud
over outbound HTTPS.
