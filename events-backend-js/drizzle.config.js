import dotenv from "dotenv";
dotenv.config();

/** @type { import("drizzle-kit").Config } */
export default {
  schema: "./src/db/schema.js",   // ton schéma Drizzle
  out: "./drizzle",               // dossier de migrations
  dialect: "mysql",               // <- ICI c'est le bon champ
  dbCredentials: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306
  }
};
