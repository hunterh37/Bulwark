import { MODULES } from "../modules/index.js";
import type { Detection, FileInput } from "./types.js";

/** Runs the rules of the enabled modules over the files. */
export function runModules(files: FileInput[], enabled: string[]): Detection[] {
  const mods = MODULES.filter((m) => enabled.includes(m.id));
  const out: Detection[] = [];
  for (const f of files) {
    const lines = f.content.split("\n");
    for (const m of mods) for (const r of m.rules) {
      if (r.files && !r.files.test(f.path)) continue;
      lines.forEach((text, i) => {
        if (text.length < 2000 && r.re.test(text)) {
          out.push({ detector: `${m.id}@${m.version}`, ruleId: r.id, file: f.path, line: i + 1,
            severity: r.severity, message: r.message, fix: r.fix, gridImpact: !!r.grid });
        }
      });
    }
  }
  return out;
}
