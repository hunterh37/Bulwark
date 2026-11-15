import { ruleLines, runModules } from "./detect/rules.js";
import { MODULES } from "./modules/index.js";
import type { Rule } from "./modules/types.js";

export interface FixPlan {
  ok: true;
  patched: string;
  line: number;
  before: string[];
  after: string[];
  engine: "autofix" | "claude";
  verification: { ruleGone: boolean; findingsBefore: number; findingsAfter: number };
}
export interface FixFailure { ok: false; error: string }

function ruleById(id: string): Rule | undefined {
  for (const m of MODULES) for (const r of m.rules) if (r.id === id) return r;
}

/** Finds the line that still triggers the rule, preferring the reported line. */
function locate(path: string, content: string, rule: Rule, hint: number): number {
  const hit = ruleLines(rule, path, content);
  return hit.includes(hint) ? hint : hit[0] ?? 0;
}

async function claudeRewrite(path: string, content: string, rule: Rule, line: number): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.FIX_MODEL ?? "claude-sonnet-4-6", max_tokens: 8000,
      system: "You fix one security finding in one source file. Change as little as possible. Keep behavior otherwise identical. Return only the complete corrected file, no prose, no code fences.",
      messages: [{ role: "user", content: `File: ${path}\nFinding: ${rule.id} at line ${line}: ${rule.message}\nRemediation: ${rule.fix}\n\n${content}` }],
    }),
  });
  if (!res.ok) throw new Error(`claude ${res.status}`);
  const body = (await res.json()) as { content: { type: string; text?: string }[] };
  const text = body.content.map((c) => c.text ?? "").join("").replace(/^```\w*\n|\n```\s*$/g, "");
  return text.trim() ? text : null;
}

/** Builds a verified patch for one finding. The patch is accepted only if the rule no longer fires
 *  on the file and no other enabled rule fires more than before. */
export async function planFix(path: string, content: string, ruleId: string, hintLine: number, modules: string[]): Promise<FixPlan | FixFailure> {
  const rule = ruleById(ruleId);
  if (!rule) return { ok: false, error: `no rule ${ruleId}` };
  const lines = content.split("\n");
  const line = locate(path, content, rule, hintLine);
  if (!line) return { ok: false, error: "finding no longer present in the file" };

  let patched: string | null = null;
  let engine: FixPlan["engine"] = "autofix";
  const rewritten = rule.autofix?.(lines[line - 1], path) ?? null;
  if (rewritten !== null && rewritten !== lines[line - 1]) {
    const out = [...lines];
    out[line - 1] = rewritten;
    const imp = rule.needs?.(path, content);
    if (imp) {
      const at = out[0]?.startsWith("#!") ? 1 : 0;
      out.splice(at, 0, imp);
    }
    patched = out.join("\n");
  } else {
    patched = await claudeRewrite(path, content, rule, line);
    engine = "claude";
  }
  if (!patched) return { ok: false, error: `no autofix for ${ruleId} and no ANTHROPIC_API_KEY for a model patch` };

  const before = runModules([{ path, content }], modules);
  const after = runModules([{ path, content: patched }], modules);
  const ruleGone = !after.some((f) => f.ruleId === ruleId) || after.filter((f) => f.ruleId === ruleId).length < before.filter((f) => f.ruleId === ruleId).length;
  const verification = { ruleGone, findingsBefore: before.length, findingsAfter: after.length };
  if (!ruleGone) return { ok: false, error: "patch did not remove the finding" };
  if (after.length >= before.length) return { ok: false, error: "patch introduced another finding" };

  const pLines = patched.split("\n");
  const diffStart = lines.findIndex((l, i) => l !== pLines[i]);
  const shift = pLines.length - lines.length;
  return {
    ok: true, patched, line, engine, verification,
    before: lines.slice(Math.max(0, diffStart), line),
    after: pLines.slice(Math.max(0, diffStart), line + shift),
  };
}

export function prBody(f: { rule_id: string; message: string; fix: string; file: string; severity: string }, plan: FixPlan) {
  const diff = [...plan.before.map((l) => `- ${l}`), ...plan.after.map((l) => `+ ${l}`)].join("\n");
  return [
    `Bulwark fix for **${f.rule_id}** (${f.severity}) in \`${f.file}\`.`, "",
    f.message, "", `Remediation: ${f.fix}`, "",
    "```diff", diff, "```", "",
    `Verification: Bulwark rescanned the patched file. The finding is gone (${plan.verification.findingsBefore} findings before, ${plan.verification.findingsAfter} after). Engine: ${plan.engine}.`,
    f.rule_id === "ot.opcua-security-none" ? "This change needs application certificates on both ends before it can connect." : "",
    "Your CI runs on this branch; merge after it passes.",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
}
