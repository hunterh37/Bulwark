const steps = [
  { t: "Connect", d: "Install the GitHub App. Run Bulwark in our cloud or deploy the runner in yours." },
  { t: "Find", d: "Every push and every new CVE triggers a scan, ranked by grid impact: Modbus, DNP3, OCPP, secrets, dependencies." },
  { t: "Fix", d: "Bulwark writes the patch, runs your tests in a sandbox, and opens a PR only when everything passes." },
];

const plans = [
  { t: "Free", p: "$0", d: "1 repo. Continuous scans." },
  { t: "Team", p: "$49 / repo / mo", d: "Fix PRs, Slack alerts, audit log." },
  { t: "Enterprise", p: "Custom", d: "Self-hosted runner, SSO, NERC CIP evidence export." },
];

export default function Home() {
  return (
    <main className="wrap">
      <nav>
        <span className="logo">BULWARK</span>
        <a className="btn ghost" href="/portal">Customer portal</a>
      </nav>
      <h1>Always-on security for grid software.</h1>
      <p className="lead">
        Bulwark watches your repos, finds vulnerabilities, writes the fix, proves it safe,
        and opens the pull request. Your code can stay on your stack.
      </p>
      <p><a className="btn" href="/portal">Get a free scan</a></p>

      <section className="grid">
        {steps.map((s, i) => (
          <div className="card" key={s.t}><h3>{i + 1}. {s.t}</h3><p>{s.d}</p></div>
        ))}
      </section>

      <h2>Pricing</h2>
      <section className="grid">
        {plans.map((p) => (
          <div className="card" key={p.t}><h3>{p.t}</h3><p><b>{p.p}</b></p><p>{p.d}</p></div>
        ))}
      </section>

      <footer>Bulwark, 2026. Built at Sundai Hack 149.</footer>
    </main>
  );
}
