# Connect the project workspace

Use the persistent project workspace established in quickstart, not an arbitrary
current shell directory. Run setup from that project root and keep credentials
and skills inside it; do not follow symbolic links to bypass workspace restrictions.
Egbe itself does not require Git; the installation guide covers harness-specific
discovery prerequisites.

## Save credentials and connection identity

Save `OS_URL` and `OS_API_KEY` in the project's Git-ignored `.env.local`, creating
it if needed and preserving other entries. Reuse existing project credentials.
Deployed apps use the separate product-runtime credential described by the deploy skill.

Generate a UUID for this agent/workspace and save it as `OS_CONNECTION_ID_<AGENT_SLUG>`
in the same file. The slug is the uppercase agent name with separators replaced by
underscores (for example `CODEX` or `CLAUDE_CODE`). Reuse an existing ID;
a copied workspace gets a new one. Save `OS_WORKSPACE_NAME` only when the founder
provides a nickname. Labels are 1–80 ASCII letters, numbers, spaces, underscores,
periods, parentheses, plus or hyphens; do not send private paths or hostnames.

## Verify and make subsequent requests

Use the installed `egbe-os-quickstart/scripts/egbe-curl.py` and the Python interpreter
already used for catalog installation. If the helper is missing, complete
[catalog installation](installation.md) first rather than downloading a second
copy of the request helper.

Run from the workspace root, replacing the helper path and setting your actual
human-readable agent name inline on every request (for example `Claude Code` or
`Codex`). This is the name shown to the owner in Dashboard; the helper derives
the uppercase environment-key slug separately:

```bash
OS_AGENT_NAME="<your agent name>" python3 "<helper-path>/egbe-curl.py" --egbe-request /me/limits -s
```

The helper loads `.env.local` without executing it and adds the bearer token and
connection headers. No persistent shell exports or global shell configuration are
needed. Use it for subsequent authenticated requests, substituting the API path
and adding curl options such as `-o <file>`. Do not add another destination,
Authorization header or redirect option.

For an Egbe request, an HTTP status of 400 or above exits with code 22, as with
`curl --fail-with-body`. Unless you passed `-f`/`--fail`, the response body is still
printed, so read its `message` before retrying. After every Egbe response, including
a success, the helper writes one line to stderr,
`egbe-curl: status=<code> request_id=<id> route=<METHOD> <path> catalog=<release>`,
without the query string or credentials; the line alone does not mean the request
failed. Quote the request ID when reporting a problem to Egbe. The helper also
sends the installed catalog release from the skills directory's
`.egbe-catalog/manifest.json`, so Egbe can tell which skill versions made the
request. The line names it by its first 12 hex digits, with `+partial` while a
refresh kept some skills at an earlier release, or `-` when none is installed.
`status=000` means no response arrived, and `request_id=-` means the response
carried none.

Responses are `{ "code", "message", "data" }`. Confirm that verification succeeds
and compare `data.instance_id` with an expected project ID if supplied; stop on a
mismatch. The connection identity lets the founder recognize this agent in Dashboard;
it is not proof of completed setup or online status. Return to quickstart to
understand the business and complete the remaining setup.
