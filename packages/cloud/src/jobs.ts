import { open } from "./crypto.js";
import { claimJob, finishJob, pool } from "./db.js";
import { runDetectors, type Detection } from "./detect/index.js";
import { fetchRepoFiles, getFile, openFixPr } from "./github.js";
import { planFix, prBody } from "./fix.js";
import { osvDirect } from "./modules/deps-osv.js";

export async function storeFindings(orgId: string, scanId: string, repo: string, commit: string, found: Detection[]) {
  for (const f of found) {
    await pool.query(
      `insert into findings (org_id, scan_id, repo, commit, detector, rule_id, file, line, severity, grid_impact, message, fix)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [orgId, scanId, repo, commit, f.detector, f.ruleId, f.file, f.line, f.severity, f.gridImpact, f.message, f.fix ?? null]);
  }
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
    const found = await runDetectors(files, s.modules, { osv: osvDirect });
    await storeFindings(s.org_id, s.id, s.repo, commit, found);
    await pool.query(
      "update scans set status = 'done', commit = $2, files = $3, findings = $4, finished_at = now() where id = $1",
      [s.id, commit, files.length, found.length]);
  } catch (e) {
    await pool.query("update scans set status = 'failed', error = $2, finished_at = now() where id = $1",
      [s.id, String((e as Error).message ?? e)]);
  }
}

/** Fix job: patch one finding, verify by rescan, open a pull request. */
export async function runFix(p: { findingId: string }) {
  const { rows } = await pool.query(
    `select f.*, o.modules, o.github_token_enc from findings f join orgs o on o.id = f.org_id where f.id = $1`, [p.findingId]);
  const f = rows[0];
  if (!f) return;
  const fail = (error: string) => pool.query("update findings set status = 'open', fix_error = $2 where id = $1", [f.id, error]);
  if (!f.github_token_enc) return fail("connect GitHub with a token that can write contents and pull requests");
  try {
    const token = open(f.github_token_enc);
    // Patch the default branch head so the PR never reverts newer commits.
    const file = await getFile(f.repo, f.file, undefined, token);
    const plan = await planFix(f.file, file.content, f.rule_id, f.line, f.modules);
    if (!plan.ok) return fail(plan.error);
    const branch = `bulwark/${f.rule_id.replace(/[^\w.-]/g, "-")}-${String(f.id).slice(0, 8)}`;
    const pr = await openFixPr(f.repo, token, {
      path: f.file, content: plan.patched, branch, title: `Bulwark: fix ${f.rule_id} in ${f.file}`, body: prBody(f, plan),
    });
    await pool.query("update findings set status = 'pr_open', pr_url = $2, fix_error = null, fix_engine = $3 where id = $1",
      [f.id, pr.url, plan.engine]);
  } catch (e) {
    await fail(String((e as Error).message ?? e));
  }
}

/** Polls the jobs table until stopped. Runs in the API process or as a separate worker. */
export async function workLoop(shouldStop: () => boolean) {
  while (!shouldStop()) {
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
