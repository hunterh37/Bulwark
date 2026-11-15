import type { OsvLookup, OsvVuln } from "./modules/types.js";

const FEED = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
let cache: { at: number; ids: Set<string>; version: string } = { at: 0, ids: new Set(), version: "" };

/** CVE ids in the CISA Known Exploited Vulnerabilities catalog. Cached 12 h; a failed fetch keeps the last copy. */
export async function kevSet(): Promise<Set<string>> {
  if (Date.now() - cache.at < 12 * 3600_000) return cache.ids;
  try {
    const res = await fetch(process.env.KEV_URL ?? FEED, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`kev ${res.status}`);
    const body = (await res.json()) as { catalogVersion?: string; vulnerabilities: { cveID: string }[] };
    cache = { at: Date.now(), ids: new Set(body.vulnerabilities.map((v) => v.cveID)), version: body.catalogVersion ?? "" };
  } catch (e) {
    console.error("kev feed", (e as Error).message);
    cache = { ...cache, at: Date.now() - 11 * 3600_000 };
  }
  return cache.ids;
}

export const kevInfo = () => ({ entries: cache.ids.size, version: cache.version });

/** Wraps an OSV lookup so advisories whose CVE is in KEV carry kev: true. */
export function withKev(lookup: OsvLookup): OsvLookup {
  return async (queries) => {
    const [results, kev] = await Promise.all([lookup(queries), kevSet()]);
    const mark = (v: OsvVuln): OsvVuln => ([v.id, ...(v.aliases ?? [])].some((a) => kev.has(a)) ? { ...v, kev: true } : v);
    return results.map((vs) => vs.map(mark));
  };
}
