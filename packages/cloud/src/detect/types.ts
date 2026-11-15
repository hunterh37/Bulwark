export type Severity = "critical" | "high" | "medium" | "low";

export interface FileInput { path: string; content: string; }

export interface Detection {
  detector: string;
  ruleId: string;
  file: string;
  line: number;
  severity: Severity;
  message: string;
  gridImpact: boolean;
}

/**
 * A detector is anything that turns files into detections: regex rules today,
 * external scanners (Semgrep, Trivy, gitleaks, OSV) and Bulwark ML models later.
 */
export interface Detector {
  name: string;
  version: string;
  detect(files: FileInput[]): Promise<Detection[]>;
}
