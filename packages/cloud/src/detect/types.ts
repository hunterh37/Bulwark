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
}
