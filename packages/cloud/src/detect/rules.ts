import { createHash } from "node:crypto";
import { MODULES } from "../modules/index.js";
import type { Rule } from "../modules/types.js";
import type { Detection, FileInput } from "./types.js";

/** Test, example, documentation, eval and third-party paths. Findings there are reported at low severity. */
export const TEST_PATH = /(^|\/)(tests?|testing|__tests__|specs?|fixtures?|mocks?|examples?|samples?|demos?|docs?|benchmarks?|fuzz|cypress|e2e|evals?|testdata|third_party|3rdparty|thirdparty|external)\/|(^|\/)test_[^/]*$|[._-](test|spec)\.\w+$|(Test|Tests|IT)\.(java|kt|cs)$|_test\.(go|py|rs|c|cpp)$/i;

const HASH_COMMENT = /\.(py|sh|rb|ya?ml|toml|ini|cfg|conf|env|properties|tf)$|(^|\/)(Dockerfile|\.env[^/]*|requirements[^/]*\.txt)$/i;
const STAR_COMMENT = /\.(c|h|cpp|hpp|cs|java|kt|js|mjs|cjs|ts|tsx|jsx|go|rs|php|scl|st)$/i;
const IMPORT = /^(#\s*include\b|import\s|from\s+\S+\s+import\b|using\s+[\w.]+;|package\s|use\s+[\w:]+)/;
const DECL = /^(export\s+)?(pub(\([\w:]+\))?\s+)?(async\s+)?(fn|def|func|function|class|struct|interface|enum|typedef|extern|virtual|static|inline|public|private|protected|internal|abstract|override)\b/;

/** Comment or import line: no protocol call executes there. */
export function isNoise(path: string, line: string): boolean {
  const t = line.trimStart();
  if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("<!--")) return true;
  if (STAR_COMMENT.test(path) && /^\*(\s|\/|$)/.test(t)) return true;
  if (t.startsWith("#") && HASH_COMMENT.test(path)) return true;
  if (/^("""|''')/.test(t)) return true;
  return IMPORT.test(t);
}

export function fingerprint(ruleId: string, path: string, text: string, nth = 0): string {
  return createHash("sha1").update(`${ruleId}\n${path}\n${text.trim()}\n${nth}`).digest("hex").slice(0, 20);
}

const KEYWORD = /(^|\s)(return|await|new|yield|else|do|throw|case|in|of|not|and|or|if|while)$/;

/** True when the text before a matched call is only type-like tokens, as in `int modbus_write_bit(` or
 *  `MODBUS_API int modbus_tcp_listen(`: a C, C++, Java or C# declaration, not a call. */
function declares(text: string, index: number, path: string): boolean {
  if (index === 0 && /\.(c|h|cc|cpp|hpp)$/i.test(path)) return true; // C prototype with the return type on the line above
  if (".-:=(,;{".includes(text[index])) return false;
  const before = text.slice(0, index).trim();
  return before.length > 0 && /^[A-Za-z_][\w\s*&<>:,]*$/.test(before) && !KEYWORD.test(before);
}

function matches(r: Rule, path: string, text: string): boolean {
  if (text.length >= 2000) return false;
  const m = r.re.exec(text);
  if (!m) return false;
  if (r.unless?.test(text)) return false;
  if (!r.comments && isNoise(path, text)) return false;
  if (r.call && (DECL.test(text.trimStart()) || declares(text, m.index + (m[0].length - m[0].trimStart().length), path))) return false;
  return true;
}

/** Lines of one file that trigger one rule (1-based). Shared by the scanner and the fix verifier. */
export function ruleLines(r: Rule, path: string, content: string, lines = content.split("\n")): number[] {
  if (r.files && !r.files.test(path)) return [];
  if (r.skipPaths?.test(path)) return [];
  if (r.fileHas && !r.fileHas.test(content)) return [];
  const out: number[] = [];
  lines.forEach((text, i) => { if (matches(r, path, text)) out.push(i + 1); });
  return out;
}

/** Runs the rules of the enabled modules over the files. */
export function runModules(files: FileInput[], enabled: string[]): Detection[] {
  const mods = MODULES.filter((m) => enabled.includes(m.id));
  const out: Detection[] = [];
  for (const f of files) {
    const lines = f.content.split("\n");
    const test = TEST_PATH.test(f.path);
    for (const m of mods) for (const r of m.rules) {
      const hit = ruleLines(r, f.path, f.content, lines);
      if (!hit.length) continue;
      const seen = new Map<string, number>();
      for (const n of r.perFile ? hit.slice(0, 1) : hit) {
        const text = lines[n - 1].trim();
        const nth = seen.get(text) ?? 0;
        seen.set(text, nth + 1);
        out.push({
          detector: `${m.id}@${m.version}`, ruleId: r.id, file: f.path, line: n,
          severity: test ? "low" : r.severity, gridImpact: !!r.grid && !test, cwe: r.cwe, fix: r.fix,
          message: r.perFile && hit.length > 1 ? `${r.message} (${hit.length} call sites in this file)` : r.message,
          fingerprint: fingerprint(r.id, f.path, r.perFile ? "" : text, nth),
          ...(test ? { context: "test" as const } : {}),
        });
      }
    }
  }
  return out;
}
