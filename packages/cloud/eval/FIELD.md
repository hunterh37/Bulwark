# Bulwark field eval

Rules grid-ot and secrets-core over 15 public OT repositories at pinned commits, 10233 scanned files.
Labels are hand judgments of each live finding: tp when the line creates or configures the insecure thing the rule names, fp otherwise.
Library internals that wrap an insecure constructor are labeled fp.

| | 1.0.0 rules | 1.1.0 rules |
|---|---|---|
| Findings | 5,192 | 47 live, 145 in test, example or third-party paths |
| Labeled precision of live findings | not labeled; 4,829 came from three rules that matched any mention of a protocol identifier | 0.66 (31 tp, 16 fp) |

Recall is not measured here: the repositories have no ground-truth list of insecure lines. The labeled corpus in REPORT.md covers recall on known patterns.

## By rule

| Rule | Live | TP | FP | Precision | Test context |
|---|---|---|---|---|---|
| ot.bacnet-bind-all | 0 | 0 | 0 | - | 1 |
| ot.default-credentials | 5 | 4 | 1 | 0.80 | 5 |
| ot.dnp3-no-sa | 13 | 5 | 8 | 0.38 | 22 |
| ot.iec104-plain | 0 | 0 | 0 | - | 8 |
| ot.iec61850-mms-plain | 15 | 13 | 2 | 0.87 | 42 |
| ot.modbus-bind-all | 0 | 0 | 0 | - | 2 |
| ot.modbus-tcp-server | 3 | 2 | 1 | 0.67 | 23 |
| ot.modbus-write-unchecked | 3 | 3 | 0 | 1.00 | 8 |
| ot.ocpp-ws-plain | 0 | 0 | 0 | - | 12 |
| ot.opcua-security-none | 8 | 4 | 4 | 0.50 | 14 |
| secret.private-key | 0 | 0 | 0 | - | 2 |
| tls.verify-disabled | 0 | 0 | 0 | - | 6 |

## By repository

| Repository | Commit | Files | Live | Test context |
|---|---|---|---|---|
| ChristianTremblay/BAC0 | 60c55710f5 | 92 | 0 | 0 |
| EVerest/libocpp | 0a1880a0b1 | 626 | 0 | 9 |
| frangoteam/FUXA | af0ec56e8d | 629 | 2 | 1 |
| FreeOpcUa/opcua-asyncio | e506dc6bc6 | 240 | 7 | 3 |
| matth-x/MicroOcpp | ee1271b7e8 | 249 | 0 | 7 |
| mobilityhouse/ocpp | dad5896ac9 | 442 | 0 | 0 |
| mz-automation/lib60870 | 7a388e3e13 | 88 | 0 | 8 |
| mz-automation/libiec61850 | 6e265c54af | 724 | 15 | 42 |
| open62541/open62541 | 3596b6f7fd | 792 | 0 | 15 |
| pymodbus-dev/pymodbus | 7509a6b204 | 136 | 3 | 18 |
| SCADA-LTS/Scada-LTS | f1cf088585 | 3191 | 5 | 2 |
| stepfunc/dnp3 | 235533ae27 | 400 | 6 | 7 |
| stephane/libmodbus | a9b025d122 | 29 | 0 | 9 |
| steve-community/steve | 2e2e8ecdef | 477 | 0 | 3 |
| thiagoralves/OpenPLC_v3 | b5d41356da | 2118 | 9 | 21 |
