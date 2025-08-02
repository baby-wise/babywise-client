import { AccessToken, WebhookReceiver, EgressClient, TrackType } from 'livekit-server-sdk';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import B2 from 'backblaze-b2';
import { router as bucketRoutes } from './routes/bucket.routes.js';
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

wss.on('connection', (ws, req) => {
  console.log('[WS] Nueva conexión de egress para análisis de audio');
  ws.on('message', (data, isBinary) => {
    if (isBinary) {
      // Aquí recibís frames PCM de audio
      // TODO: pasar a tu proceso/modelo de IA para análisis de llanto
      // Por ejemplo: analizarBufferPCM(data)
      console.log('[WS] Frame de audio recibido:', data.length, 'bytes');
    } else {
      // Mensajes de control (mute/unmute, etc)
      try {
        const msg = JSON.parse(data.toString());
        console.log('[WS] Mensaje de control:', msg);
      } catch {
        console.error('[WS] Error al procesar mensaje de control');
      }
    }
  });
  ws.on('close', () => {
    console.log('[WS] Conexión de egress cerrada');
  });
});

// Necesario para recibir el body crudo
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
    // Connect to MongoDB
    await mongoose.connect(`mongodb+srv://babywise2025:${process.env.MONGO_PW}@babywise.aengkd2.mongodb.net/?retryWrites=true&w=majority&appName=${process.env.MONGO_APP_NAME}`);
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

export const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});