import { randomUUID } from "node:crypto";
import type { Dep } from "./modules/deps-osv.js";

export interface Component { name: string; version: string; ecosystem: string }

export function purl(c: Component): string {
  if (c.ecosystem === "npm") return `pkg:npm/${c.name.replace(/^@/, "%40")}@${c.version}`;
  if (c.ecosystem === "PyPI") return `pkg:pypi/${c.name.toLowerCase().replace(/[_.]+/g, "-")}@${c.version}`;
  if (c.ecosystem === "Go") return `pkg:golang/${c.name}@v${c.version}`;
  return `pkg:generic/${c.name}@${c.version}`;
}

export const components = (deps: Dep[]): Component[] => deps.map(({ name, version, ecosystem }) => ({ name, version, ecosystem }));

/** CycloneDX 1.5 JSON for one repository at one commit. Components come from lockfiles and pinned manifests. */
export function cyclonedx(repo: string, commit: string, comps: Component[], toolVersion: string, at = new Date()) {
  return {
    bomFormat: "CycloneDX", specVersion: "1.5", serialNumber: `urn:uuid:${randomUUID()}`, version: 1,
    metadata: {
      timestamp: at.toISOString(),
      tools: [{ vendor: "Bulwark", name: "bulwark", version: toolVersion }],
      component: { type: "application", "bom-ref": repo, name: repo, version: commit },
    },
    components: comps.map((c) => ({ type: "library", "bom-ref": purl(c), name: c.name, version: c.version, purl: purl(c) })),
  };
}
