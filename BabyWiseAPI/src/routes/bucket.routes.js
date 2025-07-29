import express from 'express';
import { upload } from '../controllers/bucket.controller.js'
import multer from 'multer'
const filesUploaded = multer({ dest: 'uploads/' }) // Lugar donde se guardan los archivos subidos


export const router = express.Router();

router.post('/upload',filesUploaded.single('file'), upload)