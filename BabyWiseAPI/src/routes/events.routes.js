import express from 'express';
import { getEventsByGroup, getCamerasByGroup, getEventsByCamera } from '../controllers/events.controller.js';

const router = express.Router();

// GET /api/events/group/:groupId - Obtener eventos de un grupo
router.get('/group/:groupId', getEventsByGroup);

// GET /api/events/group/:groupId/cameras - Obtener camaras del grupo (HARDCODED)
router.get('/group/:groupId/cameras', getCamerasByGroup);

// GET /api/events/camera/:cameraUid - Obtener eventos por camara (HARDCODED)
router.get('/camera/:cameraUid', getEventsByCamera);

export default router;
