import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { events, newEvent } from '../controllers/event.controller.js';

const router = express.Router();
router.get('/events', events)
router.post('/new-event',newEvent)

export {router}