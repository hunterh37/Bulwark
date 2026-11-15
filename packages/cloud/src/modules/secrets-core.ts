import type { BulwarkModule } from "./types.js";

export const secretsCore: BulwarkModule = {
  id: "secrets-core",
  name: "Secrets and TLS",
  version: "1.0.0",
  summary: "Leaked keys, private keys, tokens and disabled TLS verification.",
  sectors: ["all"],
  rules: [
    { id: "secret.aws-key", re: /AKIA[0-9A-Z]{16}/, severity: "critical", message: "AWS access key in source", fix: "Revoke the key in IAM and load credentials from the environment." },
    { id: "secret.private-key", re: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, severity: "critical", message: "Private key in source", fix: "Remove the key, rotate it and store it in a secrets manager." },
    { id: "secret.github-token", re: /gh[pousr]_[A-Za-z0-9]{36}/, severity: "critical", message: "GitHub token in source", fix: "Revoke the token at github.com/settings/tokens." },
    { id: "secret.slack-token", re: /xox[baprs]-[A-Za-z0-9-]{10,}/, severity: "high", message: "Slack token in source", fix: "Revoke the token and use an env var." },
    { id: "tls.verify-disabled", re: /rejectUnauthorized:\s*false|verify\s*=\s*False|InsecureSkipVerify:\s*true|CURLOPT_SSL_VERIFYPEER,\s*(0|false)/, severity: "high", message: "TLS verification disabled", fix: "Remove the override and trust the internal CA explicitly." },
  ],
};
