# Bulwark Cloud

Server cloud layer, hosted on Render.

| Process | Entry | Render service |
|---|---|---|
| API (portal, runner, GitHub webhooks) | src/server.ts | bulwark-cloud-api (web) |
| Job worker (scan, fix) | src/worker.ts | bulwark-cloud-worker (worker) |
| Migrations | src/migrate.ts | preDeployCommand on the API |
| Detection models | src/detect/model.ts calls MODEL_URL | bulwark-models (private service, later) |

Detectors implement `Detector` in src/detect/types.ts. Rule detector ships now
(secrets, TLS, Modbus, DNP3, OCPP). Model detector activates when MODEL_URL is set.

Queue is a Postgres table claimed with `FOR UPDATE SKIP LOCKED`, so the same code runs
on Render, in a customer's cloud, or air-gapped with only Postgres.

Env: DATABASE_URL, PORTAL_KEY, GITHUB_WEBHOOK_SECRET, WEB_ORIGIN, MODEL_URL (optional).
