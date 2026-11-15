#!/usr/bin/env node
/**
 * Bulwark Edge runner. Runs inside the operator's network (OT DMZ, IT network or an
 * air-gapped enclave). Scans local git checkouts with Bulwark modules. Source code
 * never leaves the host; only findings (file, line, rule) are sent, and only when a
 * cloud URL and token are configured. Zero dependencies: needs Node 20+.
 *
 *   bulwark-runner scan <dir> [--repo name] [--out results] [--offline] [--fail-on critical|high|medium] [--include-tests]
 *   bulwark-runner watch <dir...> [--every 3600]
 *   bulwark-runner modules
 *
 *   --osv  look up dependency advisories at OSV.dev directly (sends package names and versions only)
 *
 * Env: BULWARK_URL, BULWARK_TOKEN, BULWARK_MODULES (comma list, overrides cloud config)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import type { Detection, FileInput } from "../detect/types.js";
import { runDetectors } from "../detect/index.js";
import type { OsvLookup } from "../modules/types.js";
import { maxSize, SKIP_DIR, TEXT_FILE } from "../github.js";
import { withKev } from "../kev.js";
import { osvDirect, parseDeps } from "../modules/deps-osv.js";
import { DEFAULT_MODULES, MODULES } from "../modules/index.js";
import { components, cyclonedx } from "../sbom.js";

const VERSION = "1.1.0";
const args = process.argv.slice(2);
const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const has = (n: string) => args.includes(`--${n}`);
const url = (process.env.BULWARK_URL ?? "").replace(/\/$/, "");
const token = process.env.BULWARK_TOKEN ?? "";
const online = !!url && !!token && !has("offline");

function walk(root: string): FileInput[] {
  const out: FileInput[] = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const rel = relative(root, full).split("\\").join("/");
      if (SKIP_DIR.test(rel + "/")) continue;
      const st = statSync(full);
      if (st.isDirectory()) visit(full);
      else if (st.size < maxSize(rel) && TEXT_FILE.test(rel)) out.push({ path: rel, content: readFileSync(full, "utf8") });
    }
  };
  visit(root);
  return out;
}

function gitInfo(dir: string) {
  const git = (...a: string[]) => { try { return execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };
  const remote = git("config", "--get", "remote.origin.url").replace(/^.*github\.com[:/]/, "").replace(/\.git$/, "");
  return { commit: git("rev-parse", "HEAD") || "local", repo: remote || basename(resolve(dir)) };
}

async function api(path: string, body: unknown) {
  const res = await fetch(url + path, {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status} ${await res.text()}`);
  return res.json() as Promise<any>;
}

function sarif(found: Detection[]) {
  return {
    version: "2.1.0", $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: { driver: { name: "bulwark", version: VERSION, informationUri: "https://github.com/hunterh37/Bulwark",
        rules: MODULES.flatMap((m) => m.rules.map((r) => ({ id: r.id, shortDescription: { text: r.message }, help: { text: r.fix }, properties: { tags: ["security", r.cwe] } }))) } },
      results: found.map((f) => ({
        ruleId: f.ruleId, level: f.severity === "critical" || f.severity === "high" ? "error" : f.severity === "medium" ? "warning" : "note",
        partialFingerprints: f.fingerprint ? { bulwark: f.fingerprint } : undefined,
        message: { text: f.message },
        locations: [{ physicalLocation: { artifactLocation: { uri: f.file }, region: { startLine: f.line } } }],
      })),
    }],
  };
}

async function scan(dir: string) {
  let modules = process.env.BULWARK_MODULES?.split(",") ?? DEFAULT_MODULES;
  if (online && !process.env.BULWARK_MODULES) modules = (await api("/v1/runner/heartbeat", { version: VERSION })).modules;
  const files = walk(dir);
  // Dependency lookups: through Bulwark Cloud when connected, straight to OSV.dev with --osv, none when offline.
  const osv: OsvLookup | undefined = online
    ? async (queries) => (await api("/v1/runner/osv", { queries })).results
    : has("osv") && !has("offline") ? withKev(osvDirect) : undefined;
  const found = await runDetectors(files, modules, { osv });
  const info = gitInfo(dir);
  const repo = flag("repo") ?? info.repo;
  const outDir = flag("out") ?? "bulwark-results";
  mkdirSync(outDir, { recursive: true });
  const stem = join(outDir, repo.replace(/[^\w.-]+/g, "_"));
  const comps = components(parseDeps(files));
  writeFileSync(`${stem}.json`, JSON.stringify({ repo, commit: info.commit, modules, files: files.length, findings: found }, null, 2));
  writeFileSync(`${stem}.sarif`, JSON.stringify(sarif(found), null, 2));
  writeFileSync(`${stem}.cdx.json`, JSON.stringify(cyclonedx(repo, info.commit, comps, VERSION), null, 2));
  let sent = "offline";
  if (online) sent = `sent scan ${(await api("/v1/runner/findings", { repo, commit: info.commit, files: files.length, findings: found, components: comps })).scan}`;
  const live = found.filter((f) => f.context !== "test");
  const n = (sev: string) => live.filter((f) => f.severity === sev).length;
  console.log(`${repo} ${info.commit.slice(0, 8)} files=${files.length} findings=${live.length} critical=${n("critical")} high=${n("high")} medium=${n("medium")} test-context=${found.length - live.length} components=${comps.length} ${sent} -> ${stem}.json`);
  if (has("verbose") || has("list")) for (const f of has("include-tests") ? found : live) console.log(`  ${f.severity.padEnd(8)} ${f.ruleId}  ${f.file}:${f.line}  ${f.message}`);
  return { critical: n("critical"), high: n("high"), medium: n("medium") };
}

async function main() {
  const [cmd, ...rest] = args;
  const BOOL = new Set(["--offline", "--list", "--verbose", "--include-tests", "--fail-on-critical", "--osv"]);
  const dirs = rest.filter((a, i) => !a.startsWith("--") && (!rest[i - 1]?.startsWith("--") || BOOL.has(rest[i - 1])));
  if (cmd === "modules") {
    for (const m of MODULES) console.log(`${m.id}@${m.version}  ${m.analyze ? "analyzer" : `${m.rules.length} rules`}  ${m.name}`);
  } else if (cmd === "scan" && dirs.length) {
    const gate = has("fail-on-critical") ? "critical" : flag("fail-on");
    const levels = gate === "medium" ? ["critical", "high", "medium"] : gate === "high" ? ["critical", "high"] : gate ? ["critical"] : [];
    let over = 0;
    for (const d of dirs) { const c = await scan(d) as Record<string, number>; for (const l of levels) over += c[l]; }
    if (over) { console.error(`${over} finding${over === 1 ? "" : "s"} at or above ${gate}`); process.exit(2); }
  } else if (cmd === "watch" && dirs.length) {
    const every = Number(flag("every") ?? 3600) * 1000;
    for (;;) {
      for (const d of dirs) await scan(d).catch((e) => console.error(d, e.message));
      await new Promise((r) => setTimeout(r, every));
    }
  } else if (cmd === "version") {
    console.log(VERSION);
  } else {
    console.log("usage: bulwark-runner scan <dir...> [--repo name] [--out dir] [--offline] [--fail-on critical|high|medium] [--list]\n" +
      "       bulwark-runner watch <dir...> [--every seconds]\n       bulwark-runner modules | version");
    process.exit(cmd ? 1 : 0);
  }
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
