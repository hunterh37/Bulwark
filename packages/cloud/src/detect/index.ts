import { MODULES } from "../modules/index.js";
import type { AnalyzeContext } from "../modules/types.js";
import { modelDetect } from "./model.js";
import { runModules } from "./rules.js";
import type { Detection, FileInput } from "./types.js";

/** Line rules, module analyzers, then the optional model service. */
export async function runDetectors(files: FileInput[], modules: string[], ctx: AnalyzeContext = {}): Promise<Detection[]> {
  const found = runModules(files, modules);
  for (const m of MODULES.filter((x) => x.analyze && modules.includes(x.id))) {
    try { found.push(...(await m.analyze!(files, ctx))); } catch (e) { console.error(`module ${m.id}`, e); }
  }
  try { found.push(...(await modelDetect(files))); } catch (e) { console.error("model detector", e); }
  return found;
}

export type { Detection, FileInput };
