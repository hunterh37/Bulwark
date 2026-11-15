import cors from "@fastify/cors";
import Fastify from "fastify";
import { createHash, randomBytes } from "node:crypto";
import { audit, enqueue, pool } from "./db.js";
import { verifySignature } from "./github.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.WEB_ORIGIN ?? true });

// Keep raw body for GitHub signature checks.
app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
  (req as any).rawBody = body;
  try { done(null, body ? JSON.parse(body as string) : {}); } catch (e) { done(e as Error); }
});

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

app.get("/healthz", async () => ({ ok: true }));

// Portal: create org (auth is added in the web app; this API trusts PORTAL_KEY for now).
app.addHook("onRequest", async (req, reply) => {
  if (!req.url.startsWith("/v1/portal")) return;
  if (req.headers["x-portal-key"] !== process.env.PORTAL_KEY) return reply.code(401).send({ error: "unauthorized" });
});

app.post<{ Body: { name: string } }>("/v1/portal/orgs", async (req) => {
  const { rows } = await pool.query("insert into orgs (name) values ($1) returning id, name, plan", [req.body.name]);
  await audit(rows[0].id, "portal", "org.create", rows[0]);
  return rows[0];
});

app.get<{ Params: { org: string } }>("/v1/portal/orgs/:org/summary", async (req) => {
  const org = req.params.org;
  const [repos, runners, findings] = await Promise.all([
    pool.query("select full_name from repos where org_id = $1 order by full_name", [org]),
    pool.query("select id, mode, last_seen from runners where org_id = $1", [org]),
    pool.query(
      `select id, repo, file, line, rule_id, severity, grid_impact, status, pr_url
       from findings where org_id = $1 order by created_at desc limit 200`, [org]),
  ]);
  return { repos: repos.rows, runners: runners.rows, findings: findings.rows };
});

app.post<{ Params: { org: string }; Body: { mode?: string } }>("/v1/portal/orgs/:org/runners", async (req) => {
  const token = "bwr_" + randomBytes(24).toString("hex");
  const { rows } = await pool.query(
    "insert into runners (org_id, token_hash, mode) values ($1, $2, $3) returning id",
    [req.params.org, hash(token), req.body.mode ?? "hybrid"]);
  await audit(req.params.org, "portal", "runner.create", { id: rows[0].id });
  return { id: rows[0].id, token }; // shown once
});

// Runner (customer stack or hosted) reports in with its token. Outbound-only from runner.
async function runnerFromAuth(header?: string) {
  const token = header?.replace(/^Bearer /, "");
  if (!token) return undefined;
  const { rows } = await pool.query(
    "update runners set last_seen = now() where token_hash = $1 returning id, org_id", [hash(token)]);
  return rows[0] as { id: string; org_id: string } | undefined;
}

app.post("/v1/runner/heartbeat", async (req, reply) => {
  const r = await runnerFromAuth(req.headers.authorization);
  return r ? { ok: true, runner: r.id } : reply.code(401).send({ error: "bad token" });
});

app.post<{ Body: { repo: string; commit: string; findings: any[] } }>("/v1/runner/findings", async (req, reply) => {
  const r = await runnerFromAuth(req.headers.authorization);
  if (!r) return reply.code(401).send({ error: "bad token" });
  const { repo, commit, findings } = req.body;
  for (const f of findings) {
    await pool.query(
      `insert into findings (org_id, repo, commit, detector, rule_id, file, line, severity, grid_impact)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [r.org_id, repo, commit, f.detector, f.ruleId, f.file, f.line, f.severity, f.gridImpact]);
  }
  await audit(r.org_id, `runner:${r.id}`, "findings.ingest", { repo, commit, count: findings.length });
  return { stored: findings.length };
});

// GitHub App webhook (hosted tier).
app.post("/v1/github/webhook", async (req, reply) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET ?? "";
  if (!verifySignature((req as any).rawBody ?? "", req.headers["x-hub-signature-256"] as string, secret)) {
    return reply.code(401).send({ error: "bad signature" });
  }
  const event = req.headers["x-github-event"];
  const body = req.body as any;
  if (event === "push") {
    await enqueue("scan", {
      installationId: body.installation?.id, repo: body.repository?.full_name, commit: body.after,
    });
  }
  return { ok: true };
});

await app.listen({ port: Number(process.env.PORT ?? 10000), host: "0.0.0.0" });
