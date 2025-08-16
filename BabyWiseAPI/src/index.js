import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { AccessToken, WebhookReceiver, EgressClient, TrackType } from 'livekit-server-sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import wav from 'wav-encoder';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import B2 from 'backblaze-b2';
import { admin } from './config/firebaseConfig.js';
import { router as bucketRoutes } from './routes/bucket.routes.js';
import { router as userRoutes } from './routes/users.routes.js';
import { router as groupRoutes } from './routes/group.routes.js';
import { WebSocketServer } from 'ws';

dotenv.config();

// Server
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3001;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Livekit vars
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitHost = process.env.LIVEKIT_URL;
const livekitEgressUrl = 'https://' + livekitHost;

// Livekit webhook and egress vars
const receiver = new WebhookReceiver(apiKey, apiSecret);
const egressClient = new EgressClient(livekitEgressUrl, apiKey, apiSecret);
const wsAudioPath = '/audio-egress';
const wss = new WebSocketServer({ server: httpServer, path: wsAudioPath });
let clients = [];
const audioBuffersByTrack = {};

// Cloudflare R2 client
const s3Client = new S3Client({
  region: process.env.CF_REGION || 'auto',
  endpoint: process.env.CF_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CF_KEY_ID,
    secretAccessKey: process.env.CF_KEY_SECRET,
  },
  forcePathStyle: true,
});

// WebSocket server for livekit audio track egress
wss.on('connection', (ws, req) => {
  // Extraer trackID y participant de la query string
  const url = new URL(req.url, `ws://${req.headers.host}`);
  const trackID = url.searchParams.get('trackID') || 'unknownTrack';
  const participant = url.searchParams.get('participant') || 'unknownParticipant';
  const bufferKey = `${trackID}_${participant}`;
  console.log(`[WS] Nueva conexión de egress para análisis de audio: trackID=${trackID}, participant=${participant}`);

  if (!audioBuffersByTrack[bufferKey]) {
    audioBuffersByTrack[bufferKey] = {
      buffers: [],
      lastFlush: Date.now(),
    };
  }

  const FLUSH_MS = 6000; // 6 segundos
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const audioDir = path.join(__dirname, 'temp', 'audio');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true });
  }

  function flushAudioBufferForKey(key) {
    const entry = audioBuffersByTrack[key];
    if (!entry || entry.buffers.length === 0) return;
    const pcmData = Buffer.concat(entry.buffers);
    const baseName = `audio-${key}-${Date.now()}`;
    const wavPath = path.join(audioDir, `${baseName}.wav`);
    const int16 = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);

    let audioData;
    if (int16.length % 2 === 0) {
      // Estéreo
      const left = new Float32Array(int16.length / 2);
      const right = new Float32Array(int16.length / 2);
      for (let i = 0, j = 0; i < int16.length; i += 2, j++) {
        left[j] = int16[i] / 32768;
        right[j] = int16[i + 1] / 32768;
      }
      audioData = {
        sampleRate: 48000,
        channelData: [left, right]
      };
    } else {
      // Mono
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }
      audioData = {
        sampleRate: 48000,
        channelData: [float32]
      };
    }
    wav.encode(audioData).then(wavBuffer => {
      fs.writeFileSync(wavPath, Buffer.from(wavBuffer));
      // TODO mandar archivo a la api de ia, obtener resultado y triggerar notificaciones
    }).catch(err => {
      console.error('[WS] Error al guardar WAV:', err);
    });
    entry.buffers = [];
    entry.lastFlush = Date.now();
  }

  const flushInterval = setInterval(() => {
    const entry = audioBuffersByTrack[bufferKey];
    if (entry && Date.now() - entry.lastFlush >= FLUSH_MS) {
      flushAudioBufferForKey(bufferKey);
    }
  }, 1000);

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      audioBuffersByTrack[bufferKey].buffers.push(data);
    } else {
      try {
        const msg = JSON.parse(data.toString());
        console.log('[WS] Mensaje de control:', msg);
      } catch {
        console.error('[WS] Error al procesar mensaje de control');
      }
    }
  });
  ws.on('close', () => {
    flushAudioBufferForKey(bufferKey);
    clearInterval(flushInterval);
    delete audioBuffersByTrack[bufferKey];
    console.log(`[WS] Conexión de egress cerrada para ${bufferKey}`);
  });
});

// Socket connection for mobile clients
io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Evento para unirse a una sala (ej. la sala del bebé)
    socket.on('join-room', (data) => {
        socket.join(data.group);
        console.log(`${data.role} ${socket.id} se unió al grupo: ${data.group}`);
        const clientInfo = { socket, role: data.role, group: data.group };
        clients.push(clientInfo);
    });



    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
        clients = clients.filter(c => c.socket.id !== socket.id)
    });
});

// Webhook for LiveKit events
app.use('/webhook', express.raw({ type: 'application/webhook+json' }));
app.post('/webhook', async (req, res) => {
  try {
    const event = await receiver.receive(req.body, req.get('Authorization'));
    console.log('[Webhook] Evento recibido:', event.event);
    // Iniciar TrackEgress para audio ante track_published y ParticipantEgress HLS ante participant_joined (rol cámara)
    if (event.event === 'track_published' && event.participant && event.participant.identity && event.participant.identity.startsWith('camera-')) {
      console.log('[Webhook] Evento track_published de cámara detectado');
      const roomName = event.room.name;
      const track = event.track;
      if (track && track.type === TrackType.AUDIO) {
        const wsUrl = `wss://${process.env.SERVER_ANNOUNCED_URL}${wsAudioPath}?trackID=${encodeURIComponent(track.sid)}&participant=${encodeURIComponent(event.participant.identity)}`;
        egressClient.startTrackEgress(roomName, wsUrl, track.sid)
          .then(info => {
            console.log('[Egress] TrackEgress lanzado:', info.egressId, 'URL:', wsUrl);
          })
          .catch(err => {
            console.error('[Egress] Error lanzando TrackEgress:', err);
          });
      }
    }
    
    // Lanzar ParticipantEgress HLS a S3 (Backblaze) para cámaras al unirse
    if (event.event === 'participant_joined' && event.participant && event.participant.identity && event.participant.identity.startsWith('camera-')) {
      console.log('[Webhook] Evento participant_joined de cámara detectado');
      const roomName = event.room.name;
      const participantIdentity = event.participant.identity;
      const { 
        CF_KEY_ID, 
        CF_KEY_SECRET, 
        CF_BUCKET_NAME,
        CF_ENDPOINT 
      } = process.env;

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const today = `${yyyy}-${mm}-${dd}`;
      const time = `${hh}_${min}_${ss}`;
      const pathPrefix = `recordings/${roomName}/${participantIdentity}/${today}/${time}`;

      const outputs = {
        segments: {
          filenamePrefix: `${pathPrefix}/hls`,
          playlistName: `${pathPrefix}/playlist.m3u8`,
          livePlaylistName: `${pathPrefix}/playlist-live.m3u8`,
          segmentDuration: 6,
          output: {
            case: 's3',
            value: {
              accessKey: CF_KEY_ID || '',
              secret: CF_KEY_SECRET || '',
              bucket: CF_BUCKET_NAME || '',
              endpoint: CF_ENDPOINT || '',
              forcePathStyle: true,
            },
          },
        },
      }
      
      egressClient.startParticipantEgress(roomName, participantIdentity, outputs)
        .then(info => {console.log('[Egress] ParticipantEgress HLS lanzado:', info.egressId);})
        .catch(err => {console.error('[Egress] Error lanzando ParticipantEgress HLS:', err);});
    }

    res.status(200).send('ok');

  } catch (err) {
    console.error('[Webhook] Error procesando webhook:', err);
    res.status(400).send('invalid webhook');
  }
});

// Token endpoint for LiveKit
app.get('/getToken', async (req, res) => {
  const { roomName, participantName } = req.query;
  if (!roomName || !participantName) {
    return res.status(400).send('Missing roomName or participantName query parameters');
  }

  if (!apiKey || !apiSecret || !livekitHost) {
    return res.status(500).send('LiveKit server environment variables not configured.');
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantName,
  });

  const videoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  };
  at.addGrant(videoGrant);

  at.toJwt().then(token => {
    res.json({ token });
  }).catch(err => {
    console.error('Error generating token:', err);
    res.status(500).send('Error generating token');
  });
});


// Endpoint para obtener lista grabaciones de un participant
app.get('/recordings', async (req, res) => {
  const { room } = req.query;
  if (!room) {
    return res.status(400).json({ error: 'room is required' });
  }
  const bucket = process.env.CF_BUCKET_NAME;
  const prefix = `recordings/${room}/`;
  try {
    // recordingsByParticipant: { [participantIdentity]: { [fecha_hora]: {date, time, playlistUrl, key, duration} } }
    let recordingsByParticipant = {};
    let continuationToken = undefined;
    do {
      const params = {
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      };
      const resp = await s3Client.send(new ListObjectsV2Command(params));
      for (const obj of resp.Contents || []) {
        // Esperado: obj.Key = recordings/{room}/{participant}/{fecha}/{hora}/hls000.ts o playlist.m3u8
        const keyParts = obj.Key.split('/');
        const participantIdentity = keyParts[2];
        const date = keyParts[3];
        const time = keyParts[4];
        if (!participantIdentity || !date || !time) continue;
        if (!recordingsByParticipant[participantIdentity]) {
          recordingsByParticipant[participantIdentity] = {};
        }
        const recId = `${date}_${time}`;
        if (!recordingsByParticipant[participantIdentity][recId]) {
          recordingsByParticipant[participantIdentity][recId] = {
            date,
            time,
            playlistUrl: null,
            key: null,
            duration: 0,
          };
        }
        if (obj.Key.endsWith('.m3u8') && !obj.Key.includes('-live')) {
          recordingsByParticipant[participantIdentity][recId].playlistUrl = `${process.env.CF_PUBLIC_URL}/${obj.Key}`;
          recordingsByParticipant[participantIdentity][recId].key = obj.Key;
        }
        if (obj.Key.endsWith('.ts')) {
          recordingsByParticipant[participantIdentity][recId].duration += 6;
        }
      }
      continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (continuationToken);
    // Convertir a formato de respuesta: array de { participant, recordings: [ ... ] }
    let result = [];
    for (const [participant, recMap] of Object.entries(recordingsByParticipant)) {
      const recordings = Object.values(recMap).filter(r => r.playlistUrl);
      if (recordings.length > 0) {
        result.push({ participant, recordings });
      }
    }
    console.log(`[API] Grabaciones encontradas en el room ${room}: `, result);
    res.json({ recordingsByParticipant: result });
  } catch (err) {
    console.error('[API] Error listando grabaciones:', err);
    res.status(500).json({ error: 'Error listing recordings' });
  }
});


(async () => {
  try {
    // Conexión a MongoDB
    mongoose.connect(`mongodb+srv://babywise2025:${process.env.MONGO_PW}@babywise.aengkd2.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority&appName=${process.env.MONGO_APP_NAME}`)
      .then(() => console.log("-> Conectado a MongoDB"))
      .catch((error) => console.log("-> Error de conexión a MongoDB:", error));

    // Start the HTTP server
    httpServer.listen(PORT, () => {
      console.log(`-> Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error during server initialization:", error);
  }
})();

app.use(bucketRoutes);
app.use(userRoutes);
app.use(groupRoutes);

export const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});