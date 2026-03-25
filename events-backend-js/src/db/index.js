import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
};

const buildSslConfig = () => {
  const explicitSsl = parseBoolean(process.env.DB_SSL, false);
  const inferredTidb = String(process.env.DB_HOST || "").includes("tidbcloud.com");
  const enabled = explicitSsl || inferredTidb;

  if (!enabled) return undefined;

  const rejectUnauthorized = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true);
  const sslConfig = {
    rejectUnauthorized,
    minVersion: "TLSv1.2",
  };

  const caInline = process.env.DB_SSL_CA;
  const caPath = process.env.DB_SSL_CA_PATH;

  if (caInline) {
    sslConfig.ca = caInline.replace(/\\n/g, "\n");
  } else if (caPath && fs.existsSync(caPath)) {
    sslConfig.ca = fs.readFileSync(caPath, "utf8");
  }

  return sslConfig;
};

const ssl = buildSslConfig();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  connectionLimit: 10,
  ssl,
});


export const db = drizzle(pool, { schema, mode: "default" });
export { pool };
