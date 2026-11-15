#!/usr/bin/env node
/**
 * Bulwark Edge runner. Runs inside the operator's network (OT DMZ, IT network or an
 * air-gapped enclave). Scans local git checkouts with Bulwark modules. Source code
 * never leaves the host; only findings (file, line, rule) are sent, and only when a
 * cloud URL and token are configured. Zero dependencies: needs Node 20+.
 *
 *   bulwark-runner scan <dir> [--repo name] [--out results] [--offline]
 *   bulwark-runner watch <dir...> [--every 3600]
 *   bulwark-runner modules
 *
 * Env: BULWARK_URL, BULWARK_TOKEN, BULWARK_MODULES (comma list, overrides cloud config)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import type { Detection, FileInput } from "../detect/types.js";
import { runModules } from "../detect/rules.js";
import { SKIP_DIR, TEXT_FILE } from "../github.js";
import { DEFAULT_MODULES, MODULES } from "../modules/index.js";

const VERSION = "1.0.0";
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
      else if (st.size < 200_000 && TEXT_FILE.test(rel)) out.push({ path: rel, content: readFileSync(full, "utf8") });
    }
  };
  visit(root);
  return out;
}

function gitInfo(dir: string) {
  const git = (...a: string[]) => { try { return execFileSync("git", ["-C", dir, ...a], { encoding: "utf8" }).trim(); } catch { return ""; } };
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
      tool: { driver: { name: "bulwark", version: VERSION, rules: MODULES.flatMap((m) => m.rules.map((r) => ({ id: r.id, shortDescription: { text: r.message }, help: { text: r.fix } }))) } },
      results: found.map((f) => ({
        ruleId: f.ruleId, level: f.severity === "critical" || f.severity === "high" ? "error" : "warning",
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
  const found = runModules(files, modules);
  const info = gitInfo(dir);
  const repo = flag("repo") ?? info.repo;
  const outDir = flag("out") ?? "bulwark-results";
  mkdirSync(outDir, { recursive: true });
  const stem = join(outDir, repo.replace(/[^\w.-]+/g, "_"));
  writeFileSync(`${stem}.json`, JSON.stringify({ repo, commit: info.commit, modules, files: files.length, findings: found }, null, 2));
  writeFileSync(`${stem}.sarif`, JSON.stringify(sarif(found), null, 2));
  let sent = "offline";
  if (online) sent = `sent scan ${(await api("/v1/runner/findings", { repo, commit: info.commit, files: files.length, findings: found })).scan}`;
  const crit = found.filter((f) => f.severity === "critical").length;
  console.log(`${repo} ${info.commit.slice(0, 8)} files=${files.length} findings=${found.length} critical=${crit} ${sent} -> ${stem}.json`);
  return crit;
}

async function main() {
  const [cmd, ...rest] = args;
  const dirs = rest.filter((a, i) => !a.startsWith("--") && !rest[i - 1]?.startsWith("--"));
  if (cmd === "modules") {
    for (const m of MODULES) console.log(`${m.id}@${m.version}  ${m.rules.length} rules  ${m.name}`);
  } else if (cmd === "scan" && dirs.length) {
    let crit = 0;
    for (const d of dirs) crit += await scan(d);
    if (has("fail-on-critical") && crit) process.exit(2);
  } else if (cmd === "watch" && dirs.length) {
    const every = Number(flag("every") ?? 3600) * 1000;
    for (;;) {
      for (const d of dirs) await scan(d).catch((e) => console.error(d, e.message));
      await new Promise((r) => setTimeout(r, every));
    }
  } else if (cmd === "version") {
    console.log(VERSION);
  } else {
    console.log("usage: bulwark-runner scan <dir...> [--repo name] [--out dir] [--offline] [--fail-on-critical]\n" +
      "       bulwark-runner watch <dir...> [--every seconds]\n       bulwark-runner modules | version");
    process.exit(cmd ? 1 : 0);
  }
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); });
