import type { Detection, FileInput, Severity } from "../detect/types.js";
import type { BulwarkModule, OsvQuery, OsvVuln } from "./types.js";

interface Dep { name: string; version: string; ecosystem: "npm" | "PyPI" | "Go"; file: string; line: number }

/** Parses lockfiles and pinned manifests into exact package versions. */
export function parseDeps(files: FileInput[]): Dep[] {
  const deps: Dep[] = [];
  for (const f of files) {
    const base = f.path.split("/").pop() ?? "";
    const lines = f.content.split("\n");
    const lineOf = (needle: string) => Math.max(1, lines.findIndex((l) => l.includes(needle)) + 1);
    if (base === "package-lock.json") {
      try {
        const lock = JSON.parse(f.content);
        for (const [path, info] of Object.entries<any>(lock.packages ?? {})) {
          if (!path || !info?.version) continue;
          const name = path.replace(/^.*node_modules\//, "");
          deps.push({ name, version: info.version, ecosystem: "npm", file: f.path, line: lineOf(`"${path}"`) });
        }
        for (const [name, info] of Object.entries<any>(lock.dependencies ?? {})) {
          if (lock.packages) break;
          if (info?.version) deps.push({ name, version: info.version, ecosystem: "npm", file: f.path, line: lineOf(`"${name}"`) });
        }
      } catch { /* not JSON */ }
    } else if (/^requirements.*\.txt$/.test(base)) {
      lines.forEach((l, i) => {
        const m = l.replace(/#.*/, "").trim().match(/^([A-Za-z0-9_.\-\[\]]+)\s*==\s*([\w.\-+]+)/);
        if (m) deps.push({ name: m[1].replace(/\[.*\]/, "").toLowerCase(), version: m[2], ecosystem: "PyPI", file: f.path, line: i + 1 });
      });
    } else if (base === "go.mod") {
      lines.forEach((l, i) => {
        const m = l.trim().replace(/^require\s+/, "").match(/^([\w.\-]+\.[\w.\-\/]+)\s+v([\w.\-+]+)/);
        if (m) deps.push({ name: m[1], version: m[2], ecosystem: "Go", file: f.path, line: i + 1 });
      });
    }
  }
  const seen = new Set<string>();
  return deps.filter((d) => { const k = `${d.ecosystem}:${d.name}@${d.version}`; return seen.has(k) ? false : (seen.add(k), true); });
}

function severity(v: OsvVuln): Severity {
  const s = (v.database_specific?.severity ?? "").toLowerCase();
  if (s === "critical") return "critical";
  if (s === "high") return "high";
  if (s === "low") return "low";
  return "medium";
}

const fixedIn = (v: OsvVuln) =>
  v.affected?.flatMap((a) => a.ranges ?? []).flatMap((r) => r.events).map((e) => e.fixed).find(Boolean);

/** OSV lookup straight against api.osv.dev (cloud side). */
export async function osvDirect(queries: OsvQuery[]): Promise<OsvVuln[][]> {
  const out: OsvVuln[][] = [];
  for (let i = 0; i < queries.length; i += 500) {
    const chunk = queries.slice(i, i + 500);
    const res = await fetch("https://api.osv.dev/v1/querybatch", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ queries: chunk }),
    });
    if (!res.ok) throw new Error(`osv ${res.status}`);
    const body = (await res.json()) as { results: { vulns?: { id: string }[] }[] };
    const ids = [...new Set(body.results.flatMap((r) => r.vulns?.map((v) => v.id) ?? []))];
    const details = new Map<string, OsvVuln>();
    for (let j = 0; j < ids.length; j += 20) {
      await Promise.all(ids.slice(j, j + 20).map(async (id) => {
        const r = await fetch(`https://api.osv.dev/v1/vulns/${id}`);
        details.set(id, r.ok ? ((await r.json()) as OsvVuln) : { id });
      }));
    }
    out.push(...body.results.map((r) => (r.vulns ?? []).map((v) => details.get(v.id) ?? { id: v.id })));
  }
  return out;
}

export const depsOsv: BulwarkModule = {
  id: "deps-osv",
  name: "Vulnerable Dependencies",
  version: "1.0.0",
  summary: "Known CVEs in npm, PyPI and Go dependencies from lockfiles, matched against OSV.dev.",
  sectors: ["all"],
  rules: [],
  async analyze(files, ctx) {
    if (!ctx.osv) return [];
    const deps = parseDeps(files);
    if (!deps.length) return [];
    const results = await ctx.osv(deps.map((d) => ({ package: { name: d.name, ecosystem: d.ecosystem }, version: d.version })));
    const out: Detection[] = [];
    deps.forEach((d, i) => {
      for (const v of results[i] ?? []) {
        const cve = v.aliases?.find((a) => a.startsWith("CVE-"));
        const fixed = fixedIn(v);
        out.push({
          detector: "deps-osv@1.0.0", ruleId: `dep.${v.id}`, file: d.file, line: d.line, severity: severity(v), gridImpact: false,
          message: `${d.name}@${d.version}: ${cve ? cve + " " : ""}${v.summary ?? v.id}`.slice(0, 300),
          fix: fixed ? `Upgrade ${d.name} to ${fixed} or later.` : `No fixed version published; see https://osv.dev/vulnerability/${v.id}`,
        });
      }
    });
    return out;
  },
};
