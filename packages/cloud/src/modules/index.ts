import { gridOt } from "./grid-ot.js";
import { secretsCore } from "./secrets-core.js";
import type { BulwarkModule } from "./types.js";

export const MODULES: BulwarkModule[] = [gridOt, secretsCore];
export const DEFAULT_MODULES = MODULES.map((m) => m.id);

/** Public catalog entry (rules as counts, regexes stay server side). */
export function catalog() {
  return MODULES.map(({ rules, ...m }) => ({ ...m, rules: rules.length, ruleIds: rules.map((r) => r.id) }));
}

export type { BulwarkModule };
