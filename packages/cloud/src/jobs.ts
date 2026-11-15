import { open } from "./crypto.js";
import { audit, claimJob, enqueue, finishJob, pool } from "./db.js";
import { runDetectors, type Detection } from "./detect/index.js";
import { fetchRepoFiles, getFile, openFixPr } from "./github.js";
import { planFix, prBody } from "./fix.js";
import { withKev } from "./kev.js";
import { osvDirect, parseDeps } from "./modules/deps-osv.js";
import { sendAlert } from "./notify.js";
import { components, type Component } from "./sbom.js";

const SEV = ["critical", "high", "medium", "low"];
const RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
export const MAX_STORED = 2000;

/** Drops malformed rows from runner uploads and caps field sizes. */
export function cleanFindings(input: unknown[]): Detection[] {
  const s = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  const out: Detection[] = [];
  for (const raw of input) {
    const f = raw as Record<string, unknown>;
    if (!f || typeof f !== "object" || !f.ruleId || !f.file || !SEV.includes(String(f.severity))) continue;
    out.push({
      detector: s(f.detector, 80), ruleId: s(f.ruleId, 120), file: s(f.file, 500), line: Math.max(1, Number(f.line) | 0),
      severity: f.severity as Detection["severity"], message: s(f.message, 400), fix: f.fix ? s(f.fix, 400) : undefined,
      gridImpact: f.gridImpact === true, cwe: f.cwe ? s(f.cwe, 20) : undefined, context: f.context === "test" ? "test" : undefined,
      fingerprint: f.fingerprint ? s(f.fingerprint, 40) : undefined, kev: f.kev === true,
    });
  }
  return out;
}

/** Stores the findings of one scan. A finding seen in the previous scan of the repo keeps its triage
 *  state, pull request and first-seen date; the rest are marked new. Returns the new high and critical count. */
export async function storeFindings(orgId: string, scanId: string, repo: string, commit: string, found: Detection[]) {
  const prev = await pool.query(
    `select fingerprint, status, pr_url, fix_engine, coalesce(first_seen, created_at) as first_seen from findings
     where org_id = $1 and repo = $2 and fingerprint is not null and scan_id =
       (select id from scans where org_id = $1 and repo = $2 and status = 'done' and id <> $3 order by created_at desc limit 1)`,
    [orgId, repo, scanId]);
  const had = await pool.query("select 1 from scans where org_id = $1 and repo = $2 and status = 'done' and id <> $3 limit 1", [orgId, repo, scanId]);
  const before = new Map<string, any>(prev.rows.map((r) => [r.fingerprint, r]));
  const rows = [...found].sort((a, b) => RANK[a.severity] - RANK[b.severity]).slice(0, MAX_STORED);
  let fresh = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const vals: unknown[] = [];
    const tuples = chunk.map((f, j) => {
      const p = f.fingerprint ? before.get(f.fingerprint) : undefined;
      const keep = p && (p.status === "ignored" || p.status === "pr_open");
      const isNew = !p && !!had.rowCount;
      if (isNew && RANK[f.severity] <= 1) fresh++;
      vals.push(orgId, scanId, repo, commit, f.detector, f.ruleId, f.file, f.line, f.severity, f.gridImpact, f.message, f.fix ?? null,
        f.fingerprint ?? null, f.context ?? null, f.cwe ?? null, !!f.kev, keep ? p.status : "open", keep ? p.pr_url : null,
        keep ? p.fix_engine : null, p?.first_seen ?? new Date(), isNew);
      return `(${Array.from({ length: 21 }, (_, k) => `$${j * 21 + k + 1}`).join(",")})`;
    });
    await pool.query(
      `insert into findings (org_id, scan_id, repo, commit, detector, rule_id, file, line, severity, grid_impact, message, fix,
         fingerprint, context, cwe, kev, status, pr_url, fix_engine, first_seen, is_new) values ${tuples.join(",")}`, vals);
  }
  return fresh;
}

export async function finishScan(orgId: string, scanId: string, repo: string, commit: string, fresh: number, total: number) {
  await pool.query("update scans set new_findings = $2 where id = $1", [scanId, fresh]);
  if (!fresh) return;
  const { rows } = await pool.query("select alert_webhook_enc from orgs where id = $1", [orgId]);
  if (!rows[0]?.alert_webhook_enc) return;
  const base = process.env.PUBLIC_URL ?? process.env.RENDER_EXTERNAL_URL ?? "";
  const ok = await sendAlert(open(rows[0].alert_webhook_enc),
    `Bulwark: ${fresh} new high or critical finding${fresh === 1 ? "" : "s"} in ${repo} at ${commit.slice(0, 8)} (${total} total). ${base}/portal#findings`);
  await audit(orgId, "bulwark", ok ? "alert.sent" : "alert.failed", { repo, new: fresh });
}

/** Cloud scan: pull the repo through the GitHub API and run the org's modules. */
export async function runScan(p: { scanId: string }) {
  const { rows } = await pool.query(
    `select s.id, s.org_id, s.repo, s.commit, o.modules, o.github_token_enc
     from scans s join orgs o on o.id = s.org_id where s.id = $1`, [p.scanId]);
  const s = rows[0];
  if (!s) return;
  await pool.query("update scans set status = 'running' where id = $1", [s.id]);
  try {
    const token = s.github_token_enc ? open(s.github_token_enc) : process.env.GITHUB_TOKEN || undefined;
    const { commit, files } = await fetchRepoFiles(s.repo, s.commit ?? undefined, token);
    const found = await runDetectors(files, s.modules, { osv: withKev(osvDirect) });
    const comps: Component[] = components(parseDeps(files));
    const fresh = await storeFindings(s.org_id, s.id, s.repo, commit, found);
    await pool.query(
      "update scans set status = 'done', commit = $2, files = $3, findings = $4, components = $5, finished_at = now() where id = $1",
      [s.id, commit, files.length, found.length, JSON.stringify(comps)]);
    await finishScan(s.org_id, s.id, s.repo, commit, fresh, found.length).catch((e) => console.error("alert", e));
  } catch (e) {
    await pool.query("update scans set status = 'failed', error = $2, finished_at = now() where id = $1",
      [s.id, String((e as Error).message ?? e).slice(0, 500)]);
  }
}

/** Fix job: patch one finding, verify by rescan, open a pull request. */
export async function runFix(p: { findingId: string }) {
  const { rows } = await pool.query(
    `select f.*, o.modules, o.github_token_enc from findings f join orgs o on o.id = f.org_id where f.id = $1`, [p.findingId]);
  const f = rows[0];
  if (!f) return;
  const fail = (error: string) => pool.query("update findings set status = 'open', fix_error = $2 where id = $1", [f.id, error.slice(0, 500)]);
  if (!f.github_token_enc) return fail("connect GitHub with a token that can write contents and pull requests");
  try {
    const token = open(f.github_token_enc);
    // Patch the default branch head so the PR never reverts newer commits.
    const file = await getFile(f.repo, f.file, undefined, token);
    const plan = await planFix(f.file, file.content, f.rule_id, f.line, f.modules);
    if (!plan.ok) return fail(plan.error);
    const branch = `bulwark/${f.rule_id.replace(/[^\w.-]/g, "-")}-${String(f.fingerprint ?? f.id).slice(0, 8)}`;
    const pr = await openFixPr(f.repo, token, {
      path: f.file, content: plan.patched, branch, title: `Bulwark: fix ${f.rule_id} in ${f.file}`, body: prBody(f, plan),
    });
    await pool.query("update findings set status = 'pr_open', pr_url = $2, fix_error = null, fix_engine = $3 where id = $1",
      [f.id, pr.url, plan.engine]);
    await audit(f.org_id, "bulwark", "fix.pr_open", { finding: f.id, rule: f.rule_id, pr: pr.url, engine: plan.engine });
  } catch (e) {
    await fail(String((e as Error).message ?? e));
  }
}

/** Queues a rescan for each cloud-scanned repo whose last scan is older than the org's interval. */
export async function scheduleDue() {
  const { rows } = await pool.query(
    `select r.org_id, r.full_name from repos r join orgs o on o.id = r.org_id
     where o.scan_interval_hours > 0
       and exists (select 1 from scans s where s.org_id = r.org_id and s.repo = r.full_name and s.source = 'cloud' and s.status = 'done')
       and not exists (select 1 from scans s where s.org_id = r.org_id and s.repo = r.full_name and s.source = 'cloud'
                       and s.created_at > now() - make_interval(hours => o.scan_interval_hours))
     limit 25`);
  for (const r of rows) {
    const s = await pool.query("insert into scans (org_id, repo, trigger) values ($1, $2, 'schedule') returning id", [r.org_id, r.full_name]);
    await enqueue("scan", { scanId: s.rows[0].id });
  }
  await pool.query("delete from sessions where expires_at < now()");
  await pool.query("delete from jobs where status in ('done', 'dead') and created_at < now() - interval '14 days'");
  return rows.length;
}

/** Polls the jobs table until stopped. Runs in the API process or as a separate worker. */
export async function workLoop(shouldStop: () => boolean) {
  let nextSchedule = Date.now() + 30_000;
  await pool.query("update jobs set status = 'queued' where status = 'running' and created_at < now() - interval '15 minutes'").catch(() => {});
  while (!shouldStop()) {
    if (Date.now() > nextSchedule) {
      nextSchedule = Date.now() + 5 * 60_000;
      await scheduleDue().catch((e) => console.error("schedule", e));
    }
    const job = await claimJob().catch((e) => { console.error("claim", e); return undefined; });
    if (!job) { await new Promise((r) => setTimeout(r, 1500)); continue; }
    try {
      if (job.kind === "scan") await runScan(job.payload);
      else if (job.kind === "fix") await runFix(job.payload);
      await finishJob(job.id, true, job.attempts);
    } catch (e) {
      console.error("job failed", job.id, e);
      await finishJob(job.id, false, job.attempts);
    }
  }
}
