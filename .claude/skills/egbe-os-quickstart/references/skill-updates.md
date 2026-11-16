# Keep the local Egbe catalog current

Before starting work with an installed Egbe skill, run the helper from the actual
installation directory (not relative to the current shell folder):

```sh
python3 "<skills-directory>/egbe-os-quickstart/scripts/sync-catalog.py" --check
```

`<skills-directory>` is the project folder holding the installed skills, such as
`.agents/skills`. Find it with file tools or `ls`, not inline `python -c` or
`node -e` code, which scheduled runs may block.

Use the same check when the founder asks to refresh skills. It reads local metadata
and both public catalog versions in one request, without writing files, taking a lock,
hashing skill contents or downloading the catalog. Check at skill entry, not
before each API call or midway through work.

Read its JSON result:

- `current`: skill delivery is current; continue with the installed skill. Check
  the separate playbook result below when using a project method.
- `update_available` or `recovery_required`: run the same command without `--check`
  to apply safe whole-bundle updates or recover an interrupted update, then read
  that result below. Do not use an interrupted affected skill before recovery.
- `updated`: reread the skill and relevant references you need before continuing.
  If removed or renamed, rediscover the available capability instead of using old
  instructions. New skills may require a new agent session for automatic discovery.
- `partial`: report the successful changes and every skipped skill with its reason,
  paths and recommended action. Reread any updated skill you use, as above.
  Continue using available skills; do not call the
  entire catalog current. Ask only about a conflict that needs the founder's choice.
- `error`: explain what failed and how to retry. Offline or invalid-download errors
  leave the existing catalog usable; they do not prove it is up to date. A recovery
  error names local state that must be resolved before using that affected skill.

If `egbe-os-quickstart` was added or updated, run its newly installed helper with `--check`
once more and finish any pending catalog work. This also completes the old-reader
transition described in [playbook synchronization](../../egbe-os-playbook/references/catalog.md#older-installations).
Then follow [project guidance setup](installation.md#connect-project-guidance)
to connect or verify `EGBE.md` and read the current guidance. The root symlink
follows catalog updates; locally edited resources retain the same conflict rules.

For `filesystem_permission_required`, request the runtime's approval for the exact
command and installation path, then retry if approved. Codex can protect an
existing project `.agents` directory even when other project files are writable;
this requires execution approval, not `chmod`. If the directory is already known
to be protected, request approval before the write command. If approval is denied
or unavailable, defer the update, report that it remains pending and continue
with usable installed skills; preserve any interrupted bundle for recovery.

The helper preserves locally edited, deleted or added files, permissions and
unrelated skills. It does not text-merge changes. Resolve each conflict separately:
keep the local variant, or—with the founder's agreement—move it to a project-local
backup outside the discovery directory and install the upstream replacement.
For a tracked edited skill, restore its installed baseline before retrying, or
remove only its ownership entry after backing it up and choosing replacement.
Retry refresh after resolving a conflict; a new server release is not required.

## Project playbooks

The same result includes independent playbook delivery and review state. Before
work with a project method, pass this result to
[playbook synchronization](../../egbe-os-playbook/references/catalog.md#synchronize-before-method-work);
do not repeat the version request or treat catalog delivery as completed method
review. A pending method review does not block unrelated technical skill use.

## Existing installations and recovery

If `egbe-os-quickstart/scripts/sync-catalog.py` is absent or cannot start, follow only the
download/verified installer steps in [catalog installation](installation.md).
If that guide is missing, fetch
`GET /skills/quickstart/resources/references/installation.md` on the configured
`OS_URL`. The downloaded installer can recover an interrupted quickstart update.
Do not repeat account/project creation or change the project key.

An installation predating this updater has no trustworthy ownership baseline.
Existing paths are reported and left untouched; safe additions proceed once the
quickstart helper is available. Agree and back up colliding old bundles inside the
project before replacing them. Do not adopt arbitrary local files as upstream.

`.egbe-catalog/manifest.json` tracks file ownership; keep it and any reported
recovery transaction. `version-cache.json` is disposable: missing or malformed
cache triggers an unconditional version request; the ownership manifest still
identifies the installed release. Do not delete the ownership manifest
or recovery data to silence an error. Another active updater holds a short-lived
process lock; retry when it finishes, without deleting lock/state files.

Codex and Hermes use the configured project `.agents/skills`; Claude Code uses
`.claude/skills`. Updating files does not guarantee that a running session reloads
them: read the updated instructions directly and continue usable work in this
chat; request a new session only for discovery that needs it. Follow any runtime
trust prompt; do not change global trust
settings. This skill-entry instruction is not a hook on every founder message.
