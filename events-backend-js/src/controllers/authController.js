import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import crypto from "crypto";
import { UserModel } from "../models/userModel.js";
import { pool } from "../db/index.js";
import { sendEmailVerificationEmail } from "../services/mailService.js";

dotenv.config();

const VERIFICATION_TOKEN_DURATION_MS = 24 * 60 * 60 * 1000;

const buildBackendBaseUrl = (req) => {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL.replace(/\/$/, "");
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  return `${protocol}://${req.get("host")}`;
};

const buildVerificationLink = (req, token) => {
  const baseUrl = buildBackendBaseUrl(req);
  return `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const normalizedName = typeof name === "string" ? name.trim() : name;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;
    const normalizedPassword = typeof password === "string" ? password.trim() : password;

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existing = await UserModel.findByEmail(normalizedEmail);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_DURATION_MS);

    if (existing) {
      if (Number(existing.email_verified) === 1) {
        return res.status(400).json({ message: "Email already used" });
      }

      const updatedPasswordHash = await bcrypt.hash(normalizedPassword, 10);
      await pool.query(
        `
          UPDATE users
          SET name = ?,
              password_hash = ?,
              email_verification_token = ?,
              email_verification_expires_at = ?
          WHERE id = ?
        `,
        [normalizedName, updatedPasswordHash, verificationToken, verificationExpiresAt, existing.id]
      );

      const verificationLink = buildVerificationLink(req, verificationToken);
      await sendEmailVerificationEmail({
        to: normalizedEmail,
        userName: normalizedName,
        verificationLink,
      });

      return res.status(201).json({
        message: "Compte en attente de verification. Consultez votre email pour activer votre compte.",
      });
    }

    const password_hash = await bcrypt.hash(normalizedPassword, 10);
    await pool.query(
      `
        INSERT INTO users (name, email, password_hash, role, email_verified, email_verification_token, email_verification_expires_at)
        VALUES (?, ?, ?, 'participant', 0, ?, ?)
      `,
      [normalizedName, normalizedEmail, password_hash, verificationToken, verificationExpiresAt]
    );

    const verificationLink = buildVerificationLink(req, verificationToken);
    await sendEmailVerificationEmail({
      to: normalizedEmail,
      userName: normalizedName,
      verificationLink,
    });

    res.status(201).json({
      message: "Compte cree. Verifiez votre email pour activer votre compte avant de vous connecter.",
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;
    const normalizedPassword = typeof password === "string" ? password.trim() : password;

    if (!normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await UserModel.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (Number(user.email_verified) !== 1) {
      return res.status(403).json({
        message: "Email non verifie. Veuillez valider votre compte via le lien recu par email.",
      });
    }

    const match = await bcrypt.compare(normalizedPassword, user.password_hash);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
    if (!token) {
      return res.status(400).json({ message: "Token manquant" });
    }

    const [rows] = await pool.query(
      `
        SELECT id, email_verification_expires_at
        FROM users
        WHERE email_verification_token = ?
        LIMIT 1
      `,
      [token]
    );

    const user = rows?.[0];
    if (!user) {
      return res.status(400).json({ message: "Lien de verification invalide" });
    }

    if (!user.email_verification_expires_at || new Date(user.email_verification_expires_at) < new Date()) {
      return res.status(400).json({ message: "Lien de verification expire" });
    }

    await pool.query(
      `
        UPDATE users
        SET email_verified = 1,
            email_verification_token = NULL,
            email_verification_expires_at = NULL
        WHERE id = ?
      `,
      [user.id]
    );

    if (process.env.FRONTEND_URL) {
      const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, "");
      return res.redirect(`${frontendUrl}/login?verified=1`);
    }

    return res.json({ message: "Email verifie avec succes. Vous pouvez maintenant vous connecter." });
  } catch (err) {
    next(err);
  }
};

export const resendVerificationEmail = async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!email) {
      return res.status(400).json({ message: "Email manquant" });
    }

    const user = await UserModel.findByEmail(email);

    if (!user || Number(user.email_verified) === 1) {
      return res.json({ message: "Si le compte existe, un email de verification a ete envoye." });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TOKEN_DURATION_MS);

    await pool.query(
      `
        UPDATE users
        SET email_verification_token = ?,
            email_verification_expires_at = ?
        WHERE id = ?
      `,
      [verificationToken, verificationExpiresAt, user.id]
    );

    const verificationLink = buildVerificationLink(req, verificationToken);
    await sendEmailVerificationEmail({
      to: user.email,
      userName: user.name,
      verificationLink,
    });

    return res.json({ message: "Si le compte existe, un email de verification a ete envoye." });
  } catch (err) {
    next(err);
  }
};
