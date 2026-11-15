import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runModules } from "../dist/detect/rules.js";
import { planFix } from "../dist/fix.js";
import { depsOsv, parseDeps } from "../dist/modules/deps-osv.js";
import { cyclonedx } from "../dist/sbom.js";
import { checkWebhookUrl } from "../dist/notify.js";
import { catalog } from "../dist/modules/index.js";
import { cleanFindings } from "../dist/jobs.js";

const dir = new URL("../../../examples/vulnerable-plant/", import.meta.url);
const files = ["pump_station.py", "charger.js"].map((p) => ({ path: p, content: readFileSync(new URL(p, dir), "utf8") }));

test("grid-ot and secrets-core flag the fixture", () => {
  const ids = new Set(runModules(files, ["grid-ot", "secrets-core"]).map((f) => f.ruleId));
  for (const id of ["ot.modbus-tcp-server", "ot.modbus-bind-all", "ot.modbus-write-unchecked", "ot.default-credentials",
    "ot.setpoint-no-limit", "ot.ocpp-ws-plain", "tls.verify-disabled", "secret.aws-key"]) assert.ok(ids.has(id), id);
});

test("disabled modules do not run", () => {
  assert.equal(runModules(files, []).length, 0);
});

test("catalog lists three modules with autofix rules", () => {
  const c = catalog();
  assert.deepEqual(c.map((m) => m.id), ["grid-ot", "secrets-core", "deps-osv"]);
  assert.ok(c.find((m) => m.id === "secrets-core").autofix.includes("secret.aws-key"));
});

test("autofix moves the AWS key to the environment and verifies", async () => {
  const plan = await planFix("charger.js", files[1].content, "secret.aws-key", 4, ["grid-ot", "secrets-core"]);
  assert.equal(plan.ok, true);
  assert.match(plan.patched, /process\.env\.AWS_ACCESS_KEY_ID/);
  assert.ok(!plan.patched.includes("AKIA"));
});

test("autofix refuses rules without a safe rewrite", async () => {
  const plan = await planFix("pump_station.py", files[0].content, "ot.modbus-write-unchecked", 8, ["grid-ot"]);
  assert.equal(plan.ok, false);
});

test("test and example paths are reported at low severity without grid impact", () => {
  const f = runModules([{ path: "examples/demo/charger.js", content: files[1].content }], ["grid-ot", "secrets-core"]);
  assert.ok(f.length > 0);
  assert.ok(f.every((x) => x.context === "test" && x.severity === "low" && !x.gridImpact));
});

test("comments, imports and declarations do not match protocol rules", () => {
  const content = ["from pymodbus.server import ModbusTcpServer", "# StartTcpServer(context)", "class Plant(ModbusTcpServer):", "    pass"].join("\n");
  assert.equal(runModules([{ path: "plant.py", content }], ["grid-ot"]).length, 0);
});

test("fingerprints are stable across line moves and unique per finding", () => {
  const a = runModules([{ path: "charger.js", content: files[1].content }], ["grid-ot", "secrets-core"]);
  const b = runModules([{ path: "charger.js", content: "\n\n" + files[1].content }], ["grid-ot", "secrets-core"]);
  assert.deepEqual(a.map((x) => x.fingerprint), b.map((x) => x.fingerprint));
  assert.equal(new Set(a.map((x) => x.fingerprint)).size, a.length);
  assert.ok(a.every((x) => /^CWE-\d+$/.test(x.cwe)));
});

test("CycloneDX SBOM carries purls", () => {
  const bom = cyclonedx("acme/plant", "abc123", [{ name: "@scope/pkg", version: "1.2.3", ecosystem: "npm" }, { name: "Py_Modbus", version: "2.5.0", ecosystem: "PyPI" }, { name: "golang.org/x/net", version: "0.7.0", ecosystem: "Go" }], "1.1.0");
  assert.equal(bom.bomFormat, "CycloneDX");
  assert.deepEqual(bom.components.map((c) => c.purl), ["pkg:npm/%40scope/pkg@1.2.3", "pkg:pypi/py-modbus@2.5.0", "pkg:golang/golang.org/x/net@v0.7.0"]);
});

test("KEV marks advisories and raises severity", async () => {
  const lookup = async () => [[{ id: "GHSA-x", aliases: ["CVE-2021-44228"], kev: true, database_specific: { severity: "MODERATE" } }]];
  const found = await depsOsv.analyze([{ path: "requirements.txt", content: "requests==2.19.0\n" }], { osv: lookup });
  assert.equal(found[0].severity, "critical"); assert.equal(found[0].kev, true); assert.match(found[0].message, /^Known exploited/);
});

test("runner uploads are validated", () => {
  const ok = { ruleId: "ot.x", file: "a.py", line: 3, severity: "high", message: "m", detector: "d", gridImpact: true };
  const out = cleanFindings([ok, null, { ruleId: "x" }, { ...ok, severity: "urgent" }, { ...ok, line: "7", message: "x".repeat(5000) }]);
  assert.equal(out.length, 2); assert.equal(out[1].line, 7); assert.equal(out[1].message.length, 400);
});

test("alert webhooks must be public https hosts", async () => {
  assert.equal(await checkWebhookUrl("http://hooks.slack.com/x"), "https required");
  assert.equal(await checkWebhookUrl("https://127.0.0.1/x"), "host name required");
  assert.equal(await checkWebhookUrl("https://localhost/x"), "host resolves to a private address");
});

test("lockfile parsing", () => {
  const deps = parseDeps([
    { path: "a/package-lock.json", content: JSON.stringify({ packages: { "": {}, "node_modules/lodash": { version: "4.17.15" } } }) },
    { path: "requirements.txt", content: "requests==2.19.0  # pinned\nflask>=2\n" },
    { path: "go.mod", content: "require golang.org/x/net v0.7.0\n" },
  ]);
  assert.deepEqual(deps.map((d) => `${d.ecosystem}:${d.name}@${d.version}`), ["npm:lodash@4.17.15", "PyPI:requests@2.19.0", "Go:golang.org/x/net@0.7.0"]);
});
