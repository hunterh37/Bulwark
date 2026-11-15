import cors from "@fastify/cors";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { checkPassword, hashPassword, seal, sha256 } from "./crypto.js";
import { audit, enqueue, pool } from "./db.js";
import { ghRepos, ghUser, verifySignature } from "./github.js";
import { open } from "./crypto.js";
import { storeFindings, workLoop } from "./jobs.js";
import { planFix } from "./fix.js";
import { getFile } from "./github.js";
import { osvDirect } from "./modules/deps-osv.js";
import { migrate } from "./migrate.js";
import { catalog, DEFAULT_MODULES, MODULES } from "./modules/index.js";

await migrate();
const app = Fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 });
await app.register(cors, { origin: process.env.WEB_ORIGIN ?? true, credentials: true });

app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
  (req as any).rawBody = body;
  try { done(null, body ? JSON.parse(body as string) : {}); } catch (e) { done(e as Error); }
});

const PUBLIC = new URL("../public/", import.meta.url).pathname;
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".svg": "image/svg+xml", ".pdf": "application/pdf", ".gz": "application/gzip", ".tgz": "application/gzip",
  ".yml": "text/yaml", ".yaml": "text/yaml", ".md": "text/markdown", ".json": "application/json", ".sh": "text/x-shellscript",
};

async function sendFile(reply: FastifyReply, rel: string) {
  const path = normalize(join(PUBLIC, rel));
  if (!path.startsWith(PUBLIC)) return reply.code(404).send();
  try {
    const body = await readFile(path);
    const type = TYPES[extname(path)] ?? "application/octet-stream";
    if (rel.startsWith("download/")) reply.header("content-disposition", `attachment; filename="${rel.split("/").pop()}"`);
    return reply.type(type).send(body);
  } catch { return reply.code(404).send({ error: "not found" }); }
}

app.get("/", (_q, r) => sendFile(r, "index.html"));
app.get("/portal", (_q, r) => sendFile(r, "portal.html"));
app.get("/privacy", (_q, r) => sendFile(r, "privacy.html"));
app.get("/infrastructure", (_q, r) => sendFile(r, "download/Bulwark-Infrastructure.pdf"));
app.get<{ Params: { "*": string } }>("/assets/*", (q, r) => sendFile(r, "assets/" + q.params["*"]));
app.get<{ Params: { "*": string } }>("/download/*", (q, r) => sendFile(r, "download/" + q.params["*"]));
app.get("/healthz", async () => {
  await pool.query("select 1");
  return { ok: true, modules: MODULES.map((m) => `${m.id}@${m.version}`) };
});

// ---------- rate limiting (per IP, fixed window, in memory) ----------
const hits = new Map<string, { n: number; reset: number }>();
function limited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) { hits.set(key, { n: 1, reset: now + windowMs }); return false; }
  h.n += 1;
  return h.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, 60_000).unref();
const clientIp = (req: FastifyRequest) => String(req.headers["x-forwarded-for"] ?? req.ip).split(",")[0].trim();

app.addHook("onRequest", async (req, reply) => {
  const ip = clientIp(req);
  if (req.method === "POST" && req.url.startsWith("/v1/auth/") && limited(`auth:${ip}`, Number(process.env.AUTH_RATE ?? 20), 15 * 60_000)) {
    return reply.code(429).send({ error: "too many attempts, retry in 15 minutes" });
  }
  if (req.url.startsWith("/v1/") && limited(`api:${ip}`, 600, 60_000)) return reply.code(429).send({ error: "rate limited" });
});

// ---------- accounts ----------
type User = { id: string; email: string; name: string; org_id: string };
const COOKIE = "bw_session";
const secure = process.env.NODE_ENV === "production";

async function newSession(reply: FastifyReply, userId: string) {
  const token = "bws_" + randomBytes(24).toString("hex");
  await pool.query("insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + interval '30 days')",
    [sha256(token), userId]);
  reply.header("set-cookie",
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure ? "; Secure" : ""}`);
  return token;
}

function sessionToken(req: FastifyRequest) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer bws_")) return auth.slice(7);
  const m = (req.headers.cookie ?? "").match(new RegExp(`${COOKIE}=([^;]+)`));
  return m?.[1];
}

async function currentUser(req: FastifyRequest): Promise<User | undefined> {
  const t = sessionToken(req);
  if (!t) return undefined;
  const { rows } = await pool.query(
    `select u.id, u.email, u.name, u.org_id from sessions s join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`, [sha256(t)]);
  return rows[0];
}

app.decorateRequest("user", null);
app.addHook("preHandler", async (req, reply) => {
  if (!req.url.startsWith("/v1/me")) return;
  const u = await currentUser(req);
  if (!u) return reply.code(401).send({ error: "sign in required" });
  (req as any).user = u;
});
const me = (req: FastifyRequest) => (req as any).user as User;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SECTORS = ["power", "water", "ev-charging", "building", "oil-gas", "other"];

app.post<{ Body: { email?: string; password?: string; name?: string; org?: string; sector?: string } }>(
  "/v1/auth/signup", async (req, reply) => {
    const { email = "", password = "", name = "", org = "", sector = "power" } = req.body ?? {};
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e)) return reply.code(400).send({ error: "valid email required" });
    if (password.length < 8) return reply.code(400).send({ error: "password must be 8+ characters" });
    if (!org.trim()) return reply.code(400).send({ error: "organization name required" });
    const exists = await pool.query("select 1 from users where email = $1", [e]);
    if (exists.rowCount) return reply.code(409).send({ error: "account exists" });
    const o = await pool.query("insert into orgs (name, sector, modules) values ($1, $2, $3) returning id",
      [org.trim(), SECTORS.includes(sector) ? sector : "other", DEFAULT_MODULES]);
    const u = await pool.query(
      "insert into users (email, name, pw_hash, org_id) values ($1, $2, $3, $4) returning id",
      [e, name.trim(), hashPassword(password), o.rows[0].id]);
    await audit(o.rows[0].id, e, "account.create", { org: org.trim(), sector });
    const token = await newSession(reply, u.rows[0].id);
    return reply.code(201).send({ ok: true, token });
  });

app.post<{ Body: { email?: string; password?: string } }>("/v1/auth/login", async (req, reply) => {
  const e = (req.body?.email ?? "").trim().toLowerCase();
  const { rows } = await pool.query("select id, pw_hash, org_id from users where email = $1", [e]);
  if (!rows[0] || !checkPassword(req.body?.password ?? "", rows[0].pw_hash)) {
    return reply.code(401).send({ error: "wrong email or password" });
  }
  await audit(rows[0].org_id, e, "session.create", {});
  return { ok: true, token: await newSession(reply, rows[0].id) };
});

app.post("/v1/auth/logout", async (req, reply) => {
  const t = sessionToken(req);
  if (t) await pool.query("delete from sessions where token_hash = $1", [sha256(t)]);
  reply.header("set-cookie", `${COOKIE}=; Path=/; HttpOnly; Max-Age=0`);
  return { ok: true };
});

app.get("/v1/modules", async () => catalog());

app.get("/v1/me", async (req) => {
  const u = me(req);
  const { rows } = await pool.query(
    "select id, name, sector, plan, modules, github_login from orgs where id = $1", [u.org_id]);
  return { user: { id: u.id, email: u.email, name: u.name }, org: rows[0], githubOAuth: !!process.env.GITHUB_CLIENT_ID };
});

app.patch<{ Body: { name?: string; org?: string; sector?: string } }>("/v1/me/profile", async (req, reply) => {
  const u = me(req);
  const { name, org, sector } = req.body ?? {};
  if (sector && !SECTORS.includes(sector)) return reply.code(400).send({ error: "unknown sector" });
  if (name !== undefined) await pool.query("update users set name = $2 where id = $1", [u.id, name.trim()]);
  if (org?.trim()) await pool.query("update orgs set name = $2 where id = $1", [u.org_id, org.trim()]);
  if (sector) await pool.query("update orgs set sector = $2 where id = $1", [u.org_id, sector]);
  await audit(u.org_id, u.email, "profile.update", req.body);
  return { ok: true };
});

app.put<{ Body: { modules?: string[] } }>("/v1/me/modules", async (req, reply) => {
  const u = me(req);
  const ids = req.body?.modules ?? [];
  const known = new Set(MODULES.map((m) => m.id));
  const bad = ids.filter((i) => !known.has(i));
  if (bad.length) return reply.code(400).send({ error: `unknown module ${bad.join(",")}` });
  await pool.query("update orgs set modules = $2 where id = $1", [u.org_id, ids]);
  await audit(u.org_id, u.email, "modules.set", ids);
  return { ok: true, modules: ids };
});

// ---------- GitHub ----------
async function saveGithub(orgId: string, actor: string, token: string) {
  const user = await ghUser(token);
  await pool.query("update orgs set github_login = $2, github_token_enc = $3 where id = $1", [orgId, user.login, seal(token)]);
  await audit(orgId, actor, "github.connect", { login: user.login });
  return user.login;
}

app.post<{ Body: { token?: string } }>("/v1/me/github", async (req, reply) => {
  const u = me(req);
  try { return { ok: true, login: await saveGithub(u.org_id, u.email, (req.body?.token ?? "").trim()) }; }
  catch { return reply.code(400).send({ error: "GitHub rejected the token" }); }
});

app.delete("/v1/me/github", async (req) => {
  const u = me(req);
  await pool.query("update orgs set github_login = null, github_token_enc = null where id = $1", [u.org_id]);
  await audit(u.org_id, u.email, "github.disconnect", {});
  return { ok: true };
});

app.get("/v1/me/github/repos", async (req, reply) => {
  const u = me(req);
  const { rows } = await pool.query("select github_token_enc from orgs where id = $1", [u.org_id]);
  if (!rows[0]?.github_token_enc) return reply.code(400).send({ error: "GitHub not connected" });
  return ghRepos(open(rows[0].github_token_enc));
});

// OAuth flow, enabled when a GitHub OAuth App is configured.
app.get("/v1/me/github/oauth", async (req, reply) => {
  const id = process.env.GITHUB_CLIENT_ID;
  if (!id) return reply.code(404).send({ error: "GitHub OAuth not configured" });
  const state = randomBytes(16).toString("hex");
  reply.header("set-cookie", `bw_gh_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure ? "; Secure" : ""}`);
  return reply.redirect(`https://github.com/login/oauth/authorize?client_id=${id}&scope=repo%20read:user&state=${state}`);
});

app.get<{ Querystring: { code?: string; state?: string } }>("/v1/me/github/callback", async (req, reply) => {
  const u = me(req);
  const cookieState = (req.headers.cookie ?? "").match(/bw_gh_state=([^;]+)/)?.[1];
  if (!req.query.code || !cookieState || cookieState !== req.query.state) return reply.redirect("/portal?gh=state");
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST", headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code: req.query.code }),
  });
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) return reply.redirect("/portal?gh=denied");
  await saveGithub(u.org_id, u.email, body.access_token);
  return reply.redirect("/portal?gh=ok");
});

// ---------- repos, scans, findings ----------
const REPO = /^[\w.-]+\/[\w.-]+$/;

app.post<{ Body: { repo?: string } }>("/v1/me/repos", async (req, reply) => {
  const u = me(req);
  const repo = (req.body?.repo ?? "").trim().replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
  if (!REPO.test(repo)) return reply.code(400).send({ error: "use owner/name" });
  await pool.query("insert into repos (org_id, full_name) values ($1, $2) on conflict do nothing", [u.org_id, repo]);
  await audit(u.org_id, u.email, "repo.add", { repo });
  return { ok: true, repo };
});

app.delete<{ Params: { owner: string; name: string } }>("/v1/me/repos/:owner/:name", async (req) => {
  const u = me(req);
  await pool.query("delete from repos where org_id = $1 and full_name = $2", [u.org_id, `${req.params.owner}/${req.params.name}`]);
  return { ok: true };
});

app.post<{ Body: { repo?: string; ref?: string } }>("/v1/me/scans", async (req, reply) => {
  const u = me(req);
  const repo = req.body?.repo ?? "";
  const known = await pool.query("select 1 from repos where org_id = $1 and full_name = $2", [u.org_id, repo]);
  if (!known.rowCount) return reply.code(404).send({ error: "add the repo first" });
  const { rows } = await pool.query(
    "insert into scans (org_id, repo, commit) values ($1, $2, $3) returning id", [u.org_id, repo, req.body?.ref ?? null]);
  await enqueue("scan", { scanId: rows[0].id });
  await audit(u.org_id, u.email, "scan.request", { repo });
  return reply.code(202).send({ id: rows[0].id, status: "queued" });
});

app.get<{ Params: { id: string } }>("/v1/me/scans/:id", async (req, reply) => {
  const u = me(req);
  const { rows } = await pool.query("select * from scans where id = $1 and org_id = $2", [req.params.id, u.org_id]);
  return rows[0] ?? reply.code(404).send({ error: "not found" });
});

app.patch<{ Params: { id: string }; Body: { status?: string } }>("/v1/me/findings/:id", async (req, reply) => {
  const u = me(req);
  const s = req.body?.status ?? "";
  if (!["open", "fixed", "ignored"].includes(s)) return reply.code(400).send({ error: "bad status" });
  await pool.query("update findings set status = $3 where id = $1 and org_id = $2", [req.params.id, u.org_id, s]);
  return { ok: true };
});

app.post<{ Params: { id: string }; Body: { dryRun?: boolean } }>("/v1/me/findings/:id/fix", async (req, reply) => {
  const u = me(req);
  const { rows } = await pool.query(
    `select f.id, f.repo, f.file, f.line, f.rule_id, f.commit, o.modules, o.github_token_enc
     from findings f join orgs o on o.id = f.org_id where f.id = $1 and f.org_id = $2`, [req.params.id, u.org_id]);
  const f = rows[0];
  if (!f) return reply.code(404).send({ error: "not found" });
  if (req.body?.dryRun) {
    if (f.commit === "local") return reply.code(400).send({ error: "runner findings are fixed on the Edge host" });
    const token = f.github_token_enc ? open(f.github_token_enc) : process.env.GITHUB_TOKEN || undefined;
    try {
      const file = await getFile(f.repo, f.file, f.commit, token);
      const plan = await planFix(f.file, file.content, f.rule_id, f.line, f.modules);
      if (!plan.ok) return reply.code(422).send({ error: plan.error });
      const { patched, ...rest } = plan;
      return rest;
    } catch (e) { return reply.code(502).send({ error: String((e as Error).message) }); }
  }
  if (!f.github_token_enc) return reply.code(400).send({ error: "connect GitHub with write access to open fix PRs" });
  await pool.query("update findings set status = 'fixing', fix_error = null where id = $1", [f.id]);
  await enqueue("fix", { findingId: f.id });
  await audit(u.org_id, u.email, "fix.request", { finding: f.id, rule: f.rule_id });
  return reply.code(202).send({ status: "fixing" });
});

app.get<{ Params: { id: string } }>("/v1/me/findings/:id", async (req, reply) => {
  const { rows } = await pool.query("select * from findings where id = $1 and org_id = $2", [req.params.id, me(req).org_id]);
  return rows[0] ?? reply.code(404).send({ error: "not found" });
});

app.get("/v1/me/summary", async (req) => {
  const org = me(req).org_id;
  const [repos, runners, scans, findings, auditRows] = await Promise.all([
    pool.query("select full_name from repos where org_id = $1 order by full_name", [org]),
    pool.query("select id, mode, last_seen from runners where org_id = $1 order by last_seen desc nulls last", [org]),
    pool.query(`select id, repo, commit, source, status, files, findings, error, created_at from scans
                where org_id = $1 order by created_at desc limit 20`, [org]),
    pool.query(`select id, repo, commit, file, line, rule_id, detector, severity, grid_impact, message, fix, status, pr_url, fix_error
                from findings where org_id = $1 and scan_id in
                  (select distinct on (repo) id from scans where org_id = $1 and status = 'done' order by repo, created_at desc)
                order by case severity when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end, file, line
                limit 500`, [org]),
    pool.query("select actor, action, at from audit_log where org_id = $1 order by at desc limit 25", [org]),
  ]);
  return { repos: repos.rows, runners: runners.rows, scans: scans.rows, findings: findings.rows, audit: auditRows.rows };
});

app.post<{ Body: { mode?: string; name?: string } }>("/v1/me/runners", async (req) => {
  const u = me(req);
  const token = "bwr_" + randomBytes(24).toString("hex");
  const mode = ["hosted", "hybrid", "airgap"].includes(req.body?.mode ?? "") ? req.body!.mode : "hybrid";
  const { rows } = await pool.query(
    "insert into runners (org_id, token_hash, mode) values ($1, $2, $3) returning id", [u.org_id, sha256(token), mode]);
  await audit(u.org_id, u.email, "runner.create", { id: rows[0].id, mode });
  return { id: rows[0].id, token, mode };
});

// ---------- runner (customer network, outbound HTTPS only) ----------
async function runnerFromAuth(header?: string) {
  const token = header?.replace(/^Bearer /, "");
  if (!token?.startsWith("bwr_")) return undefined;
  const { rows } = await pool.query(
    `update runners r set last_seen = now() from orgs o where r.token_hash = $1 and o.id = r.org_id
     returning r.id, r.org_id, o.modules`, [sha256(token)]);
  return rows[0] as { id: string; org_id: string; modules: string[] } | undefined;
}

app.post("/v1/runner/heartbeat", async (req, reply) => {
  const r = await runnerFromAuth(req.headers.authorization);
  return r ? { ok: true, runner: r.id, modules: r.modules } : reply.code(401).send({ error: "bad token" });
});

app.post<{ Body: { repo: string; commit?: string; files?: number; findings: any[] } }>(
  "/v1/runner/findings", async (req, reply) => {
    const r = await runnerFromAuth(req.headers.authorization);
    if (!r) return reply.code(401).send({ error: "bad token" });
    const { repo, commit = "local", files = 0, findings = [] } = req.body ?? ({} as any);
    if (!repo || !Array.isArray(findings)) return reply.code(400).send({ error: "repo and findings[] required" });
    const s = await pool.query(
      `insert into scans (org_id, repo, commit, source, status, files, findings, finished_at)
       values ($1, $2, $3, 'runner', 'done', $4, $5, now()) returning id`,
      [r.org_id, repo, commit, files, findings.length]);
    await pool.query("insert into repos (org_id, full_name) values ($1, $2) on conflict do nothing", [r.org_id, repo]);
    await storeFindings(r.org_id, s.rows[0].id, repo, commit, findings);
    await audit(r.org_id, `runner:${r.id}`, "findings.ingest", { repo, commit, count: findings.length });
    return { stored: findings.length, scan: s.rows[0].id };
  });

// Dependency lookups for connected Edge runners: package names and versions only, never source.
app.post<{ Body: { queries: any[] } }>("/v1/runner/osv", async (req, reply) => {
  const r = await runnerFromAuth(req.headers.authorization);
  if (!r) return reply.code(401).send({ error: "bad token" });
  const q = Array.isArray(req.body?.queries) ? req.body.queries.slice(0, 5000) : [];
  try { return { results: await osvDirect(q) }; } catch (e) { return reply.code(502).send({ error: String((e as Error).message) }); }
});

// ---------- GitHub App webhook ----------
app.post("/v1/github/webhook", async (req, reply) => {
  if (!verifySignature((req as any).rawBody ?? "", req.headers["x-hub-signature-256"] as string, process.env.GITHUB_WEBHOOK_SECRET ?? "")) {
    return reply.code(401).send({ error: "bad signature" });
  }
  const body = req.body as any;
  if (req.headers["x-github-event"] === "push" && body.repository?.full_name) {
    const { rows } = await pool.query("select org_id from repos where full_name = $1", [body.repository.full_name]);
    for (const row of rows) {
      const s = await pool.query("insert into scans (org_id, repo, commit) values ($1, $2, $3) returning id",
        [row.org_id, body.repository.full_name, body.after]);
      await enqueue("scan", { scanId: s.rows[0].id });
    }
  }
  return { ok: true };
});

let stopping = false;
process.on("SIGTERM", () => { stopping = true; void app.close(); });
await app.listen({ port: Number(process.env.PORT ?? 10000), host: "0.0.0.0" });
if (process.env.INLINE_WORKER !== "false") void workLoop(() => stopping);
