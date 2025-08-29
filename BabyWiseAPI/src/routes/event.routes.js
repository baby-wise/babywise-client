import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { events, newEvent, getEventsByGroup } from '../controllers/event.controller.js';

const router = express.Router();
router.get('/events', events)
router.post('/secure/new-event',authenticateToken,newEvent)
router.get('/secure/events/group/:groupId', authenticateToken, getEventsByGroup);

export {router}