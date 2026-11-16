---
name: egbe-os-git
description: Create an Egbe repository and push local code, including projects without a remote.
metadata:
  egbe-when: "Use when code needs versioning or a repository for publication."
  egbe-visible: "true"
  egbe-title: "Code repositories"
  egbe-description: "Create an Egbe-hosted repository to store, version and publish your app's code."
  egbe-category: "Development & hosting"
---

<!-- egbe-catalog-updates:v1 -->
For work in a workspace with an installed, executable Egbe catalog, run
`python3 "<skills-directory>/egbe-os-quickstart/scripts/sync-catalog.py" --check` using the
actual installation path before starting work with this skill. `<skills-directory>` is the
project folder that contains this skill's directory, such as `.agents/skills`; find it with
file tools or `ls`, not inline interpreter code. Follow its result
with `<skills-directory>/egbe-os-quickstart/references/skill-updates.md`, then reread this
skill if updated. The check is read-only; the reference covers applying updates.
For public guidance without an installed catalog or command execution, skip
this local check and read the current published instructions directly. Reading
does not require a project or installation. For project execution that needs
connection or setup, use `GET /quickstart` on `OS_URL` to choose the appropriate
workspace or no-installation path before setup. The quickstart handles its own check.

Scheduled and other unattended runs have no one to approve inline code, so
`python -c`, `node -e`, heredoc scripts and code-execution tools may be blocked
there. Run bundled scripts as `python3 <script> ...` or `node <script> ...`, and
read files with file tools or plain shell commands.

<!-- egbe-connection-identity:v1 -->
Public instruction and playbook reads do not require credentials or connection
identity. The following applies to authenticated project requests, not reading
or applying public guidance without a connection.

For a BYOA workspace, retain its connection identity on **every authenticated
Egbe request**, including the examples and referenced workflows below. Load
`OS_URL` and `OS_API_KEY` from the project's Git-ignored `.env.local`. Set
`OS_AGENT_NAME` to your actual human-readable agent name, for example
`Claude Code` or `Codex`, not a slug such as `claude-code` or `CLAUDE_CODE`.
This is the name the owner sees in Dashboard. Never infer it from curl or reuse
another agent's identity. If your name is unknown, leave it unset. Quickstart saves the per-agent UUID in
`OS_CONNECTION_ID_<AGENT_SLUG>` (uppercase name with separators changed to
underscores, e.g. `CLAUDE_CODE`) and the optional owner-provided nickname in
`OS_WORKSPACE_NAME` in that file.

Many agent runtimes, including Claude Code, start a fresh shell for every
command, so shell functions and exported variables from an earlier command are
gone. Make each command that calls Egbe self-contained: load `OS_URL` and
`OS_API_KEY` in that same command, and run each authenticated curl example
through the project-local helper with your agent name set inline:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request /me/limits -s
```

`--egbe-request` loads the saved URL and API key from `.env.local` without
executing it, constructs the full URL, and adds the bearer token before calling
curl. Replace `/me/limits` with the API path from an example and keep its other
curl options; omit the example's URL and Authorization header. This mode rejects
additional destinations and redirects. Without this mode, the helper takes the
same arguments as `curl` and you must load credentials before shell expansion.
Do not edit global shell
configuration. Only in a shell that persists between your commands may you
instead export `OS_AGENT_NAME` once and define
`curl() { python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" "$@"; }`.
Likewise prefix `OS_AGENT_NAME="<your agent name>"` on each command that runs a
bundled Python or JavaScript client.

The helper adds the saved identity headers only for the configured Egbe URL;
other destinations receive no extra headers. For an Egbe request it exits 22 on
an HTTP status of 400 or above and writes a status and request ID line to stderr
after every response; `<skills-directory>/egbe-os-quickstart/references/connection.md`
describes both. It rejects mixed destinations and redirects when attaching
identity. If the helper or this agent's UUID is missing, follow `GET /quickstart`
first. Before catalog installation, download and inspect
`GET /skills/quickstart/resources/scripts/egbe-curl.py` into the workspace's temporary
setup directory and use that path. After installation, switch to the installed helper.
For other Python, JavaScript or MCP clients, explicitly configure the same
`X-Egbe-Connection-Id`, `X-Egbe-Agent-Name`, and optional `X-Egbe-Workspace-Name`
headers on Egbe requests. A client that cannot attach identity headers remains
usable as an unidentified connection; do not claim its later activity is identified.
Deployed-product requests use their separate product credentials and no agent identity.


# Git

Native Git can push, fetch and clone through `https://os.hz.egbe.dev/git/http/<repo>.git`
using `Authorization: Bearer $OS_API_KEY` with the `git` scope. OS resolves your
account's Forgejo owner and credential internally. The remote contains no secret;
no Forgejo token export or credential helper is required for this transport.
Git and Forgejo handle commits, history, branch protection and push conflicts.

## Start from your local project

A local branch such as `master`, uncommitted changes, a missing remote or absent
Vercel/Netlify files are normal setup, not evidence Egbe deployment is blocked.
Within the founder's existing publishing/deployment authorization:

1. Inspect `git status`, the current branch and `git remote -v`. Preserve existing
   history and remotes. Initialize Git only if absent. Read `/deploy/skill` for the
   Dockerfile/build requirements; configure `.gitignore` and `.dockerignore` before
   staging so `.env.local`, credentials, dependencies and build output stay private.
2. List repositories with `GET /git/repos`; reuse the intended repository or create
   an empty private one with `POST /git/repos`. Check HTTP success before proceeding.
3. Check author and committer identities with `git var GIT_AUTHOR_IDENT` and
   `git var GIT_COMMITTER_IDENT`. If missing, choose identities approved for this
   project and save them with `git config --local user.name` / `user.email`.
   Preserve existing identities. These are commit metadata, never API credentials.
4. Review and commit the intended files, then push the current branch through the
   OS HTTP remote. Use the exact full pushed SHA from `git rev-parse HEAD` as the
   `ref` in `POST /deploy`. No branch rename or force push is needed.
5. Verify deployment status, deployed revision and public URL per `/deploy/skill`.

```bash
# OS_URL and OS_API_KEY come from the existing quickstart connection.
# List first; create only if the intended repository is absent.
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/git/repos" -fsS
OS_AGENT_NAME="<your agent name>" python3 "<skills-directory>/egbe-os-quickstart/scripts/egbe-curl.py" --egbe-request "/git/repos" -fsS -X POST  \
 -H 'Content-Type: application/json' \
  -d '{"name":"my-app","private":true}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["os_http_url"])'
# Repo creation retains a legacy secret push_url; print only os_http_url.

# Add a dedicated remote without replacing an existing origin.
git remote add egbe "$OS_URL/git/http/my-app.git"
git var GIT_AUTHOR_IDENT
git var GIT_COMMITTER_IDENT
# Review git status/diff, stage intended source files, and commit before pushing.

# Pass the key via a temporary environment variable, scoped to this remote.
# Do not enable shell tracing, store this header in Git config, or print it.
REMOTE="$OS_URL/git/http/my-app.git"
export OS_GIT_AUTH="Authorization: Bearer $OS_API_KEY"
git --config-env="http.$REMOTE.extraHeader=OS_GIT_AUTH" push -u egbe HEAD
unset OS_GIT_AUTH
git rev-parse HEAD
```

If the dedicated remote already exists, verify its URL instead of adding it again.
Preserve the current branch name. For an intentional differently named remote
branch use `HEAD:<approved-branch>`; do not overwrite unrelated history. On a
rejected push, fetch and inspect the remote changes or publish a new branch.
After a timeout/disconnect, inspect remote refs before deciding whether to retry;
a lost response does not prove the push failed.

## Clone or fetch

Use the same temporary, remote-scoped header with every authenticated Git call:

```bash
REMOTE="$OS_URL/git/http/my-app.git"
export OS_GIT_AUTH="Authorization: Bearer $OS_API_KEY"
git --config-env="http.$REMOTE.extraHeader=OS_GIT_AUTH" clone "$REMOTE"
# Inside an existing clone whose egbe remote matches REMOTE:
# git --config-env="http.$REMOTE.extraHeader=OS_GIT_AUTH" fetch egbe
unset OS_GIT_AUTH
```

This requires Git with `--config-env` support (2.31+). Git smart HTTP uses raw
protocol responses, while repository management APIs use the normal OS envelope.
The adapter supports discovery, upload-pack and receive-pack only; Git LFS and
dumb HTTP are outside this transport. OS keys are valid here, not as direct
Forgejo passwords.

## Deprecated credential endpoint

`GET /git/credentials` is marked deprecated in OpenAPI and returns
`data.deprecation` with the OS HTTP remote template, authentication/scope and
this skill's URL. For Git push/clone/fetch, use the OS-key transport above;
do not fetch a Forgejo token or configure a credential-bearing remote.
Legacy credential fields remain available for compatibility. Native Forgejo
REST API operations such as issues/comments still need them until an OS API
replacement exists; `/git/http` transports Git and cannot accept REST requests.
Keep returned tokens and legacy authenticated URLs private.

Escalate the actual redacted authorization/provisioning/network/build error,
not missing configuration. A browser-only vault that cannot provide the OS key
to a Git process still needs a separate browser source-transfer path; this shell
transport does not resolve that constraint. Report that specific limitation.

## Product backlog

To read or update issues in this project's repository, follow
[Repository issues](references/issues.md). It uses these same project
credentials and Forgejo's native API.
