// Labeled eval corpus. Each case: file path, one line of code, the rule expected to fire (or null for a clean line).
// Positives come from patterns seen in public SCADA, OCPP and BMS code; negatives are the safe forms of the same calls.
export const CASES = [
  // ot.modbus-tcp-server
  ["srv.py", "StartTcpServer(context, address=(\"10.20.0.5\", 502))", "ot.modbus-tcp-server"],
  ["srv.js", "const server = new ModbusTCPServer(vector, { host: '10.1.1.2' }); ModbusTcpServer", "ot.modbus-tcp-server"],
  ["srv.go", "s := modbus.NewServer(); s.listen(\"tcp://10.0.0.2:502\")", "ot.modbus-tcp-server"],
  ["client.py", "client = ModbusTcpClient(\"10.20.0.5\", port=502)", null],
  // ot.modbus-bind-all
  ["srv.py", "StartTcpServer(context, address=(\"0.0.0.0\", 502))", ["ot.modbus-bind-all", "ot.modbus-tcp-server"]],
  ["cfg.yaml", "modbus_bind: 0.0.0.0", "ot.modbus-bind-all"],
  ["web.py", "app.run(host=\"0.0.0.0\", port=8080)", null],
  // ot.modbus-write-unchecked
  ["plc.py", "client.write_register(40001, value)", "ot.modbus-write-unchecked"],
  ["plc.js", "await client.writeSingleRegister(10, setpoint)", "ot.modbus-write-unchecked"],
  ["plc.py", "rr = client.read_holding_registers(40001, 4)", null],
  // ot.dnp3-no-sa
  ["dnp.py", "outstation = dnp3.Outstation(config)", "ot.dnp3-no-sa"],
  ["dnp.cs", "var master = manager.AddMasterStack(\"master\", ...)", "ot.dnp3-no-sa"],
  ["readme.md", "DNP3 is a protocol", null],
  // ot.iec104-plain
  ["rtu.c", "CS104_Connection con = CS104_Connection_create(host, port); // cs104", "ot.iec104-plain"],
  ["rtu.py", "import c104  # iec60870 client", "ot.iec104-plain"],
  // ot.iec61850-mms-plain
  ["ied.c", "IedConnection con = IedConnection_create();", "ot.iec61850-mms-plain"],
  ["ied.c", "MmsValue* v = MmsValue_newIntegerFromInt32(1);", null],
  // ot.ocpp-ws-plain
  ["cp.js", "const ws = new WebSocket('ws://csms.local/ocpp/CP1');", "ot.ocpp-ws-plain"],
  ["cfg.json", "{\"csmsUrl\": \"ws://10.0.0.9:9000/ocpp\"}", "ot.ocpp-ws-plain"],
  ["cp.js", "const ws = new WebSocket('wss://csms.local/ocpp/CP1');", null],
  ["notes.md", "connect to ws://localhost", null],
  // ot.opcua-security-none
  ["opc.py", "server.set_security_policy([ua.SecurityPolicyType.NoSecurity]); security_policy = None", "ot.opcua-security-none"],
  ["opc.cs", "config.SecurityMode = MessageSecurityMode.None;", "ot.opcua-security-none"],
  ["opc.cs", "config.SecurityMode = MessageSecurityMode.SignAndEncrypt;", null],
  // ot.bacnet-bind-all
  ["bms.py", "bacnet = BAC0.lite()", "ot.bacnet-bind-all"],
  ["bms.py", "bacnet = BAC0.lite(ip=\"10.5.0.4/24\")", null],
  // ot.default-credentials
  ["hmi.py", "PASSWORD = \"admin\"; password = \"admin\"", "ot.default-credentials"],
  ["hmi.js", "const cfg = { user: 'op', password: 'scada' };", "ot.default-credentials"],
  ["hmi.json", "{\"password\": \"1234\"}", "ot.default-credentials"],
  ["hmi.py", "password = os.environ[\"HMI_PASSWORD\"]", null],
  ["login.js", "if (!password) throw new Error('password required');", null],
  // ot.setpoint-no-limit
  ["dose.py", "chlorine_dose = request.json[\"dose\"]", "ot.setpoint-no-limit"],
  ["pump.js", "const pump_speed = req.body.speed;", "ot.setpoint-no-limit"],
  ["dose.py", "chlorine_dose = clamp(request.json[\"dose\"], 0, MAX_DOSE)", null],
  ["dose.py", "chlorine_dose = DEFAULT_DOSE", null],
  // secrets
  ["aws.js", "const key = 'AKIAIOSFODNN7EXAMPLE';", "secret.aws-key"],
  ["aws.py", "KEY = \"AKIAIOSFODNN7EXAMPLE\"", "secret.aws-key"],
  ["aws.js", "const key = process.env.AWS_ACCESS_KEY_ID;", null],
  ["k.pem", "-----BEGIN RSA PRIVATE KEY-----", "secret.private-key"],
  ["k.py", "KEY = '''-----BEGIN OPENSSH PRIVATE KEY-----", "secret.private-key"],
  ["gh.sh", "export GH=ghp_0123456789abcdefghijABCDEFGHIJ012345", "secret.github-token"],
  ["s.js", "const t = 'xoxb-1234567890-abcdefghij';", "secret.slack-token"],
  ["tls.js", "new https.Agent({ rejectUnauthorized: false })", "tls.verify-disabled"],
  ["tls.py", "requests.get(url, verify=False)", "tls.verify-disabled"],
  ["tls.go", "tls.Config{InsecureSkipVerify: true}", "tls.verify-disabled"],
  ["tls.py", "requests.get(url, verify=True)", null],
];

// Multi-line files for autofix evaluation: rule to fix and the file.
export const FIX_CASES = [
  ["secret.aws-key", "aws.py", "import boto3\nKEY = \"AKIAIOSFODNN7EXAMPLE\"\ns3 = boto3.client('s3', aws_access_key_id=KEY)\n"],
  ["secret.aws-key", "aws.js", "const key = 'AKIAIOSFODNN7EXAMPLE';\nmodule.exports = key;\n"],
  ["ot.default-credentials", "hmi.py", "#!/usr/bin/env python3\nCREDS = {\"user\": \"op\", \"password\": \"scada\"}\n"],
  ["ot.default-credentials", "hmi.go", "package main\nimport \"os\"\npassword := \"admin\"\n"],
  ["ot.ocpp-ws-plain", "cp.js", "const ws = new WebSocket('ws://csms.local/ocpp/CP1');\n"],
  ["ot.modbus-bind-all", "srv.py", "StartTcpServer(context, address=(\"0.0.0.0\", 502))\n"],
  ["tls.verify-disabled", "tls.js", "const a = new https.Agent({ rejectUnauthorized: false });\n"],
  ["tls.verify-disabled", "tls.py", "r = requests.get(url, verify=False)\n"],
  ["tls.verify-disabled", "tls.go", "cfg := &tls.Config{InsecureSkipVerify: true}\n"],
  ["ot.opcua-security-none", "opc.cs", "config.SecurityMode = MessageSecurityMode.None;\n"],
  ["ot.modbus-tcp-server", "srv.py", "StartTcpServer(context, address=(\"10.0.0.5\", 502))\n"], // no autofix expected
];

// Dependency module: lockfiles with versions that have published advisories.
export const DEP_CASES = [
  ["package-lock.json", JSON.stringify({ lockfileVersion: 3, packages: { "": {}, "node_modules/lodash": { version: "4.17.15" }, "node_modules/minimist": { version: "1.2.0" } } }, null, 2), ["lodash", "minimist"]],
  ["requirements.txt", "pymodbus==2.5.0\nrequests==2.19.0\nflask==2.3.3\n", ["requests"]],
  ["go.mod", "module x\nrequire (\n\tgolang.org/x/net v0.7.0\n)\n", ["golang.org/x/net"]],
  ["package-lock.json", JSON.stringify({ lockfileVersion: 3, packages: { "": {}, "node_modules/ms": { version: "2.1.3" } } }), []],
];
