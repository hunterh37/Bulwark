import { MODULES } from "./modules/index.js";

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const day = (t: unknown) => (t ? new Date(t as string).toISOString().slice(0, 10) : "");

export interface ReportData {
  org: { name: string; sector: string; modules: string[]; scan_interval_hours: number };
  generatedBy: string;
  repos: { repo: string; commit: string | null; source: string; files: number; findings: number; finished_at: string; components: number }[];
  findings: any[];
  audit: { actor: string; action: string; at: string }[];
  kev: { entries: number; version: string };
}

const MAPPING: [string, string][] = [
  ["Rule findings with CWE id, file, line and first-seen date", "IEC 62443-4-1 secure implementation (SI) and security verification and validation testing (SVV) practice areas"],
  ["Dependency advisories from OSV.dev, CISA KEV flag, CycloneDX SBOM per repository", "IEC 62443-4-1 SM-9 (externally provided components); EU Cyber Resilience Act Annex I Part II point 1 (component identification and SBOM); NERC CIP-013 supply chain risk management plans"],
  ["Finding status, fix pull request links, ignore decisions", "IEC 62443-4-1 management of security-related issues (DM) practice area; EU Cyber Resilience Act Annex I Part II point 2 (remediation without delay)"],
  ["Scan history with commit, trigger and module versions; account audit log", "Record of when each repository was assessed and who changed its configuration"],
];

/** Printable evidence report for one organization. Self-contained HTML, no scripts. */
export function renderReport(d: ReportData): string {
  const live = d.findings.filter((f) => f.context !== "test");
  const open = live.filter((f) => f.status === "open" || f.status === "fixing");
  const count = (sev: string) => open.filter((f) => f.severity === sev).length;
  const byRepo = new Map<string, any[]>();
  for (const f of live) (byRepo.get(f.repo) ?? byRepo.set(f.repo, []).get(f.repo)!).push(f);
  const mods = MODULES.filter((m) => d.org.modules.includes(m.id));
  const rows = (fs: any[]) => fs.map((f) => `<tr><td class="s-${esc(f.severity)}">${esc(f.severity)}${f.kev ? " · KEV" : ""}</td><td>${esc(f.rule_id)}<br><small>${esc(f.cwe ?? "")}</small></td><td>${esc(f.file)}:${esc(f.line)}</td><td>${esc(f.message)}</td><td>${f.pr_url ? `<a href="${esc(f.pr_url)}">${esc(f.status)}</a>` : esc(f.status)}</td><td>${day(f.first_seen)}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bulwark evidence report, ${esc(d.org.name)}, ${day(new Date())}</title>
<style>
body{font:13px/1.5 "Helvetica Neue",Helvetica,Arial,sans-serif;color:#0B0D10;max-width:960px;margin:32px auto;padding:0 20px}
h1{font-size:26px;margin:0 0 4px;letter-spacing:-.01em}h2{font-size:17px;margin:28px 0 8px;border-bottom:2px solid #0B0D10;padding-bottom:4px}h3{font-size:14px;margin:18px 0 6px;font-family:Menlo,monospace}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #d5d8dd;vertical-align:top;overflow-wrap:anywhere}
.f{table-layout:fixed}.f th:nth-child(1){width:74px}.f th:nth-child(2){width:170px}.f th:nth-child(3){width:170px}.f th:nth-child(5){width:70px}.f th:nth-child(6){width:84px}th{font-weight:700}
small{color:#5b626c}.k{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.k div{border:1px solid #0B0D10;padding:8px 10px}.k b{display:block;font:700 22px Menlo,monospace}
.s-critical{color:#c62828;font-weight:700}.s-high{color:#b45309;font-weight:700}.meta{color:#5b626c}.bar{background:#F5C518;height:6px;margin-bottom:18px}
@media print{body{margin:0;max-width:none}a{color:inherit;text-decoration:none}h2{break-after:avoid}tr{break-inside:avoid}}
</style></head><body><div class="bar"></div>
<h1>Bulwark evidence report</h1>
<p class="meta">${esc(d.org.name)} · sector ${esc(d.org.sector)} · generated ${new Date().toISOString()} by ${esc(d.generatedBy)}</p>
<div class="k"><div><b>${d.repos.length}</b>repositories</div><div><b>${count("critical")}</b>open critical</div><div><b>${count("high")}</b>open high</div><div><b>${open.filter((f) => f.kev).length}</b>open, in CISA KEV</div><div><b>${live.filter((f) => f.status === "pr_open").length}</b>fix PRs open</div></div>
<h2>Scope</h2>
<p>Modules: ${mods.map((m) => `${esc(m.id)}@${esc(m.version)}`).join(", ") || "none"}. Scheduled rescan every ${d.org.scan_interval_hours} h${d.org.scan_interval_hours ? "" : " (off)"}. CISA KEV catalog ${esc(d.kev.version || "not loaded")}, ${d.kev.entries} entries. Findings in test, example and third-party paths are excluded from this report.</p>
<table><tr><th>Repository</th><th>Commit</th><th>Source</th><th>Last scan</th><th>Files</th><th>Findings</th><th>SBOM components</th></tr>
${d.repos.map((r) => `<tr><td>${esc(r.repo)}</td><td>${esc((r.commit ?? "").slice(0, 12))}</td><td>${esc(r.source)}</td><td>${day(r.finished_at)}</td><td>${r.files}</td><td>${r.findings}</td><td>${r.components}</td></tr>`).join("") || "<tr><td colspan=7>No completed scans.</td></tr>"}</table>
<h2>Findings</h2>
${[...byRepo.entries()].map(([repo, fs]) => `<h3>${esc(repo)}</h3><table class="f"><tr><th>Severity</th><th>Rule</th><th>Location</th><th>Detail</th><th>Status</th><th>First seen</th></tr>${rows(fs)}</table>`).join("") || "<p>No findings in the latest scans.</p>"}
<h2>What this report supports</h2>
<table><tr><th>Bulwark record</th><th>Supports evidence for</th></tr>${MAPPING.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</table>
<p class="meta">This report is input to an assessment. It is not a certification or an audit opinion, and the mapping above is to practice areas, not to a clause-by-clause conformity claim.</p>
<h2>Audit log (latest ${d.audit.length})</h2>
<table><tr><th>When (UTC)</th><th>Actor</th><th>Action</th></tr>${d.audit.map((a) => `<tr><td>${esc(new Date(a.at).toISOString().replace("T", " ").slice(0, 19))}</td><td>${esc(a.actor)}</td><td>${esc(a.action)}</td></tr>`).join("")}</table>
</body></html>`;
}
