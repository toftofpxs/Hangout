import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { specs } from './swagger.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import eventRoutes from './routes/events.js';
import inscriptionRoutes from './routes/inscriptions.js';
import paymentRoutes from './routes/payments.js';
import { EventModel } from './models/eventModel.js';
import { pool } from './db/index.js';
import cron from 'node-cron';
import adminRoutes from "./routes/admin.js";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from "fs";



// Chaque jour à 3h du matin
cron.schedule('0 3 * * *', async () => {
  console.log("🧹 Nettoyage des anciens événements...");
  await EventModel.deleteExpiredEvents();
});


dotenv.config();
const app = express();

const ensureEventEndDateColumn = async () => {
  const [rows] = await pool.query(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'events'
        AND COLUMN_NAME = 'end_date'
      LIMIT 1
    `
  );

  if (!rows.length) {
    await pool.query('ALTER TABLE events ADD COLUMN end_date DATETIME NULL AFTER date');
    console.log('✅ Colonne end_date ajoutée sur events');
  }
};

const ensureUsersRoleEnum = async () => {
  await pool.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('super_user','admin','organisateur','participant') DEFAULT 'participant'"
  );
};

const ensureEmailVerificationColumns = async () => {
  const [rows] = await pool.query(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME IN ('email_verified', 'email_verification_token', 'email_verification_expires_at')
    `
  );

  const existing = new Set(rows.map((row) => row.COLUMN_NAME));
  let addedEmailVerified = false;

  if (!existing.has('email_verified')) {
    await pool.query('ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER password_hash');
    addedEmailVerified = true;
    console.log('✅ Colonne email_verified ajoutee sur users');
  }

  if (!existing.has('email_verification_token')) {
    await pool.query('ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255) NULL AFTER email_verified');
    console.log('✅ Colonne email_verification_token ajoutee sur users');
  }

  if (!existing.has('email_verification_expires_at')) {
    await pool.query('ALTER TABLE users ADD COLUMN email_verification_expires_at DATETIME NULL AFTER email_verification_token');
    console.log('✅ Colonne email_verification_expires_at ajoutee sur users');
  }

  if (addedEmailVerified) {
    await pool.query('UPDATE users SET email_verified = 1');
    console.log('✅ Comptes existants marques verifies');
  }
};

const ensureConfiguredSuperUser = async () => {
  const configuredEmail = process.env.SUPER_USER_EMAIL;
  if (!configuredEmail) return;

  await pool.query(
    'UPDATE users SET role = ? WHERE email = ?',
    ['super_user', configuredEmail]
  );
};


const uploadsDir = path.resolve(process.cwd(), "uploads");

console.log("📁 uploadsDir =", uploadsDir);
console.log("📁 uploads exists?", fs.existsSync(uploadsDir));
if (fs.existsSync(uploadsDir)) {
  console.log("📄 uploads files:", fs.readdirSync(uploadsDir).slice(0, 20));
}

app.use("/uploads", express.static(uploadsDir));
app.get("/health", (req, res) => res.json({ ok: true, uploadsDir }));



// ✅ route test (pour vérifier que le serveur répond)
app.get('/health', (req, res) => res.json({ ok: true }));



// CORS: accepte les origines de dev web + Expo web (exp.direct).
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true; // requetes serveur-a-serveur / curl

  if (allowedOrigins.includes(origin)) return true;

  return (
    /^https?:\/\/[a-z0-9-]+-anonymous-\d+\.exp\.direct$/i.test(origin) ||
    /^https?:\/\/[a-z0-9-]+\.loca\.lt$/i.test(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(origin) ||
    /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i.test(origin)
  );
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());

// 📚 Documentation Swagger
app.use('/api-docs', swaggerUi.serve)
app.get('/api-docs', swaggerUi.setup(specs))

app.use("/api/admin", adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/inscriptions', inscriptionRoutes);
app.use('/api/payments', paymentRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// 📤 Exporter l'app pour les tests
export default app;

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    await ensureUsersRoleEnum();
    await ensureEmailVerificationColumns();
    await ensureEventEndDateColumn();
    await ensureConfiguredSuperUser();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Impossible de démarrer le serveur:', err);
    process.exit(1);
  }
};

startServer();

