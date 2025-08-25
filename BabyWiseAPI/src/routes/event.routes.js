import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { events } from '../controllers/event.controller.js';

const router = express.Router();
router.get('/events', events)

export {router}