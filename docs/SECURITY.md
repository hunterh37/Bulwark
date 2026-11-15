# Security model

Threats: compromised Bulwark worker pushing malicious code; tenant data leak;
prompt injection from repo content steering the fixer.

Controls: PR-only writes; fix diffs rescanned and size-capped; repo content passed
to the LLM as data with no tool access; per-tenant KMS keys; RLS in Postgres;
ephemeral sandboxes with egress allowlist; signed commits from the bot; audit log.
