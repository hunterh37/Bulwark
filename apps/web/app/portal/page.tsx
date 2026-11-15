// Customer portal. Server component: PORTAL_KEY never reaches the browser.
// Auth (Auth.js with Google + GitHub) replaces the ?org= parameter next.

type Summary = {
  repos: { full_name: string }[];
  runners: { id: string; mode: string; last_seen: string | null }[];
  findings: { id: string; repo: string; file: string; line: number; rule_id: string;
    severity: string; grid_impact: boolean; status: string; pr_url: string | null }[];
};

async function load(org: string): Promise<Summary | null> {
  const api = process.env.CLOUD_API_URL;
  if (!api) return null;
  const res = await fetch(`${api}/v1/portal/orgs/${org}/summary`, {
    headers: { "x-portal-key": process.env.PORTAL_KEY ?? "" }, cache: "no-store",
  });
  return res.ok ? res.json() : null;
}

export default async function Portal({ searchParams }: { searchParams: Promise<{ org?: string }> }) {
  const { org } = await searchParams;
  const data = org ? await load(org) : null;
  const appSlug = process.env.GITHUB_APP_SLUG ?? "bulwark-security";

  return (
    <main className="wrap">
      <nav>
        <a className="logo" href="/" style={{ textDecoration: "none" }}>BULWARK</a>
        <a className="btn" href={`https://github.com/apps/${appSlug}/installations/new`}>Connect GitHub</a>
      </nav>

      <h2>Runners</h2>
      {data?.runners.length ? (
        <table><thead><tr><th>ID</th><th>Mode</th><th>Last seen</th></tr></thead><tbody>
          {data.runners.map((r) => <tr key={r.id}><td>{r.id.slice(0, 8)}</td><td>{r.mode}</td><td>{r.last_seen ?? "never"}</td></tr>)}
        </tbody></table>
      ) : (
        <p className="lead">No runner yet. Hosted runs on Bulwark Cloud. To run in your own stack:
          <br /><code>helm install bulwark-runner oci://ghcr.io/hunterh37/charts/bulwark-runner --set token=…</code></p>
      )}

      <h2>Repositories</h2>
      {data?.repos.length
        ? <ul>{data.repos.map((r) => <li key={r.full_name}>{r.full_name}</li>)}</ul>
        : <p className="lead">No repositories connected.</p>}

      <h2>Findings</h2>
      {data?.findings.length ? (
        <table><thead><tr><th>Severity</th><th>Rule</th><th>Location</th><th>Grid</th><th>Status</th></tr></thead><tbody>
          {data.findings.map((f) => (
            <tr key={f.id}>
              <td className={`sev-${f.severity}`}>{f.severity}</td>
              <td>{f.rule_id}</td>
              <td>{f.repo}/{f.file}:{f.line}</td>
              <td>{f.grid_impact ? "yes" : ""}</td>
              <td>{f.pr_url ? <a href={f.pr_url}>{f.status}</a> : f.status}</td>
            </tr>
          ))}
        </tbody></table>
      ) : <p className="lead">No findings.</p>}
    </main>
  );
}
