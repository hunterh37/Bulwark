import type { Severity } from "../detect/types.js";

export interface Rule {
  id: string;
  re: RegExp;
  severity: Severity;
  message: string;
  fix: string;
  grid?: boolean;
  /** Only test files whose path matches. */
  files?: RegExp;
}

/** A Bulwark module is a versioned detector pack an org can enable. */
export interface BulwarkModule {
  id: string;
  name: string;
  version: string;
  summary: string;
  sectors: string[];
  rules: Rule[];
}
