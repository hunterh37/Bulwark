import { modelDetector } from "./model.js";
import { ruleDetector } from "./rules.js";
import type { Detection, Detector, FileInput } from "./types.js";

export const detectors: Detector[] = [ruleDetector, modelDetector];

export async function runDetectors(files: FileInput[]): Promise<Detection[]> {
  const results = await Promise.allSettled(detectors.map((d) => d.detect(files)));
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

export type { Detection, Detector, FileInput };
