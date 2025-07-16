import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
    cors: {
        origin: '*', // En producción, deberías restringir esto
    },
});

const PORT = process.env.PORT || 3001;

io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Evento para unirse a una sala (ej. la sala del bebé)
    socket.on('join-room', (roomName: string) => {
        socket.join(roomName);
        console.log(`Cliente ${socket.id} se unió a la sala ${roomName}`);
        // Notificar a los otros en la sala que un nuevo par se ha unido
        socket.to(roomName).emit('peer-joined', { peerId: socket.id });
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
        // Aquí podrías notificar a la sala que el par se fue
    });
});

server.listen(PORT, () => {
    console.log(`Servidor de señalización escuchando en el puerto ${PORT}`);
});