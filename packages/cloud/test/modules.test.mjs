import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runModules } from "../dist/detect/rules.js";

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
