// End-to-end test against a running Bulwark Cloud. Usage: node test/e2e.mjs https://host
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.argv[2] ?? "http://localhost:10000").replace(/\/$/, "");
const REPO = process.env.E2E_REPO ?? "hunterh37/Bulwark";
let session = "";
const ok = (m) => console.log("ok  ", m);

async function call(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method, headers: { "content-type": "application/json", ...(session ? { authorization: `Bearer ${session}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, res };
}

const h = await call("GET", "/healthz");
assert.equal(h.status, 200); ok(`healthz ${JSON.stringify(h.data)}`);

for (const p of ["/", "/portal", "/assets/portal.js", "/download/bulwark-runner.mjs", "/download/bulwark-edge-1.0.0.tar.gz", "/download/SHA256SUMS.txt", "/infrastructure"]) {
  const r = await fetch(BASE + p); assert.equal(r.status, 200, p); await r.arrayBuffer();
}
ok("landing, portal, downloads, infrastructure PDF");

const mods = await call("GET", "/v1/modules");
assert.ok(mods.data.some((m) => m.id === "grid-ot")); ok(`modules ${mods.data.map((m) => m.id).join(",")}`);

const email = `e2e+${Date.now()}@bulwark.test`;
const su = await call("POST", "/v1/auth/signup", { email, password: "correct-horse-9", name: "E2E", org: "Springfield Water", sector: "water" });
assert.equal(su.status, 201, JSON.stringify(su.data));
assert.match(su.res.headers.get("set-cookie") ?? "", /bw_session=/); ok(`signup ${email}`);
assert.equal((await call("POST", "/v1/auth/signup", { email, password: "correct-horse-9", org: "x" })).status, 409); ok("duplicate signup rejected");
assert.equal((await call("POST", "/v1/auth/login", { email, password: "wrong-password" })).status, 401); ok("bad password rejected");
const li = await call("POST", "/v1/auth/login", { email, password: "correct-horse-9" });
assert.equal(li.status, 200); session = li.data.token; ok("login");

const me = await call("GET", "/v1/me");
assert.equal(me.data.org.sector, "water"); ok(`me org=${me.data.org.name}`);
assert.equal((await call("PATCH", "/v1/me/profile", { org: "Springfield Water Authority", sector: "power" })).status, 200);
assert.equal((await call("GET", "/v1/me")).data.org.sector, "power"); ok("profile update");

assert.equal((await call("PUT", "/v1/me/modules", { modules: ["nope"] })).status, 400);
assert.equal((await call("PUT", "/v1/me/modules", { modules: ["grid-ot", "secrets-core", "deps-osv"] })).status, 200); ok("modules set");

assert.equal((await call("POST", "/v1/me/github", { token: "ghp_invalid" })).status, 400); ok("invalid GitHub token rejected");
if (process.env.E2E_GITHUB_TOKEN) {
  const g = await call("POST", "/v1/me/github", { token: process.env.E2E_GITHUB_TOKEN });
  assert.equal(g.status, 200); ok(`github connected as ${g.data.login}`);
  const rs = await call("GET", "/v1/me/github/repos"); assert.ok(Array.isArray(rs.data)); ok(`github repos ${rs.data.length}`);
}

assert.equal((await call("POST", "/v1/me/repos", { repo: `https://github.com/${REPO}` })).status, 200); ok(`repo add ${REPO}`);
const sc = await call("POST", "/v1/me/scans", { repo: REPO });
assert.equal(sc.status, 202);
let scan;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  scan = (await call("GET", `/v1/me/scans/${sc.data.id}`)).data;
  if (scan.status === "done" || scan.status === "failed") break;
}
assert.equal(scan.status, "done", scan.error); assert.ok(scan.findings > 0);
ok(`cloud scan ${REPO}@${scan.commit.slice(0, 8)} files=${scan.files} findings=${scan.findings}`);

const sum = (await call("GET", "/v1/me/summary")).data;
const rules = new Set(sum.findings.map((f) => f.rule_id));
for (const id of ["ot.modbus-tcp-server", "ot.ocpp-ws-plain", "secret.aws-key"]) assert.ok(rules.has(id), id);
ok(`summary findings=${sum.findings.length} grid=${sum.findings.filter((f) => f.grid_impact).length}`);
assert.equal((await call("PATCH", `/v1/me/findings/${sum.findings[0].id}`, { status: "ignored" })).status, 200); ok("finding triage");

// Private repo through the GitHub connection: scan, dependency CVEs, verified fix PR.
if (process.env.E2E_GITHUB_TOKEN) {
  const PRIV = process.env.E2E_PRIVATE_REPO ?? "hunterh37/bulwark-e2e-plant";
  await call("POST", "/v1/me/repos", { repo: PRIV });
  const ps = await call("POST", "/v1/me/scans", { repo: PRIV });
  let st;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    st = (await call("GET", `/v1/me/scans/${ps.data.id}`)).data;
    if (st.status === "done" || st.status === "failed") break;
  }
  assert.equal(st.status, "done", st.error); ok(`private scan ${PRIV} files=${st.files} findings=${st.findings}`);
  const fs = (await call("GET", "/v1/me/summary")).data.findings.filter((f) => f.repo === PRIV);
  assert.ok(fs.some((f) => f.rule_id.startsWith("dep.") && /requests@2\.19\.0/.test(f.message)), "deps-osv finding");
  ok(`deps-osv advisories=${fs.filter((f) => f.rule_id.startsWith("dep.")).length}`);
  const target = fs.find((f) => f.rule_id === "secret.aws-key");
  const dry = await call("POST", `/v1/me/findings/${target.id}/fix`, { dryRun: true });
  assert.equal(dry.status, 200, JSON.stringify(dry.data)); assert.ok(dry.data.verification.ruleGone);
  ok(`fix dry run: ${dry.data.after.join(" / ")}`);
  assert.equal((await call("POST", `/v1/me/findings/${target.id}/fix`, {})).status, 202);
  let fx;
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    fx = (await call("GET", `/v1/me/findings/${target.id}`)).data;
    if (fx.status !== "fixing") break;
  }
  assert.equal(fx.status, "pr_open", fx.fix_error); ok(`fix PR ${fx.pr_url}`);
  // Read the PR back from GitHub, confirm the patched file, then close it and delete the branch.
  const gh = (path, init = {}) => fetch(`https://api.github.com/repos/${PRIV}${path}`, { ...init,
    headers: { authorization: `Bearer ${process.env.E2E_GITHUB_TOKEN}`, accept: "application/vnd.github+json", "content-type": "application/json" } });
  const num = fx.pr_url.split("/").pop();
  const pr = await (await gh(`/pulls/${num}`)).json();
  const raw = await (await fetch(`https://api.github.com/repos/${PRIV}/contents/${target.file}?ref=${pr.head.ref}`, {
    headers: { authorization: `Bearer ${process.env.E2E_GITHUB_TOKEN}`, accept: "application/vnd.github.raw" } })).text();
  assert.ok(!raw.includes("AKIAIOSFODNN7EXAMPLE") && raw.includes("process.env.AWS_ACCESS_KEY_ID")); ok("PR branch contains verified patch");
  await gh(`/pulls/${num}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
  await gh(`/git/refs/heads/${pr.head.ref}`, { method: "DELETE" }); ok("PR closed, branch deleted");
}

// Edge runner: download, verify, scan a local checkout, report findings.
const rn = await call("POST", "/v1/me/runners", { mode: "hybrid" });
assert.match(rn.data.token, /^bwr_/); ok("runner token");
const dir = mkdtempSync(join(tmpdir(), "bulwark-e2e-"));
writeFileSync(join(dir, "kit.tgz"), Buffer.from(await (await fetch(BASE + "/download/bulwark-edge-1.0.0.tar.gz")).arrayBuffer()));
execFileSync("tar", ["xzf", "kit.tgz"], { cwd: dir });
const sums = readFileSync(join(dir, "bulwark-edge/SHA256SUMS"), "utf8");
assert.match(sums, /bulwark-runner\.mjs/);
execFileSync("shasum", ["-a", "256", "-c", "SHA256SUMS"], { cwd: join(dir, "bulwark-edge") }); ok("edge kit checksum");
const plant = join(dir, "plant-repo"); mkdirSync(plant);
cpSync(new URL("../../../examples/vulnerable-plant/", import.meta.url), plant, { recursive: true });
const runner = join(dir, "bulwark-edge/bulwark-runner.mjs");
const off = execFileSync("node", [runner, "scan", plant, "--repo", "plant/offline", "--offline", "--out", join(dir, "out")], { encoding: "utf8", env: { ...process.env, BULWARK_URL: "", BULWARK_TOKEN: "" } });
assert.match(off, /offline/); assert.ok(JSON.parse(readFileSync(join(dir, "out/plant_offline.sarif"), "utf8")).runs[0].results.length > 0);
ok(`edge air-gapped: ${off.trim()}`);
const on = execFileSync("node", [runner, "scan", plant, "--repo", "plant/scada-hmi", "--out", join(dir, "out")], { encoding: "utf8", env: { ...process.env, BULWARK_URL: BASE, BULWARK_TOKEN: rn.data.token } });
assert.match(on, /sent scan/); ok(`edge connected: ${on.trim()}`);
const after = (await call("GET", "/v1/me/summary")).data;
assert.ok(after.runners.some((r) => r.last_seen)); assert.ok(after.findings.some((f) => f.repo === "plant/scada-hmi"));
assert.ok(after.findings.some((f) => f.repo === "plant/scada-hmi" && f.rule_id.startsWith("dep.")), "edge deps via OSV proxy");
ok("runner findings visible in portal");

const priv = await fetch(BASE + "/privacy"); assert.equal(priv.status, 200); ok("privacy page");
assert.equal((await call("POST", "/v1/runner/findings", { repo: "x", findings: [] }, { authorization: "Bearer bwr_bad" })).status, 401); ok("bad runner token rejected");
assert.equal((await call("POST", "/v1/github/webhook", {}, { "x-hub-signature-256": "sha256=00" })).status, 401); ok("unsigned webhook rejected");
await call("POST", "/v1/auth/logout"); session = "";
assert.equal((await call("GET", "/v1/me")).status, 401); ok("logout");
console.log(`\nE2E PASS ${BASE}`);
