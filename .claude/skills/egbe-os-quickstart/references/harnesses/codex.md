# Codex: skill discovery

1. Install into this project's `.agents/skills/`. If Codex denies writes there,
   request permission for the catalog installation command through its normal
   approval flow; changing filesystem permissions does not remove sandbox rules.
2. If the current chat has not discovered newly installed skills, read their files
   directly and follow quickstart's activation guidance; do not interrupt setup
   to troubleshoot discovery alone. If discovery still fails after activation,
   check the project path and enablement using the
   [Codex skill instructions](https://developers.openai.com/codex/skills).
