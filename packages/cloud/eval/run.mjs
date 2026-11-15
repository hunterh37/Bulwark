// Detector and autofix eval. Writes eval/REPORT.md and exits 1 if gates fail.
// Usage: node eval/run.mjs [--no-network]
import { writeFileSync } from "node:fs";
import { runModules } from "../dist/detect/rules.js";
import { runDetectors } from "../dist/detect/index.js";
import { planFix } from "../dist/fix.js";
import { osvDirect } from "../dist/modules/deps-osv.js";
import { CASES, DEP_CASES, FIX_CASES } from "./corpus.mjs";

const MODS = ["grid-ot", "secrets-core"];
const offline = process.argv.includes("--no-network");
const per = new Map();
const stat = (r) => per.get(r) ?? (per.set(r, { tp: 0, fp: 0, fn: 0 }), per.get(r));
const misses = [];

for (const [path, code, expect] of CASES) {
  const got = new Set(runModules([{ path, content: code }], MODS).map((f) => f.ruleId));
  const want = expect == null ? [] : [].concat(expect);
  for (const e of want) {
    if (got.has(e)) stat(e).tp++; else { stat(e).fn++; misses.push(`FN ${e} ${path}: ${code}`); }
  }
  for (const r of got) if (!want.includes(r)) { stat(r).fp++; misses.push(`FP ${r} ${path}: ${code}`); }
}
let TP = 0, FP = 0, FN = 0;
for (const s of per.values()) { TP += s.tp; FP += s.fp; FN += s.fn; }
const precision = TP / (TP + FP), recall = TP / (TP + FN);

const fixRows = [];
let fixOk = 0, fixExpected = 0;
for (const [rule, path, content] of FIX_CASES) {
  const plan = await planFix(path, content, rule, 0, MODS);
  const expectFix = rule !== "ot.modbus-tcp-server";
  if (expectFix) fixExpected++;
  if (plan.ok && expectFix) fixOk++;
  fixRows.push(`| ${rule} | ${path} | ${plan.ok ? "patched, verified" : plan.error} | ${plan.ok ? plan.after.join(" / ").replace(/\|/g, "\\|") : ""} |`);
}

const depRows = [];
let depOk = 0;
if (!offline) {
  for (const [path, content, expectPkgs] of DEP_CASES) {
    const found = await runDetectors([{ path, content }], ["deps-osv"], { osv: osvDirect });
    const pkgs = new Set(found.map((f) => f.message.split("@")[0]));
    const pass = expectPkgs.every((p) => pkgs.has(p)) && (expectPkgs.length > 0 || found.length === 0);
    if (pass) depOk++;
    depRows.push(`| ${path} | ${expectPkgs.join(", ") || "(none)"} | ${found.length} advisories: ${[...pkgs].join(", ")} | ${pass ? "pass" : "FAIL"} |`);
  }
}

const rows = [...per.entries()].sort().map(([r, s]) =>
  `| ${r} | ${s.tp} | ${s.fp} | ${s.fn} | ${s.tp + s.fp ? (s.tp / (s.tp + s.fp)).toFixed(2) : "-"} | ${s.tp + s.fn ? (s.tp / (s.tp + s.fn)).toFixed(2) : "-"} |`);
const report = `# Bulwark eval

Generated ${new Date().toISOString()}. Corpus: ${CASES.length} labeled lines, ${FIX_CASES.length} fix cases, ${DEP_CASES.length} lockfiles.

## Detection (grid-ot, secrets-core)

Precision ${precision.toFixed(3)}, recall ${recall.toFixed(3)} (TP ${TP}, FP ${FP}, FN ${FN}).

| Rule | TP | FP | FN | Precision | Recall |
|---|---|---|---|---|---|
${rows.join("\n")}

${misses.length ? "Errors:\n\n" + misses.map((m) => "- `" + m.replace(/`/g, "'") + "`").join("\n") : "No errors."}

## Autofix

${fixOk}/${fixExpected} expected autofixes patched and verified by rescan.

| Rule | File | Result | Patched line |
|---|---|---|---|
${fixRows.join("\n")}

## Dependencies (deps-osv, live OSV.dev)

${offline ? "Skipped (--no-network)." : `${depOk}/${DEP_CASES.length} lockfiles matched expected advisories.\n\n| File | Expected | Found | Result |\n|---|---|---|---|\n${depRows.join("\n")}`}
`;
writeFileSync(new URL("./REPORT.md", import.meta.url), report);
console.log(`precision=${precision.toFixed(3)} recall=${recall.toFixed(3)} autofix=${fixOk}/${fixExpected} deps=${offline ? "skipped" : `${depOk}/${DEP_CASES.length}`}`);
const pass = precision >= 0.9 && recall >= 0.9 && fixOk === fixExpected && (offline || depOk === DEP_CASES.length);
process.exit(pass ? 0 : 1);
