# Bulwark Edge

Runs Bulwark modules on the operator's own network. Source code stays on the host.

Contents: `bulwark-runner.mjs` (single file, Node 20+, no dependencies), `Dockerfile`,
`docker-compose.yml`, `install.sh` (systemd), `SHA256SUMS`.

Verify: `sha256sum -c SHA256SUMS`

Signed image: `docker pull ghcr.io/hunterh37/bulwark-runner:1.0.0` and
`cosign verify ghcr.io/hunterh37/bulwark-runner:1.0.0 --certificate-identity-regexp 'github.com/hunterh37/Bulwark' --certificate-oidc-issuer https://token.actions.githubusercontent.com`

Three ways to run:

1. One-off scan: `node bulwark-runner.mjs scan /path/to/repo --offline`
2. Docker: `REPOS_DIR=/srv/repos docker compose up -d`
3. systemd: `sudo REPOS="/srv/scada" ./install.sh`

Connected mode sends findings (rule, file, line) to Bulwark Cloud over outbound HTTPS
with the runner token from the portal. Air-gapped mode (`--offline` or no token)
writes `bulwark-results/*.json` and `*.sarif` for transfer by approved media.
Air-gapped Docker: `docker save bulwark-runner:1.0.0 | gzip > runner.tar.gz` on a
connected host, then `docker load` inside the enclave, with `NETWORK_MODE=none`.
