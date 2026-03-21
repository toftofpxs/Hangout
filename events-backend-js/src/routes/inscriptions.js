import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createBulkInscriptions,
  createInscription,
  getUserInscriptions,
  cancelInscription,
  cancelByEvent,        // ✅ on ajoute l’import de la nouvelle fonction
} from '../controllers/inscriptionsController.js';


const router = express.Router();

// 🔹 Créer une inscription
router.post('/', authenticateToken, createInscription);

// 🔹 Créer plusieurs inscriptions en une seule fois
router.post('/bulk', authenticateToken, createBulkInscriptions);

// 🔹 Récupérer les inscriptions du user
router.get('/me', authenticateToken, getUserInscriptions);

// 🔹 Supprimer une inscription par son ID (ancienne méthode)
router.delete('/:id', authenticateToken, cancelInscription);

// 🔹 ➕ Nouvelle route : se désinscrire via l’ID de l’événement (plus simple côté front)
router.delete('/by-event/:eventId', authenticateToken, cancelByEvent);

export default router;
