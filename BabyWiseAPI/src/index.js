
import { AccessToken } from 'livekit-server-sdk';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import B2 from 'backblaze-b2';
import { router as bucketRoutes } from './routes/bucket.routes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const httpServer = createServer(app);


// En memoria: agents activos por room/cámara
const activeAgents = {};

// --- LiveKit Webhook Receiver ---
import { WebhookReceiver } from 'livekit-server-sdk';
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitHost = process.env.LIVEKIT_HOST;
const receiver = new WebhookReceiver(apiKey, apiSecret);

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
      const cameraIdentity = event.participant.identity;
      const track = event.track;
      if (track && track.type === 'video') {
        console.log(`[Webhook] Track de video detectado para room ${roomName}, cámara ${cameraIdentity}`);
        const agentKey = `${roomName}:${cameraIdentity}`;
        if (!activeAgents[agentKey]) {
          activeAgents[agentKey] = true;
          console.log(`[Webhook] Lanzando agent para room ${roomName}, cámara ${cameraIdentity}`);
          runEmbeddedAgent(roomName, cameraIdentity, livekitHost, apiKey, apiSecret);
        }
      }
    }
    res.status(200).send('ok');
  } catch (err) {
    console.error('[Webhook] Error procesando webhook:', err);
    res.status(400).send('invalid webhook');
  }
});

// TODO: Implementar lógica real de agent embebido para backend (Node.js)
//       La suscripción a tracks de video debe hacerse usando una librería compatible con Node.js o el SDK server-side.
//       Por ahora, solo se deja el placeholder para lanzar el agent.
function runEmbeddedAgent(roomName, cameraIdentity, livekitHost, apiKey, apiSecret) {
  console.log(`[Agent] (placeholder) Agent lanzado para room ${roomName}, cámara ${cameraIdentity}`);
}

// --- LiveKit Token Generation Endpoint ---
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

// --- Database and Server Initialization ---
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

// --- Express Routes ---
app.use(bucketRoutes);

// --- Backblaze Instance ---
export const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});