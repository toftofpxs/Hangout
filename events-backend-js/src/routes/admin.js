import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";
import {
	listEventsSummary,
	listUsers,
	promoteUser,
	demoteUser,
	updateUser,
	deleteUser,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/events-summary", authenticateToken, requireRole('admin', 'super_user'), listEventsSummary);

// Users management
router.get('/users', authenticateToken, requireRole('admin', 'super_user'), listUsers);
router.post('/users/:id/promote', authenticateToken, requireRole('admin', 'super_user'), promoteUser);
router.post('/users/:id/demote', authenticateToken, requireRole('admin', 'super_user'), demoteUser);
router.put('/users/:id', authenticateToken, requireRole('admin', 'super_user'), updateUser);
router.delete('/users/:id', authenticateToken, requireRole('admin', 'super_user'), deleteUser);

export default router;
