import { open } from "./crypto.js";
import { claimJob, finishJob, pool } from "./db.js";
import { runDetectors, type Detection } from "./detect/index.js";
import { fetchRepoFiles } from "./github.js";

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
    const token = s.github_token_enc ? open(s.github_token_enc) : undefined;
    const { commit, files } = await fetchRepoFiles(s.repo, s.commit ?? undefined, token);
    const found = await runDetectors(files, s.modules);
    await storeFindings(s.org_id, s.id, s.repo, commit, found);
    await pool.query(
      "update scans set status = 'done', commit = $2, files = $3, findings = $4, finished_at = now() where id = $1",
      [s.id, commit, files.length, found.length]);
  } catch (e) {
    await pool.query("update scans set status = 'failed', error = $2, finished_at = now() where id = $1",
      [s.id, String((e as Error).message ?? e)]);
  }
}

/** Polls the jobs table until stopped. Runs in the API process or as a separate worker. */
export async function workLoop(shouldStop: () => boolean) {
  while (!shouldStop()) {
    const job = await claimJob().catch((e) => { console.error("claim", e); return undefined; });
    if (!job) { await new Promise((r) => setTimeout(r, 1500)); continue; }
    try {
      if (job.kind === "scan") await runScan(job.payload);
      await finishJob(job.id, true, job.attempts);
    } catch (e) {
      console.error("job failed", job.id, e);
      await finishJob(job.id, false, job.attempts);
    }
  }
}
