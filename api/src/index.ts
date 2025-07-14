import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

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
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

interface ClientInfo {
  socket: any;
  role: 'camera' | 'viewer';
  email: string;
}

const clients: ClientInfo[] = [];

io.on('connection', (socket) => {
  let clientInfo: ClientInfo | null = null;

  socket.on('email', (payload) => {
    socket.join(payload.email);
    clientInfo = { socket, role: payload.type, email: payload.email };
    clients.push(clientInfo);
    if (payload.type === 'camera') {
      const camera = { cameraId: socket.id };
      socket.broadcast.to(payload.email).emit('new-camera', camera);
    }
  });

  socket.on('get-cameras-list', (payload) => {
    const camerasId = clients
      .filter((c) => c.role === 'camera' && c.email === payload.email)
      .map((c) => c.socket.id);
    socket.emit('cameras-list', camerasId);
  });

  socket.on('add-cameras-list', (payload) => {
    const camerasId = clients
      .filter((c) => c.role === 'camera' && c.email === payload.email)
      .map((c) => c.socket.id);
    const viewerSockets = clients
      .filter(c => c.role === 'viewer' && c.email === payload.email)
      .map((c) => c.socket.id);
    
    viewerSockets.forEach(sId =>socket.to(sId).emit('cameras-list', camerasId))
  });

  socket.on('offer', (payload) => {
    socket.to(payload.targetId).emit('offer', payload);
  });

  socket.on('answer', (payload) => {
    socket.to(payload.targetId).emit('answer', payload);
  });

  socket.on('ice-candidate', (payload) => {
    socket.to(payload.targetId).emit('ice-candidate', payload);
  });

  socket.on('disconnecting', () => {
    if (clientInfo && clientInfo.role === 'camera') {
      const email = clientInfo.email;
      socket.broadcast.to(email).emit('disconnected-camera', { cameraId: socket.id });
    }
    if (clientInfo) {
      const idx = clients.indexOf(clientInfo);
      if (idx !== -1) clients.splice(idx, 1);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT} (HTTP + Socket.io)`);
});
