import express from 'express';
import { upload, uploadAudio, listAudios, deleteAudio } from '../controllers/bucket.controller.js'
import multer from 'multer'
const filesUploaded = multer({ dest: 'uploads/' }) // Lugar donde se guardan los archivos subidos


export const router = express.Router();

router.post('/upload', filesUploaded.single('file'), upload)

// Endpoint para subir audios personalizados
router.post('/audios/upload', filesUploaded.single('file'), uploadAudio)

// Endpoint para listar audios personalizados por room
router.get('/audios', listAudios)

// Endpoint para eliminar audios personalizados
router.post('/audios/delete', deleteAudio)