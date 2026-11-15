// Labeled eval corpus. Each case: file path, one line of code, the rule expected to fire (or null for a clean line).
// Positives are insecure calls and settings; negatives are the safe forms plus the false positives found when the
// 1.0.0 rules ran on public OT repositories (imports, declarations, comments, translation catalogs). See eval/FIELD.md.
export const CASES = [
  // ot.modbus-tcp-server
  ["srv.py", "StartTcpServer(context, address=(\"10.20.0.5\", 502))", "ot.modbus-tcp-server"],
  ["srv.js", "const server = new ModbusRTU.ServerTCP(vector, { host: '10.1.1.2', port: 502 });", "ot.modbus-tcp-server"],
  ["srv.py", "from pymodbus.server import ModbusTcpServer", null],
  ["srv.py", "class PlantServer(ModbusTcpServer):", null],
  ["srv.py", "# StartTcpServer(context) starts the listener", null],
  ["srv.go", "s := modbus.NewServer(); s.listen(\"tcp://10.0.0.2:502\")", "ot.modbus-tcp-server"],
  ["client.py", "client = ModbusTcpClient(\"10.20.0.5\", port=502)", null],
  // ot.modbus-bind-all
  ["srv.py", "StartTcpServer(context, address=(\"0.0.0.0\", 502))", ["ot.modbus-bind-all", "ot.modbus-tcp-server"]],
  ["cfg.yaml", "modbus_bind: 0.0.0.0", "ot.modbus-bind-all"],
  ["srv.c", "ctx = modbus_new_tcp(\"0.0.0.0\", 502);", "ot.modbus-bind-all"],
  ["srv.py", "server = ModbusTcpServer(context, address=(\"\", 5020))", ["ot.modbus-bind-all", "ot.modbus-tcp-server"]],
  ["web.py", "app.run(host=\"0.0.0.0\", port=8080)", null],
  // ot.modbus-write-unchecked
  ["plc.py", "client.write_register(40001, value)", "ot.modbus-write-unchecked"],
  ["plc.js", "await client.writeSingleRegister(10, setpoint)", "ot.modbus-write-unchecked"],
  ["plc.py", "rr = client.read_holding_registers(40001, 4)", null],
  ["plc.py", "def write_register(self, address, value):", null],
  ["pdu.py", "class WriteMultipleRegistersRequest(ModbusPDU):", null],
  // ot.modbus-write-from-input
  ["api.py", "client.write_register(40001, request.json[\"speed\"])", ["ot.modbus-write-from-input", "ot.modbus-write-unchecked"]],
  ["api.js", "await client.writeSingleRegister(10, req.body.setpoint);", ["ot.modbus-write-from-input", "ot.modbus-write-unchecked"]],
  // ot.dnp3-no-sa
  ["dnp.py", "outstation = dnp3.Outstation(config)", "ot.dnp3-no-sa"],
  ["dnp.cpp", "auto channel = manager.AddTCPClient(\"dnp3-client\", levels, retry, {IPEndpoint(\"10.0.0.5\", 20000)}, \"0.0.0.0\", listener);", "ot.dnp3-no-sa"],
  ["dnp.rs", "let mut channel = spawn_master_tcp_client(LinkErrorMode::Close, config, endpoints, strategy, listener); // dnp3", "ot.dnp3-no-sa"],
  ["dnp.cpp", "auto channel = manager.AddTLSClient(\"dnp3-client\", levels, retry, endpoints, \"0.0.0.0\", tlsConfig, listener, ec);", null],
  ["dnp.h", "#include <opendnp3/master/IMasterApplication.h>", null],
  ["dnp.cpp", "std::shared_ptr<IChannel> DNP3Manager::AddTCPClient(const std::string& id, // dnp3", null],
  ["readme.md", "DNP3 is a protocol", null],
  // ot.iec104-plain
  ["rtu.c", "CS104_Connection con = CS104_Connection_create(host, port); // cs104", "ot.iec104-plain"],
  ["rtu.py", "server = c104.Server(ip=\"10.2.0.4\", port=2404)", "ot.iec104-plain"],
  ["rtu.py", "import c104  # iec60870 client", null],
  ["rtu.c", "CS104_Connection con = CS104_Connection_createSecure(host, port, tlsConfig);", null],
  ["cs104_slave.h", "#define CONFIG_CS104_MESSAGE_QUEUE_SIZE 100", null],
  // ot.iec61850-mms-plain
  ["ied.c", "IedConnection con = IedConnection_create();", "ot.iec61850-mms-plain"],
  ["ied.c", "MmsValue* v = MmsValue_newIntegerFromInt32(1);", null],
  ["ied.c", "IedConnection con = IedConnection_createWithTlsSupport(tlsConfig);", null],
  ["ied.c", "IedConnection_close(con);", null],
  ["ied.h", " * \\param self the IedConnection instance", null],
  // ot.ocpp-ws-plain
  ["cp.js", "const ws = new WebSocket('ws://csms.local/ocpp/CP1');", "ot.ocpp-ws-plain"],
  ["cfg.json", "{\"csmsUrl\": \"ws://10.0.0.9:9000/ocpp\"}", "ot.ocpp-ws-plain"],
  ["cp.js", "const ws = new WebSocket('wss://csms.local/ocpp/CP1');", null],
  ["notes.md", "connect to ws://localhost", null],
  ["cp.py", "    \"ws://localhost:9000/CP_1\", subprotocols=[\"ocpp1.6\"]", null],
  ["cp.js", "// connects to ws://csms.local/ocpp/CP1 in the lab", null],
  // ot.opcua-security-none
  ["opc.py", "server.set_security_policy([ua.SecurityPolicyType.NoSecurity])", "ot.opcua-security-none"],
  ["opc.ts", "const client = OPCUAClient.create({ securityMode: MessageSecurityMode.None, securityPolicy: SecurityPolicy.None });", "ot.opcua-security-none"],
  ["opc.c", "cc->securityPolicyUri = UA_String_fromChars(\"http://opcfoundation.org/UA/SecurityPolicy#None\");", "ot.opcua-security-none"],
  ["opc.py", "if token_mode == ua.MessageSecurityMode.None_:", null],
  ["opc.py", "security_policy = None", null],
  ["opc.c", "/* SecurityPolicy None has no signature algorithm */", null],
  ["opc.cs", "config.SecurityMode = MessageSecurityMode.None;", "ot.opcua-security-none"],
  ["opc.cs", "config.SecurityMode = MessageSecurityMode.SignAndEncrypt;", null],
  // ot.bacnet-bind-all
  ["bms.js", "const client = new bacnet({ interface: '0.0.0.0', port: 47808 });", "ot.bacnet-bind-all"],
  ["bms.py", "bacnet = BAC0.lite()", null],
  ["bms.py", "bacnet = BAC0.lite(ip=\"10.5.0.4/24\")", null],
  // ot.default-credentials
  ["hmi.py", "PASSWORD = \"admin\"; password = \"admin\"", "ot.default-credentials"],
  ["hmi.js", "const cfg = { user: 'op', password: 'scada' };", "ot.default-credentials"],
  ["hmi.json", "{\"password\": \"1234\"}", "ot.default-credentials"],
  ["hmi.py", "password = os.environ[\"HMI_PASSWORD\"]", null],
  ["login.js", "if (!password) throw new Error('password required');", null],
  ["context.xml", "    username=\"root\" password=\"root\"", "ot.default-credentials"],
  ["i18n/en.json", "  \"general.password\": \"Password\",", null],
  ["en.json", "  \"loginPage.password\":\"Password\",", null],
  ["UserDAO.java", "private final static String COLUMN_NAME_PASSWORD = \"password\";", null],
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
  ["ot.opcua-security-none", "opc.py", "server.set_security_policy([ua.SecurityPolicyType.NoSecurity])\n"],
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
