import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Configuración de variables de entorno
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('API Babywise backend funcionando');
});

const server = createServer(app);


const wss = new WebSocketServer({ server });

interface ClientInfo {
  ws: any;
  role: 'emisor' | 'viewer' | null;
}

const clients: ClientInfo[] = [];

wss.on('connection', (ws) => {
  // Por defecto, el cliente no tiene rol
  const clientInfo: ClientInfo = { ws, role: null };
  clients.push(clientInfo);

  ws.on('message', (message) => {
    let data;
    try {
      // Asegura que el mensaje sea string (por si viene como Buffer)
      const msgStr = typeof message === 'string' ? message : message.toString();
      data = JSON.parse(msgStr);
    } catch {
      data = message;
    }
    console.log('Mensaje recibido:', data);

    // Identificación de rol
    if (data && data.type === 'identify' && (data.role === 'emisor' || data.role === 'viewer')) {
      clientInfo.role = data.role;
      return;
    }

    // Si el viewer pide la offer
    if (data && data.type === 'request-offer') {
      const emisor = clients.find((c) => c.role === 'emisor' && c.ws.readyState === ws.OPEN);
      if (emisor) {
        console.log('Enviando request-offer al emisor');
        emisor.ws.send(JSON.stringify({ type: 'request-offer' }));
      } else {
        console.log('No se encontró emisor conectado');
      }
      return;
    }

    // Si el emisor envía la offer, solo la reenvía al viewer
    if (data && data.type === 'offer') {
      const viewer = clients.find((c) => c.role === 'viewer' && c.ws.readyState === ws.OPEN);
      if (viewer) {
        viewer.ws.send(JSON.stringify({ type: 'offer', offer: data.offer }));
      }
      return;
    }

    // Si el viewer envía la answer, solo la reenvía al emisor
    if (data && data.type === 'answer') {
      const emisor = clients.find((c) => c.role === 'emisor' && c.ws.readyState === ws.OPEN);
      if (emisor) {
        emisor.ws.send(JSON.stringify({ type: 'answer', answer: data.answer }));
      }
      return;
    }

    // ICE candidates: reenviar al otro
    if (data && data.type === 'candidate') {
      const target = clientInfo.role === 'emisor'
        ? clients.find((c) => c.role === 'viewer' && c.ws.readyState === ws.OPEN)
        : clients.find((c) => c.role === 'emisor' && c.ws.readyState === ws.OPEN);
      if (target) {
        target.ws.send(JSON.stringify({ type: 'candidate', candidate: data.candidate }));
      }
      return;
    }
  });

  ws.on('close', () => {
    // Eliminar cliente desconectado
    const idx = clients.indexOf(clientInfo);
    if (idx !== -1) clients.splice(idx, 1);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT} (HTTP + WebSocket)`);
});
