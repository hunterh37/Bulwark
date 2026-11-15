import { modelDetect } from "./model.js";
import { runModules } from "./rules.js";
import type { Detection, FileInput } from "./types.js";

export async function runDetectors(files: FileInput[], modules: string[]): Promise<Detection[]> {
  const found = runModules(files, modules);
  try { found.push(...(await modelDetect(files))); } catch (e) { console.error("model detector", e); }
  return found;
}

export type { Detection, FileInput };
