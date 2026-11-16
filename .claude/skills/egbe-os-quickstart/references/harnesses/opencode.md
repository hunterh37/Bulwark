# OpenCode: installation and activation

1. Use project-local `.opencode/skills/`, or reuse an existing catalog in a
   directory this OpenCode version discovers, such as `.agents/skills/`.
   A bare `skills/` directory is not the native project location; consult the
   [OpenCode skills guide](https://opencode.ai/docs/skills/) before choosing
   another path.
2. If optional logging adds a plugin that requires activation, restart OpenCode
   and reopen the project; a new conversation in the old process is not plugin
   activation. Follow quickstart's completion step for activation timing.
3. Check that the native `skill` tool offers the installed Egbe skills and load
   one by its advertised name. If absent, inspect the effective project path
   and skill permissions; keep native discovery unverified until it succeeds.
