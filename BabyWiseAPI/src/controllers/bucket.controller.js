import b2 from '../index.js'
import fs from 'fs'

const upload = async (req,res)=>{
  try {
    await b2.authorize();

    const fileName = `videos/${Date.now()}_${req.file.originalname}`;
    const fileData = fs.readFileSync(req.file.path);
    const { data: { uploadUrl, authorizationToken } } = await b2.getUploadUrl({ bucketId: 'TU_BUCKET_ID' });

    await b2.uploadFile({
      uploadUrl,
      uploadAuthToken: authorizationToken,
      fileName,
      data: fileData,
      mime: req.file.mimetype,
    });

    fs.unlinkSync(req.file.path); // elimina archivo local

    res.json({ fileName }); // o guarda en DB
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al subir a B2' });
  }
}