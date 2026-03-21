// src/routes/event.js
import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  listMyEvents
} from '../controllers/eventsController.js'

import { upload } from '../middleware/upload.js'

const router = express.Router()

/**
 * @swagger
 * /api/events:
 *   get:
 *     tags:
 *       - Events
 *     summary: Récupérer la liste de tous les événements
 *     description: Obtient une liste de tous les événements disponibles (public)
 *     responses:
 *       200:
 *         description: Liste des événements récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       500:
 *         description: Erreur serveur
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Public
router.get('/', listEvents)

/**
 * @swagger
 * /api/events/mine:
 *   get:
 *     tags:
 *       - Events
 *     summary: Récupérer mes événements
 *     description: Récupère tous les événements créés par l'utilisateur authentifié
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Événements de l'utilisateur récupérés
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 *       401:
 *         description: Non authentifié
 *       500:
 *         description: Erreur serveur
 */
// ✅ Spécifique avant paramétré
router.get('/mine', authenticateToken, listMyEvents)

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     tags:
 *       - Events
 *     summary: Récupérer un événement par ID
 *     description: Obtient les détails d'un événement spécifique
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de l'événement
 *     responses:
 *       200:
 *         description: Événement récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Événement non trouvé
 *       500:
 *         description: Erreur serveur
 */
// Paramétré ensuite
router.get('/:id', getEvent)

/**
 * @swagger
 * /api/events:
 *   post:
 *     tags:
 *       - Events
 *     summary: Créer un nouvel événement
 *     description: Crée un nouvel événement avec photos (authentification requise)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Conférence Tech 2026"
 *               description:
 *                 type: string
 *                 example: "Une conférence sur les dernières technologies"
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-03-15T10:00:00Z"
 *               location:
 *                 type: string
 *                 example: "Paris, France"
 *               capacity:
 *                 type: integer
 *                 example: 100
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *             required:
 *               - title
 *               - description
 *               - date
 *               - location
 *               - capacity
 *     responses:
 *       201:
 *         description: Événement créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Non authentifié
 *       422:
 *         description: Erreur de validation
 */
// Création / édition / suppression (auth + upload)
router.post(
  '/',
  authenticateToken,
  upload.array('photos', 5),
  createEvent
)

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     tags:
 *       - Events
 *     summary: Modifier un événement
 *     description: Met à jour un événement existant (authentification requise)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de l'événement
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Événement mis à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Événement non trouvé
 */
router.put(
  '/:id',
  authenticateToken,
  upload.array('photos', 5),
  updateEvent
)

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     tags:
 *       - Events
 *     summary: Supprimer un événement
 *     description: Supprime un événement existant (authentification requise)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de l'événement
 *     responses:
 *       200:
 *         description: Événement supprimé avec succès
 *       204:
 *         description: Événement supprimé (pas de contenu)
 *       401:
 *         description: Non authentifié
 *       403:
 *         description: Accès refusé
 *       404:
 *         description: Événement non trouvé
 */
router.delete('/:id', authenticateToken, deleteEvent)

export default router
