import type { Detection, FileInput, Severity } from "../detect/types.js";

export interface Rule {
  id: string;
  re: RegExp;
  severity: Severity;
  message: string;
  fix: string;
  grid?: boolean;
  /** Only test files whose path matches. */
  files?: RegExp;
  /** Rewrites one matching line so the rule no longer fires. Null when no safe rewrite. */
  autofix?: (line: string, path: string) => string | null;
  /** Line inserted at the top of the file when the autofix needs it (e.g. "import os"). */
  needs?: (path: string, content: string) => string | null;
}

export interface OsvQuery { package: { name: string; ecosystem: string }; version: string }
export interface OsvVuln { id: string; summary?: string; aliases?: string[]; severity?: { score: string }[];
  database_specific?: { severity?: string }; affected?: { ranges?: { events: { fixed?: string }[] }[] }[] }

/** Lookup of known vulnerabilities. Cloud calls OSV directly; Edge goes through Bulwark Cloud or skips offline. */
export type OsvLookup = (queries: OsvQuery[]) => Promise<OsvVuln[][]>;
export interface AnalyzeContext { osv?: OsvLookup }

/** A Bulwark module is a versioned detector pack an org can enable. */
export interface BulwarkModule {
  id: string;
  name: string;
  version: string;
  summary: string;
  sectors: string[];
  rules: Rule[];
  /** Whole-repo analysis that is not line regex (manifests, lockfiles). */
  analyze?: (files: FileInput[], ctx: AnalyzeContext) => Promise<Detection[]>;
}
