import express from 'express';
import { register, login, refreshSession, logout, logoutAll, listSessions, revokeSession } from '../controllers/authController.js';
import { validatePasswordMiddleware } from '../middleware/passwordValidator.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Créer un nouveau compte
 *     description: Enregistre un nouvel utilisateur avec validation du mot de passe
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePassword123!"
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: "SecurePassword123!"
 *             required:
 *               - name
 *               - email
 *               - password
 *               - confirmPassword
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 userId:
 *                   type: integer
 *       400:
 *         description: Données invalides ou mot de passe faible
 *       422:
 *         description: Erreur de validation
 */
router.post('/register', authRateLimit, validatePasswordMiddleware, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Se connecter
 *     description: Authentifie un utilisateur et retourne un JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "SecurePassword123!"
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 userId:
 *                   type: integer
 *                 message:
 *                   type: string
 *       401:
 *         description: Email ou mot de passe incorrect
 *       400:
 *         description: Données manquantes
 */
router.post('/login', authRateLimit, login);
router.post('/signin', authRateLimit, login);
router.post('/refresh', authRateLimit, refreshSession);
router.post('/logout', authenticateToken, logout);
router.post('/logout-all', authenticateToken, logoutAll);
router.get('/sessions', authenticateToken, listSessions);
router.delete('/sessions/:id', authenticateToken, revokeSession);

export default router;
