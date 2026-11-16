# Hermes: project root and trust

1. Run `git -C <project> rev-parse --show-toplevel`. If this is a new standalone
   project with no repository, run `git -C <project> init` before installation;
   no commit or remote is needed. Reuse an existing project root. If the detected
   root is outside the intended project, resolve the workspace with the founder
   before installing or trusting a broader directory.
2. Install into `<project-root>/.agents/skills/`. Resolve the active Hermes
   profile and `HERMES_HOME`; use that profile for all setup commands.
3. Have the founder approve this root through Hermes's native trust flow
   (`hermes skills trust <project-root>`). Do not silently edit the trust list.
4. Use `skills_list` and `skill_view` to verify native discovery. If missing,
   check root, trust and any quarantine result using the
   [Hermes skills guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills).
   If a fresh session is needed, use this root and profile; follow quickstart's
   completion step for activation timing.

## Quarantine and catalog refresh

Trusting a project does not approve every later change to its skills. Hermes
scans each project bundle and hides dangerous verdicts from discovery and
`skill_view`. Inspect the actual scan findings before choosing a remedy;
ordinary caution findings do not by themselves mean a bundle is quarantined.
Keep the scanner enabled and use the complete published catalog, including
quickstart's connection helper. Authenticated examples use its saved-request
mode so credentials and connection identity come from this project.

For an older quarantined catalog, run its normal check/update helper from the
project root, as described in [catalog updates](../skill-updates.md), and inspect
any local conflicts. Do not copy skills into the user tier, add scan exclusions,
or rewrite commands solely to evade detection. Report remaining findings if the
updated official bundle is still quarantined.

Hermes versions with process-local quarantine caching can retain the old
decision after files change. Restart the affected Hermes runtime process through
its normal lifecycle, then verify `skills_list` and `skill_view` again. For a
gateway this means restarting its process, not merely opening another chat or
reloading the skill list. Preserve the active profile, workspace and trust;
coordinate a restart that would interrupt other work.

If manual user-tier copies already exist, identify their origin and local edits
before offering to back them up outside skill discovery and remove them with
the owner's agreement. Keep the managed project catalog as the update source;
do not delete unrelated user skills or silently broaden project trust.
