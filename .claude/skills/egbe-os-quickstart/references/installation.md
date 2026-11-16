# Install skills and project playbooks

Install only in the persistent project workspace established in quickstart.
If a working Egbe catalog is already installed, follow
[catalog updates](skill-updates.md), reusing a check/update result already obtained
for this setup and project root. That workflow also connects and reads project
guidance; do not repeat the new installation below. Preserve reported conflicts.
For a new installation or a missing/broken updater, continue below.

## Choose the project-local location

Read only the active harness's reference:

- [Codex](harnesses/codex.md): `.agents/skills/`.
- [Hermes](harnesses/hermes.md): `.agents/skills/` at the trusted project root.
- [OpenCode](harnesses/opencode.md): `.opencode/skills/`.
- [OpenClaw](harnesses/openclaw.md): `skills/` inside the active agent's project workspace.
- Claude Code: `.claude/skills/`.

For other harnesses, use their documented project-scoped discovery mechanism in
that workspace, not a global/native skill repository belonging to the host.
If none is supported, return to quickstart's path without installation.
Reuse an existing project Egbe catalog instead of installing another copy.
Installed Egbe skill directories use their advertised `egbe-os-*` names, matching
`SKILL.md` and native discovery. The installer migrates unchanged, owned folders
from older installations; preserve any reported local-edit or ownership conflict.
Before installation, fetch the relevant listed reference at
`GET /skills/quickstart/resources/references/harnesses/<harness>.md`.

## Download and install

1. Use Python 3.9 or newer. Create a temporary setup subfolder inside the
   workspace and set `SETUP_DIR` to its absolute path. Download
   `GET /skills/quickstart/resources/scripts/install-catalog.py` from `OS_URL`
   into `$SETUP_DIR/install-catalog.py`.
2. Run from the workspace root with the selected skills directory:

   ```bash
   python3 "$SETUP_DIR/install-catalog.py" --destination <skill-directory> --project-root . --os-url <OS_URL>
   ```

   The installer retrieves the manifest, version address and both archives;
   verifies their checksums; and installs complete skill bundles and editable
   project playbooks. It records ownership for skill updates, preserves local
   skill edits and unowned directories, and never overwrites existing project
   playbooks. There is no separate manual catalog fetch or ZIP extraction. If the runtime
   protects the directory, request approval for this command through its permission
   mechanism; changing filesystem permissions does not remove sandbox restrictions.
3. Check `delivery.skills` and `delivery.playbooks` in the result; `complete`
   confirms file delivery, not a review of the project's methodology. Report failures or skipped files
   without claiming full success. Finish any pending delivery using the installed
   helper's [catalog update](skill-updates.md), not another installation process.
   Remove only the temporary setup subfolder created for this run.

## Connect project guidance

Create `EGBE.md` in the project root as a relative symlink to
`<skills-directory>/egbe-os-quickstart/resources/EGBE.md`, using the actual installed
catalog path and the bundled [Egbe guidance](../resources/EGBE.md).
Reuse a matching link; ask before replacing an existing file or a
link to another target. The target stays in the catalog so normal skill updates
also update the guidance without copying it into the project.

Identify the active harness's native project-instruction file or mechanism from
its configuration and documentation. Add a short instruction to read and apply
the project's `EGBE.md` when working on this project. Preserve existing rules and
reuse an equivalent entry; scope the addition to this project, not global user
settings. Resolve the link from that instruction file's location. When switching
harnesses, reuse the project guidance and connect it to the new harness.

For a new Claude Code project, use this exact line in the root `CLAUDE.md`:
`Read and apply EGBE.md when working on this project.` Preserve existing instructions
when connecting a project that already has that file.

Read the complete installed `EGBE.md` once, including its skill and project-playbook
indexes, and verify its
symlink target and the instruction entry. If linking or
editing instructions requires permission, use the runtime's approval flow. If
unavailable, read the installed resource for this session and report persistent
guidance as pending rather than claiming it is configured.

Return to quickstart to verify the project connection, resolve logging, offer
the Business Loop and continue the product handoff. Native skill
discovery and any required activation follow its completion step.
