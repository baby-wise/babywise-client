import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { groups, newGroup, addMember, removeMember, isAdmin, addAdmin, getGroupsForUser } from '../controllers/group.controller.js'
const router = express.Router();

router.get('/groups', groups)
router.post('/secure/new-group',newGroup) //Agregarle el athentication
router.post('/secure/add-member',addMember)
router.post('/secure/remove-member',removeMember)

export {router}