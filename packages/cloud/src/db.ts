import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

export async function audit(orgId: string | null, actor: string, action: string, detail: unknown) {
  await pool.query(
    "insert into audit_log (org_id, actor, action, detail) values ($1, $2, $3, $4)",
    [orgId, actor, action, JSON.stringify(detail)],
  );
}

export async function enqueue(kind: "scan" | "fix", payload: unknown) {
  await pool.query("insert into jobs (kind, payload) values ($1, $2)", [kind, JSON.stringify(payload)]);
}

/** Claims one ready job with SKIP LOCKED so many workers can share the table. */
export async function claimJob() {
  const { rows } = await pool.query(
    `update jobs set status = 'running', attempts = attempts + 1
     where id = (select id from jobs where status = 'queued' and run_after <= now()
                 order by id for update skip locked limit 1)
     returning id, kind, payload, attempts`,
  );
  return rows[0] as { id: number; kind: string; payload: any; attempts: number } | undefined;
}

export async function finishJob(id: number, ok: boolean, attempts: number) {
  if (ok) return pool.query("update jobs set status = 'done' where id = $1", [id]);
  const dead = attempts >= 3;
  return pool.query(
    `update jobs set status = $2, run_after = now() + interval '1 minute' * $3 where id = $1`,
    [id, dead ? "dead" : "queued", attempts * attempts],
  );
}
