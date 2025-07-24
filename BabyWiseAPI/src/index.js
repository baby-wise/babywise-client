import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose'
import dotenv from 'dotenv';


const app = express();
app.use(cors());
app.use(express.json());

dotenv.config()

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
/*
interface ClientInfo {
  socket: any;
  role: 'camera' | 'viewer';
  group: string;
}
*/
let clients = [];

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

// Conexión a MongoDB
mongoose.connect(`mongodb+srv://babywise2025:${process.env.MONGOPW}@babywise.aengkd2.mongodb.net/?retryWrites=true&w=majority&appName=${process.env.MONGOAPPNAME}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Conectado a MongoDB"))
  .catch((error) => console.log("Error de conexión a MongoDB:", error));

server.listen(PORT, () => {
    console.log(`Servidor de señalización escuchando en el puerto ${PORT}`);
});