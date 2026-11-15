import { envImport, literalToEnv } from "./autofix.js";
import type { BulwarkModule } from "./types.js";

export const secretsCore: BulwarkModule = {
  id: "secrets-core",
  name: "Secrets and TLS",
  version: "1.1.0",
  summary: "Leaked keys, private keys, tokens and disabled TLS verification.",
  sectors: ["all"],
  rules: [
    { id: "secret.aws-key", cwe: "CWE-798", comments: true, re: /AKIA[0-9A-Z]{16}/, severity: "critical", message: "AWS access key in source", fix: "Revoke the key in IAM and load credentials from the environment.",
      autofix: (l, p) => literalToEnv(l, p, /AKIA[0-9A-Z]{16}/, "AWS_ACCESS_KEY_ID"), needs: envImport },
    { id: "secret.private-key", cwe: "CWE-321", comments: true, re: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, severity: "critical", message: "Private key in source", fix: "Remove the key, rotate it and store it in a secrets manager." },
    { id: "secret.github-token", cwe: "CWE-798", comments: true, re: /gh[pousr]_[A-Za-z0-9]{36}/, severity: "critical", message: "GitHub token in source", fix: "Revoke the token at github.com/settings/tokens.",
      autofix: (l, p) => literalToEnv(l, p, /gh[pousr]_[A-Za-z0-9]{36}/, "GITHUB_TOKEN"), needs: envImport },
    { id: "secret.slack-token", cwe: "CWE-798", comments: true, re: /xox[baprs]-[A-Za-z0-9-]{10,}/, severity: "high", message: "Slack token in source", fix: "Revoke the token and use an env var.",
      autofix: (l, p) => literalToEnv(l, p, /xox[baprs]-[A-Za-z0-9-]{10,}/, "SLACK_TOKEN"), needs: envImport },
    { id: "tls.verify-disabled", cwe: "CWE-295", re: /rejectUnauthorized:\s*false|verify\s*=\s*False|InsecureSkipVerify:\s*true|CURLOPT_SSL_VERIFYPEER,\s*(0|false)/, severity: "high", message: "TLS verification disabled", fix: "Remove the override and trust the internal CA explicitly.",
      autofix: (l) => l.replace(/rejectUnauthorized:\s*false/, "rejectUnauthorized: true").replace(/verify\s*=\s*False/, "verify=True").replace(/InsecureSkipVerify:\s*true/, "InsecureSkipVerify: false").replace(/CURLOPT_SSL_VERIFYPEER,\s*(0|false)/, "CURLOPT_SSL_VERIFYPEER, 1") },
  ],
};
