import express from 'express';
import { getEventsByGroup } from '../controllers/events.controller.js';

const router = express.Router();

// GET /api/events/group/:groupId - Obtener eventos de un grupo
router.get('/group/:groupId', getEventsByGroup);

export default router;
