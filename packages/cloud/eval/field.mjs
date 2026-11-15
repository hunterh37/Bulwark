// Field eval: runs the rule modules over pinned public OT repositories and scores the live findings
// against hand labels in eval/field-labels.json. Writes eval/FIELD.md.
// Usage: node eval/field.mjs <cache-dir>   (clones about 300 MB on first run; not part of CI)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { runModules } from "../dist/detect/rules.js";
import { maxSize, SKIP_DIR, TEXT_FILE } from "../dist/github.js";

export const REPOS = JSON.parse(readFileSync(new URL("./field-repos.json", import.meta.url), "utf8"));
const LABELS = JSON.parse(readFileSync(new URL("./field-labels.json", import.meta.url), "utf8"));
const cache = process.argv[2];
if (!cache) { console.error("usage: node eval/field.mjs <cache-dir>"); process.exit(1); }
mkdirSync(cache, { recursive: true });

function walk(root) {
  const out = [];
  const visit = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name), rel = relative(root, full);
      if (SKIP_DIR.test(rel + "/")) continue;
      const st = statSync(full);
      if (st.isDirectory()) visit(full);
      else if (st.size < maxSize(rel) && TEXT_FILE.test(rel)) out.push({ path: rel, content: readFileSync(full, "utf8") });
    }
  };
  visit(root);
  return out;
}

const per = new Map();
const stat = (r) => per.get(r) ?? (per.set(r, { live: 0, test: 0, tp: 0, fp: 0, unlabeled: 0 }), per.get(r));
const unlabeled = [], repoRows = [];
let files = 0;
for (const [repo, sha] of Object.entries(REPOS)) {
  const dir = join(cache, repo.replace("/", "_"));
  if (!existsSync(dir)) {
    execFileSync("git", ["init", "-q", dir]);
    execFileSync("git", ["-C", dir, "fetch", "-q", "--depth", "1", `https://github.com/${repo}.git`, sha]);
    execFileSync("git", ["-C", dir, "checkout", "-q", "FETCH_HEAD"]);
  }
  const fs = walk(dir);
  files += fs.length;
  const found = runModules(fs, ["grid-ot", "secrets-core"]);
  let live = 0;
  for (const f of found) {
    const s = stat(f.ruleId);
    if (f.context) { s.test++; continue; }
    s.live++; live++;
    const label = LABELS[`${repo}:${f.file}:${f.line}:${f.ruleId}`];
    if (label === "tp") s.tp++; else if (label === "fp") s.fp++; else { s.unlabeled++; unlabeled.push(`${repo}:${f.file}:${f.line}:${f.ruleId}`); }
  }
  repoRows.push(`| ${repo} | ${sha.slice(0, 10)} | ${fs.length} | ${live} | ${found.length - live} |`);
}
let TP = 0, FP = 0, LIVE = 0, TEST = 0;
for (const s of per.values()) { TP += s.tp; FP += s.fp; LIVE += s.live; TEST += s.test; }
const rows = [...per.entries()].sort().map(([r, s]) => `| ${r} | ${s.live} | ${s.tp} | ${s.fp} | ${s.tp + s.fp ? (s.tp / (s.tp + s.fp)).toFixed(2) : "-"} | ${s.test} |`);
const report = `# Bulwark field eval

Rules grid-ot and secrets-core over ${Object.keys(REPOS).length} public OT repositories at pinned commits, ${files} scanned files.
Labels are hand judgments of each live finding: tp when the line creates or configures the insecure thing the rule names, fp otherwise.
Library internals that wrap an insecure constructor are labeled fp.

| | 1.0.0 rules | 1.1.0 rules |
|---|---|---|
| Findings | 5,192 | ${LIVE} live, ${TEST} in test, example or third-party paths |
| Labeled precision of live findings | not labeled; 4,829 came from three rules that matched any mention of a protocol identifier | ${(TP / (TP + FP)).toFixed(2)} (${TP} tp, ${FP} fp) |

Recall is not measured here: the repositories have no ground-truth list of insecure lines. The labeled corpus in REPORT.md covers recall on known patterns.

## By rule

| Rule | Live | TP | FP | Precision | Test context |
|---|---|---|---|---|---|
${rows.join("\n")}

## By repository

| Repository | Commit | Files | Live | Test context |
|---|---|---|---|---|
${repoRows.join("\n")}
${unlabeled.length ? `\n## Unlabeled\n\n${unlabeled.map((u) => "- `" + u + "`").join("\n")}\n` : ""}`;
writeFileSync(new URL("./FIELD.md", import.meta.url), report);
console.log(`live=${LIVE} test=${TEST} tp=${TP} fp=${FP} precision=${(TP / (TP + FP)).toFixed(3)} unlabeled=${unlabeled.length}`);
if (process.argv.includes("--list")) for (const u of unlabeled) console.log(u);
