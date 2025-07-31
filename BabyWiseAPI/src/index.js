import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import B2 from 'backblaze-b2';
import { router as bucketRoutes } from './routes/bucket.routes.js';

// --- Lógica de Mediasoup ---
import { createWorkers, getMediasoupWorker } from './mediasoup/worker.js';
import { Room } from './mediasoup/room.js';
import { Peer } from './mediasoup/peer.js';

dotenv.config();

// --- Configuración del servidor ---
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

// --- Almacenamiento en memoria para Mediasoup ---
// En un entorno de producción, esto podría moverse a Redis para escalar horizontalmente.
const rooms = new Map(); // Mapa de roomId -> Room

// --- Inicialización del Servidor ---
(async () => {
  console.log('Iniciando workers de Mediasoup...');
  await createWorkers();

  // Conexión a MongoDB
  await mongoose.connect(`mongodb+srv://babywise2025:${process.env.MONGO_PW}@babywise.aengkd2.mongodb.net/?retryWrites=true&w=majority&appName=${process.env.MONGO_APP_NAME}`)
    .then(() => console.log("-> Conectado a MongoDB"))
    .catch((error) => console.log("Error de conexión a MongoDB:", error));

  // Iniciar el servidor HTTP
  httpServer.listen(PORT, () => {
    console.log(`-> Servidor escuchando en el puerto ${PORT}`);
  });
})();

// --- Lógica de Socket.IO para Señalización ---
io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);

  socket.on('get-router-rtp-capabilities', async ({ roomId }, callback) => {
    try {
      console.log(`-> Recibida petición 'get-router-rtp-capabilities' para la sala: ${roomId}`);
      
      // Lógica modificada: Si la sala no existe, la creamos aquí.
      let room = rooms.get(roomId);
      if (!room) {
        console.log(`La sala ${roomId} no existe. Creándola...`);
        const worker = getMediasoupWorker();
        room = await Room.create({ worker, roomId });
        rooms.set(roomId, room);
      }

      const rtpCapabilities = room.getRtpCapabilities();
      callback(rtpCapabilities);

    } catch (error) {
      console.error('Error en get-router-rtp-capabilities:', error);
      callback({ error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    // Limpiar el peer de cualquier sala en la que estuviera
    rooms.forEach(room => {
      if (room.getPeer(socket.id)) {
        room.handlePeerDisconnect(socket.id);
      }
    });
  });

  // --- Evento para el selector de cámaras ---
  socket.on('get-cameras-list', ({ roomId }) => {
    const room = rooms.get(roomId);
    let cameras = [];
    if (room) {
      console.log(`-> Petición de lista de cámaras para la sala: ${roomId}. Sala encontrada.`);
      cameras = room.getProducerListForPeer();
    } else {
      console.log(`-> Petición de lista de cámaras para la sala: ${roomId}. La sala no existe todavía.`);
    }
    // Enviamos la lista de vuelta al cliente que la solicitó.
    socket.emit('cameras-list', cameras);
  });


  // --- Eventos de Mediasoup ---

  // 1. El cliente pide unirse a una sala
  socket.on('join-room', async ({ roomId }, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        return callback({ error: `La sala ${roomId} no fue encontrada.` });
      }
      const peer = new Peer(socket.id, 'user-' + socket.id);
      room.addPeer(peer);

      // Envía los IDs de productores reales
      const producerIds = room.getAllProducerIds();
      callback({ producerIds });
    } catch (error) {
      console.error('Error en join-room:', error);
      callback({ error: error.message });
    }
  });

  // 3. El cliente quiere crear un transport para enviar/recibir
  socket.on('create-webrtc-transport', async ({ roomId }, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        return callback({ error: `La sala ${roomId} no existe.` });
      }

      const peer = room.getPeer(socket.id);
      if (!peer) {
        return callback({ error: `Peer no encontrado para socket ${socket.id}. Asegúrate de haberte unido a la sala.` });
      }
      
      const { transport, params } = await room.createWebRtcTransport(socket.id);
      peer.addTransport(transport);
  
      callback(params);
    } catch (error) {
      console.error('Error al crear transporte:', error);
      callback({ error: error.message });
    }
  });

  // 4. El cliente está listo para conectar su transport
  socket.on('connect-transport', async ({ roomId, transportId, dtlsParameters }, callback) => {
    try {
      const room = rooms.get(roomId);
      if (!room) {
        return callback({ error: 'Sala no encontrada' });
      }
      
      // Llamamos al método correcto en la instancia de la sala
      await room.connectPeerTransport(socket.id, transportId, dtlsParameters);
      
      callback({ connected: true }); // Informar al cliente que la conexión fue exitosa
    } catch (error) {
      console.error('Error al conectar transporte:', error);
      callback({ error: error.message });
    }
  });

  // 5. El cliente (cámara) quiere empezar a producir
  socket.on('produce', async (data, callback) => {
    const { roomId, transportId, kind, rtpParameters } = data;

    try {
      const room = rooms.get(roomId);
      if (!room) {
        // Este es el error que estás viendo
        return callback({ error: 'Sala no encontrada' });
      }

      const producer = await room.createProducer({
        peerId: socket.id,
        transportId,
        kind,
        rtpParameters,
        paused: false
      });

      // Informar al cliente del ID del productor para que pueda finalizar la creación
      callback({ id: producer.id });

    } catch (error) {
      console.error('Error en el evento produce:', error);
      callback({ error: error.message });
    }
  });

  // 6. El cliente (visor) quiere consumir un stream
  socket.on('consume', async ({ roomId, transportId, producerId, rtpCapabilities }, callback) => {
    try {
      const room = rooms.get(roomId);
      const peer = room.getPeer(socket.id);
      const transport = peer.getTransport(transportId);

      const { consumer, params } = await room.createConsumer({
        consumerTransport: transport,
        producerId,
        rtpCapabilities,
      });
      
      if (consumer) {
        peer.addConsumer(consumer);
        callback(params);
      } else {
        // Si createConsumer devolvió undefined, lo notificamos.
        callback({ error: 'No se pudo crear el consumidor. El router no puede consumir.' });
      }
    } catch (error) {
      console.error('Error en el evento consume:', error);
      callback({ error: error.message });
    }
  });

  socket.on('resume-consumer', async ({ roomId, consumerId }) => {
    const room = rooms.get(roomId);
    const peer = room.getPeer(socket.id);
    if (!room || !peer) return;
    
    const consumer = peer.consumers.get(consumerId);
    if (consumer) {
      await consumer.resume();
    }
  });
});

// --- Rutas de Express ---
app.use(bucketRoutes);

// --- Instancia de Backblaze (ya la tenías) ---
export const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY,
});