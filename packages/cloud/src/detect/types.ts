export type Severity = "critical" | "high" | "medium" | "low";

export interface FileInput { path: string; content: string; }

export interface Detection {
  detector: string;
  ruleId: string;
  file: string;
  line: number;
  severity: Severity;
  message: string;
  fix?: string;
  gridImpact: boolean;
  /** CWE id, e.g. "CWE-319". */
  cwe?: string;
  /** "test" when the file is test, example, documentation or third-party code. Severity is capped at low. */
  context?: "test";
  /** Stable id of the finding across scans: rule, path and the matched text. */
  fingerprint?: string;
  /** Dependency advisory listed in the CISA Known Exploited Vulnerabilities catalog. */
  kev?: boolean;
}
