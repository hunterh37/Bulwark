// Intentionally vulnerable fixture for Bulwark tests. Do not deploy.
const csms = new WebSocket("ws://csms.example.local/ocpp/CP001");
const agent = new https.Agent({ rejectUnauthorized: false });
const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
