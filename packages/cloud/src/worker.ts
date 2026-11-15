import { claimJob, finishJob, pool } from "./db.js";
import { runDetectors } from "./detect/index.js";

async function scan(payload: { repo: string; commit: string; installationId: number }) {
  // TODO: mint installation token, fetch tarball for payload.commit, unpack in sandbox.
  const files: { path: string; content: string }[] = [];
  const detections = await runDetectors(files);
  const { rows } = await pool.query("select org_id from repos where full_name = $1", [payload.repo]);
  if (!rows[0]) return;
  for (const d of detections) {
    await pool.query(
      `insert into findings (org_id, repo, commit, detector, rule_id, file, line, severity, grid_impact)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [rows[0].org_id, payload.repo, payload.commit, d.detector, d.ruleId, d.file, d.line, d.severity, d.gridImpact]);
  }
}

async function fix(_payload: { findingId: string }) {
  // TODO: patch via LLM, run tests in sandbox, rescan, open PR only if all pass.
}

let stopping = false;
process.on("SIGTERM", () => { stopping = true; });

while (!stopping) {
  const job = await claimJob();
  if (!job) { await new Promise((r) => setTimeout(r, 2000)); continue; }
  try {
    if (job.kind === "scan") await scan(job.payload);
    else if (job.kind === "fix") await fix(job.payload);
    await finishJob(job.id, true, job.attempts);
  } catch (e) {
    console.error("job failed", job.id, e);
    await finishJob(job.id, false, job.attempts);
  }
}
await pool.end();
