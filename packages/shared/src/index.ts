export type Severity = "critical" | "high" | "medium" | "low";

export interface Finding {
  id: string;
  orgId: string;
  repo: string;
  commit: string;
  tool: "semgrep" | "trivy" | "gitleaks" | "osv";
  ruleId: string;
  file: string;
  line: number;
  severity: Severity;
  gridImpact: boolean;
}

export interface ScanJob { orgId: string; installationId: number; repo: string; commit: string; }
export interface FixJob { findingId: string; orgId: string; }
