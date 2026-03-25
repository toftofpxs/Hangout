import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { UserModel } from "../models/userModel.js";

dotenv.config();

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const normalizedPassword = typeof password === "string" ? password.trim() : password;

    if (!name || !email || !normalizedPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(400).json({ message: "Email already used" });
    }

    const password_hash = await bcrypt.hash(normalizedPassword, 10);
    const user = await UserModel.create({ name, email, password_hash, role: "participant" });

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

export const login = async (req, res, next) => {
  try {
    console.log('[LOGIN] headers content-type:', req.headers['content-type']);
    console.log('[LOGIN] body:', req.body);

    const { email, password } = req.body;
    const normalizedPassword = typeof password === "string" ? password.trim() : password;

    if (!email || !normalizedPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
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
