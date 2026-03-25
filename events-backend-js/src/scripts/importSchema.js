import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const schemaPath = path.resolve(projectRoot, 'create_tables.sql');
const dbHost = process.env.DB_HOST;
const dbPort = Number(process.env.DB_PORT || 3306);
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const sslEnabled = String(process.env.DB_SSL || '').toLowerCase() === 'true';
const sslCaPath = process.env.DB_SSL_CA_PATH;

if (!dbHost || !dbUser || !dbName) {
  console.error('Variables requises manquantes: DB_HOST, DB_USER, DB_NAME');
  process.exit(1);
}

if (!fs.existsSync(schemaPath)) {
  console.error(`Fichier SQL introuvable: ${schemaPath}`);
  process.exit(1);
}

const sslConfig = (() => {
  if (!sslEnabled) return undefined;

  if (sslCaPath) {
    if (!fs.existsSync(sslCaPath)) {
      console.error(`Certificat CA introuvable: ${sslCaPath}`);
      process.exit(1);
    }
    return {
      ca: fs.readFileSync(sslCaPath, 'utf8'),
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    };
  }

  // Si DB_SSL=true sans CA, on active TLS sans validation stricte.
  return {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  };
})();

const main = async () => {
  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    ssl: sslConfig,
    multipleStatements: true,
  });

  try {
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);
    await connection.query(sql);

    console.log(`Schema importe avec succes dans la base ${dbName}.`);
  } finally {
    await connection.end();
  }
};

main().catch((err) => {
  console.error('Echec import schema:', err.message);
  process.exit(1);
});
