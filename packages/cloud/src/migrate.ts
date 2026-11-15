import { readFile } from "node:fs/promises";
import { pool } from "./db.js";

export async function migrate() {
  const sql = await readFile(new URL("../src/schema.sql", import.meta.url), "utf8");
  await pool.query("create extension if not exists pgcrypto");
  await pool.query(sql);
}

if (process.argv[1]?.endsWith("migrate.js")) {
  await migrate();
  await pool.end();
  console.log("migrated");
}
