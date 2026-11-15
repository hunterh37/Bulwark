import type { Detection, Detector, FileInput, Severity } from "./types.js";

interface Rule { id: string; re: RegExp; severity: Severity; message: string; grid?: boolean; }

const RULES: Rule[] = [
  { id: "secret.aws-key", re: /AKIA[0-9A-Z]{16}/, severity: "critical", message: "AWS access key in source" },
  { id: "secret.private-key", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, severity: "critical", message: "Private key in source" },
  { id: "tls.verify-disabled", re: /rejectUnauthorized:\s*false|verify\s*=\s*False|InsecureSkipVerify:\s*true/, severity: "high", message: "TLS verification disabled" },
  { id: "ot.modbus-unauth", re: /ModbusTcpServer|StartTcpServer\(|modbus.*listen/i, severity: "high", message: "Modbus TCP server without auth layer", grid: true },
  { id: "ot.dnp3-no-sa", re: /dnp3.*(outstation|master)/i, severity: "medium", message: "DNP3 endpoint; confirm Secure Authentication v5", grid: true },
  { id: "ot.ocpp-ws-plain", re: /ws:\/\/[^\s"']*ocpp/i, severity: "high", message: "OCPP over plain ws://", grid: true },
];

export const ruleDetector: Detector = {
  name: "bulwark-rules",
  version: "0.1.0",
  async detect(files: FileInput[]) {
    const out: Detection[] = [];
    for (const f of files) {
      f.content.split("\n").forEach((text, i) => {
        for (const r of RULES) {
          if (r.re.test(text)) {
            out.push({ detector: this.name, ruleId: r.id, file: f.path, line: i + 1,
              severity: r.severity, message: r.message, gridImpact: !!r.grid });
          }
        }
      });
    }
    return out;
  },
};
