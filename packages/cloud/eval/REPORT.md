# Bulwark eval

Generated 2026-11-15T20:26:33.081Z. Corpus: 46 labeled lines, 11 fix cases, 4 lockfiles.

## Detection (grid-ot, secrets-core)

Precision 1.000, recall 1.000 (TP 32, FP 0, FN 0).

| Rule | TP | FP | FN | Precision | Recall |
|---|---|---|---|---|---|
| ot.bacnet-bind-all | 1 | 0 | 0 | 1.00 | 1.00 |
| ot.default-credentials | 3 | 0 | 0 | 1.00 | 1.00 |
| ot.dnp3-no-sa | 2 | 0 | 0 | 1.00 | 1.00 |
| ot.iec104-plain | 2 | 0 | 0 | 1.00 | 1.00 |
| ot.iec61850-mms-plain | 1 | 0 | 0 | 1.00 | 1.00 |
| ot.modbus-bind-all | 2 | 0 | 0 | 1.00 | 1.00 |
| ot.modbus-tcp-server | 4 | 0 | 0 | 1.00 | 1.00 |
| ot.modbus-write-unchecked | 2 | 0 | 0 | 1.00 | 1.00 |
| ot.ocpp-ws-plain | 2 | 0 | 0 | 1.00 | 1.00 |
| ot.opcua-security-none | 2 | 0 | 0 | 1.00 | 1.00 |
| ot.setpoint-no-limit | 2 | 0 | 0 | 1.00 | 1.00 |
| secret.aws-key | 2 | 0 | 0 | 1.00 | 1.00 |
| secret.github-token | 1 | 0 | 0 | 1.00 | 1.00 |
| secret.private-key | 2 | 0 | 0 | 1.00 | 1.00 |
| secret.slack-token | 1 | 0 | 0 | 1.00 | 1.00 |
| tls.verify-disabled | 3 | 0 | 0 | 1.00 | 1.00 |

No errors.

## Autofix

10/10 expected autofixes patched and verified by rescan.

| Rule | File | Result | Patched line |
|---|---|---|---|
| secret.aws-key | aws.py | patched, verified | import os / import boto3 / KEY = os.environ["AWS_ACCESS_KEY_ID"] |
| secret.aws-key | aws.js | patched, verified | const key = process.env.AWS_ACCESS_KEY_ID; |
| ot.default-credentials | hmi.py | patched, verified | import os / CREDS = {"user": "op", "password": os.environ["OT_DEVICE_PASSWORD"]} |
| ot.default-credentials | hmi.go | patched, verified | password := os.Getenv("OT_DEVICE_PASSWORD") |
| ot.ocpp-ws-plain | cp.js | patched, verified | const ws = new WebSocket('wss://csms.local/ocpp/CP1'); |
| ot.modbus-bind-all | srv.py | patched, verified | StartTcpServer(context, address=("127.0.0.1", 502)) |
| tls.verify-disabled | tls.js | patched, verified | const a = new https.Agent({ rejectUnauthorized: true }); |
| tls.verify-disabled | tls.py | patched, verified | r = requests.get(url, verify=True) |
| tls.verify-disabled | tls.go | patched, verified | cfg := &tls.Config{InsecureSkipVerify: false} |
| ot.opcua-security-none | opc.cs | patched, verified | config.SecurityMode = MessageSecurityMode.SignAndEncrypt; |
| ot.modbus-tcp-server | srv.py | no autofix for ot.modbus-tcp-server and no ANTHROPIC_API_KEY for a model patch |  |

## Dependencies (deps-osv, live OSV.dev)

4/4 lockfiles matched expected advisories.

| File | Expected | Found | Result |
|---|---|---|---|
| package-lock.json | lodash, minimist | 7 advisories: lodash, minimist | pass |
| requirements.txt | requests | 12 advisories: requests, flask | pass |
| go.mod | golang.org/x/net | 30 advisories: golang.org/x/net | pass |
| package-lock.json | (none) | 0 advisories:  | pass |
