# Recover access to supported capabilities

Use this guide for blocked public reading or a supported capability in a
persistent project workspace already established by quickstart. Recover access
to that capability, not build a new development environment inside a chat.
Identify the observed error and keep API access, installation, scheduling and
logging status separate.

| Observed obstacle | Next action |
| --- | --- |
| Network or proxy denial before an OS response | Explain which destination is blocked and the environment's supported network/allowlist setting or approval. Retry after access changes; this is not an invalid project key. |
| Untrusted project folder, protected project skill directory or denied command in an established workspace | Request the native project trust or exact operation approval. A writable parent folder does not override sandbox protections; `chmod` is not a permission bypass. |
| Persistent project workspace absent/unconfirmed, or commands unsupported | Use the [introduction and handoff](without-connection.md). Offer a supported project workspace; do not attempt installation to prove that persistence is possible. |
| No persistent scheduler or supported collector | Keep only that feature inactive/pending. Continue supported connection, development and manual reports. |
| OS returns an authentication, project or service error | Diagnose that API response using its contract; changing harness does not fix account access or an OS outage. |

Give a concrete recovery step, who must perform it and what you will recheck.
When that step needs the founder or administrator, wait for their action rather
than searching for another installation mechanism; continue useful discussion.
Do not broaden permissions yourself or route around a denial. If recovery is
declined or unavailable, explain what remains usable rather than claiming full
setup. A web tool reaching a public page does not prove shell API access.

## Claude network recovery

For `CONNECT tunnel failed` / `connect_rejected` (often curl HTTP `000`), the
request failed before an Egbe API response. Do not read a missing response file
or treat this as a key failure. Check the actual Claude surface and plan:

- In Claude chat/Desktop, check **Settings → Capabilities → Code execution and
  file creation / Allow network egress** where available.
- On Team/Enterprise, an organization owner may need to permit the host from
  `OS_URL` in **Organization settings → Capabilities**. Use its hostname, not
  a URL scheme or port, in the domain allowlist. Do not assume every plan offers
  this control or that package-manager access allows arbitrary APIs.
- Team/Enterprise Cowork applies changed network settings to a **new conversation**.
  Give a brief continuation note and retry there after the owner changes settings.

Consult the current official guides if controls differ:
[code execution and network access](https://support.claude.com/en/articles/12111783-create-and-edit-files-with-claude),
[Cowork network settings](https://support.claude.com/en/articles/13455879-use-claude-cowork-on-team-and-enterprise-plans).
Other transport failures require their own diagnosis, not this fix by default.
