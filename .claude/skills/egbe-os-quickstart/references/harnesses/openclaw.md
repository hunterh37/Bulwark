# OpenClaw: active workspace

1. Resolve the active profile and agent's configured workspace before installing.
   Install into that project's `skills/`, not a default home workspace belonging
   to another agent. If the active agent points elsewhere, select or configure
   the project-specific agent first.
2. If discovery needs refreshing, refresh skill selection or start a new session
   for that agent. If optional logging requires a Gateway restart, combine these
   into one activation transition. Follow quickstart's completion step for timing
   and resume in this workspace.
3. Check the agent's available skill list and load an Egbe skill by its
   frontmatter name. If missing, inspect workspace discovery and that agent's
   allowlist with the [OpenClaw skills guide](https://docs.openclaw.ai/tools/skills).
   Correct the active project's configuration rather than installing globally.
