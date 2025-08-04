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
import B2 from 'backblaze-b2';
import { admin } from './config/firebaseConfig.js';
import { router as bucketRoutes } from './routes/bucket.routes.js';
import { router as userRoutes } from './routes/users.routes.js';
import { router as groupRoutes } from './routes/group.routes.js';
import { WebSocketServer } from 'ws';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const httpServer = createServer(app);

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitHost = process.env.LIVEKIT_URL;
const livekitEgressUrl = 'https://' + livekitHost;
const receiver = new WebhookReceiver(apiKey, apiSecret);
const egressClient = new EgressClient(livekitEgressUrl, apiKey, apiSecret);
const wsAudioPath = '/audio-egress';
const wss = new WebSocketServer({ server: httpServer, path: wsAudioPath });
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
let clients = [];

// Socket connection for TrackEgress data input
wss.on('connection', (ws, req) => {
  console.log('[WS] Nueva conexión de egress para análisis de audio');
  let audioBuffers = [];
  let lastFlush = Date.now();
  const FLUSH_MS = 6000; // 6 segundos

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const audioDir = path.join(__dirname, 'temp', 'audio');
  if (!fs.existsSync(audioDir)) {
    console.log('[WS] Creando directorio temporal para audio:', audioDir);
    fs.mkdirSync(audioDir, { recursive: true });
  }

  function flushAudioBuffer() {
    if (audioBuffers.length === 0) return;
    const pcmData = Buffer.concat(audioBuffers);
    const baseName = `audio-${Date.now()}`;
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
      console.log('[WS] flushAudioBuffer: guardando como estéreo');
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
      console.log('[WS] flushAudioBuffer: guardando como mono');
    }
    wav.encode(audioData).then(wavBuffer => {
      fs.writeFileSync(wavPath, Buffer.from(wavBuffer));
      console.log(`[WS] Archivo WAV guardado: ${wavPath}`);
    }).catch(err => {
      console.error('[WS] Error al guardar WAV:', err);
    });
    audioBuffers = [];
    lastFlush = Date.now();
  }

  const flushInterval = setInterval(() => {
    if (Date.now() - lastFlush >= FLUSH_MS) {
      flushAudioBuffer();
    }
  }, 1000);

  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      audioBuffers.push(data);
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
    flushAudioBuffer();
    clearInterval(flushInterval);
    console.log('[WS] Conexión de egress cerrada');
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

    socket.on('add-camera', (data) => {
        const camerasId = clients
            .filter((c) => c.role === 'camera' && c.group === data.group)
            .map((c) => c.socket.id);
        
        const viewerSockets = clients
            .filter(c => c.role === 'viewer' && c.group === data.group)
            .map((c) => c.socket.id);
        
        viewerSockets.forEach(sId =>{
            console.log(`Enviandole al ${sId} que hay una camara disponible`)
            socket.to(sId).emit('cameras-list', camerasId)})
    });

    socket.on('get-cameras-list', (data) => {
        const camerasId = clients
            .filter((c) => c.role === 'camera' && c.group === data.group)
            .map((c) => c.socket.id);
        socket.emit('cameras-list', camerasId);
    });

    // Notificar a los otros en la sala que un nuevo par se ha unido
    socket.on('start-stream', (data) => {
            /*
            Nota: Esto funciona igual a como lo teniamos antes pero se tiene que cambiar para que 
            busque al cliente camara de ese grupo con ese socketId y mandarle solo a ese      
            */
        socket.to(data.group).emit('peer-joined', { peerId: socket.id });
    });
    
    // Reenviar la oferta de WebRTC a los otros pares en la sala
    socket.on('offer', (payload) => {
        console.log(`Recibida oferta de ${socket.id}, reenviando a ${payload.targetPeerId}`);
        io.to(payload.targetPeerId).emit('offer', {
            sdp: payload.sdp,
            sourcePeerId: socket.id,
        });
    });

    // Reenviar la respuesta de WebRTC al par original
    socket.on('answer', (payload) => {
        console.log(`Recibida respuesta de ${socket.id}, reenviando a ${payload.targetPeerId}`);
        io.to(payload.targetPeerId).emit('answer', {
            sdp: payload.sdp,
            sourcePeerId: socket.id,
        });
    });

    // Reenviar los candidatos ICE
    socket.on('ice-candidate', (payload) => {
        io.to(payload.targetPeerId).emit('ice-candidate', {
            candidate: payload.candidate,
            sourcePeerId: socket.id,
        });
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
    // Solo nos interesa track_published de cámaras
    if (event.event === 'track_published' && event.participant && event.participant.identity && event.participant.identity.startsWith('camera-')) {
      console.log('[Webhook] Evento track_published de cámara detectado');
      const roomName = event.room.name;
      const track = event.track;
      // Lanzar TrackEgress a WebSocket para audio
      if (track && track.type === TrackType.AUDIO) {
        const wsUrl = 'wss://' + process.env.SERVER_ANNOUNCED_URL + wsAudioPath;
        egressClient.startTrackEgress(roomName, wsUrl, track.sid)
          .then(info => {
            console.log('[Egress] TrackEgress lanzado:', info.egressId);
          })
          .catch(err => {
            console.error('[Egress] Error lanzando TrackEgress:', err);
          });
      }
      // (Opcional) lógica para video o composite egress aquí
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
    console.log('access token', token);
    res.json({ token });
  }).catch(err => {
    console.error('Error generating token:', err);
    res.status(500).send('Error generating token');
  });
});

(async () => {
  try {
    // Conexión a MongoDB
    mongoose.connect(`mongodb+srv://babywise2025:${process.env.MONGO_PW}@babywise.aengkd2.mongodb.net/${process.env.MONGO_DB_NAME}?retryWrites=true&w=majority&appName=${process.env.MONGO_APP_NAME}`)
      .then(() => console.log("Conectado a MongoDB"))
      .catch((error) => console.log("Error de conexión a MongoDB:", error));

    console.log("-> Connected to MongoDB");

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