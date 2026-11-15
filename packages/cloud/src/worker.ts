import { pool } from "./db.js";
import { workLoop } from "./jobs.js";

let stopping = false;
process.on("SIGTERM", () => { stopping = true; });
await workLoop(() => stopping);
await pool.end();
