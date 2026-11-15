import { depsOsv } from "./deps-osv.js";
import { gridOt } from "./grid-ot.js";
import { secretsCore } from "./secrets-core.js";
import type { BulwarkModule } from "./types.js";

export const MODULES: BulwarkModule[] = [gridOt, secretsCore, depsOsv];
export const DEFAULT_MODULES = MODULES.map((m) => m.id);

/** Public catalog entry (rules as counts, regexes stay server side). */
export function catalog() {
  return MODULES.map(({ rules, analyze, ...m }) => ({
    ...m, rules: rules.length, ruleIds: rules.map((r) => r.id), autofix: rules.filter((r) => r.autofix).map((r) => r.id),
    ruleList: rules.map((r) => ({ id: r.id, severity: r.severity, cwe: r.cwe, message: r.message, fix: r.fix, autofix: !!r.autofix })),
    analyzer: !!analyze,
  }));
}

export type { BulwarkModule };
