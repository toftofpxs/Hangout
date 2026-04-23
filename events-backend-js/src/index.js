import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
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
import { apiRateLimit } from './middleware/rateLimit.js';
import { requestContext } from './middleware/requestContext.js';

dotenv.config();


// Chaque jour à 3h du matin
cron.schedule('0 3 * * *', async () => {
  await EventModel.deleteExpiredEvents();
});


const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const isProduction = process.env.NODE_ENV === 'production';

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
  }
};

const ensureUsersRoleEnum = async () => {
  await pool.query(
    "ALTER TABLE users MODIFY COLUMN role ENUM('super_user','admin','organisateur','participant') DEFAULT 'participant'"
  );
};

const ensureUserTokenVersionColumn = async () => {
  const [rows] = await pool.query(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'token_version'
      LIMIT 1
    `
  );

  if (!rows.length) {
    await pool.query('ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0 AFTER role');
  }
};

const ensureAuthSecurityTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id VARCHAR(36) PRIMARY KEY,
      session_family VARCHAR(36) NOT NULL,
      user_id INT NOT NULL,
      refresh_token_hash VARCHAR(128) NOT NULL,
      user_agent VARCHAR(255) NULL,
      ip_address VARCHAR(64) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME NULL,
      revoke_reason VARCHAR(120) NULL,
      CONSTRAINT auth_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY auth_sessions_refresh_hash_unique (refresh_token_hash),
      KEY auth_sessions_user_idx (user_id),
      KEY auth_sessions_family_idx (session_family)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      actor_user_id INT NULL,
      actor_role VARCHAR(32) NULL,
      action VARCHAR(120) NOT NULL,
      target_type VARCHAR(80) NULL,
      target_id VARCHAR(120) NULL,
      result ENUM('success','failure','denied') NOT NULL DEFAULT 'success',
      ip_address VARCHAR(64) NULL,
      user_agent VARCHAR(255) NULL,
      request_id VARCHAR(64) NULL,
      metadata_json TEXT NULL,
      occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT audit_logs_actor_fk FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
      KEY audit_logs_actor_idx (actor_user_id),
      KEY audit_logs_action_idx (action),
      KEY audit_logs_occurred_idx (occurred_at)
    )
  `);
};

const ensureConfiguredSuperUser = async () => {
  const configuredEmail = process.env.SUPER_USER_EMAIL;
  if (!configuredEmail) return;

  await pool.query(
    'UPDATE users SET role = ? WHERE email = ?',
    ['super_user', configuredEmail]
  );
};


const uploadsDir = path.join(projectRoot, "uploads");
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));



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
app.use(requestContext);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use('/uploads', express.static(uploadsDir, {
  fallthrough: false,
  index: false,
  maxAge: isProduction ? '1d' : 0,
}));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', apiRateLimit);

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
  const statusCode = Number(err.status || err.statusCode || 500)

  if (!isProduction) {
    console.error(err)
  } else if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err.message)
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({ error: 'Invalid file upload.' })
  }

  const isSafeClientError = statusCode >= 400 && statusCode < 500
  const message = isSafeClientError ? (err.message || 'Request error') : 'Server error'
  res.status(statusCode).json({ error: message })
});

// 📤 Exporter l'app pour les tests
export default app;

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required')
    }

    await ensureUsersRoleEnum();
    await ensureUserTokenVersionColumn();
    await ensureEventEndDateColumn();
    await ensureAuthSecurityTables();
    await ensureConfiguredSuperUser();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Impossible de démarrer le serveur:', err);
    process.exit(1);
  }
};

startServer();

