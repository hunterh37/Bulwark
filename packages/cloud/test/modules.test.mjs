import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runModules } from "../dist/detect/rules.js";
import { planFix } from "../dist/fix.js";
import { parseDeps } from "../dist/modules/deps-osv.js";
import { catalog } from "../dist/modules/index.js";

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

test("lockfile parsing", () => {
  const deps = parseDeps([
    { path: "a/package-lock.json", content: JSON.stringify({ packages: { "": {}, "node_modules/lodash": { version: "4.17.15" } } }) },
    { path: "requirements.txt", content: "requests==2.19.0  # pinned\nflask>=2\n" },
    { path: "go.mod", content: "require golang.org/x/net v0.7.0\n" },
  ]);
  assert.deepEqual(deps.map((d) => `${d.ecosystem}:${d.name}@${d.version}`), ["npm:lodash@4.17.15", "PyPI:requests@2.19.0", "Go:golang.org/x/net@0.7.0"]);
});
