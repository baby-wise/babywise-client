import { clients  } from '../index.js';
// Lista global de clientes conectados en memoria


export function setUpClientMessageSocket(socket) {
    console.log(`Cliente conectado: ${socket.id}`);

    // Evento para unirse a una sala (ej. la sala del bebé)
    socket.on('join-room', (data) => {
        socket.join(data.group);
        console.log(`${data.role} ${socket.id} se unió al grupo: ${data.group}`);
        // Si es cámara, guardar cameraIdentity
        const clientInfo = { socket, role: data.role, group: data.group };
        if (data.role === 'camera' && data.cameraIdentity) {
            clientInfo.cameraIdentity = data.cameraIdentity;
        }
        clients.push(clientInfo); 
    });

    // Nuevo: manejar play-audio
    socket.on('play-audio', ({ group, cameraIdentity, audioUrl }) => {
        // Buscar la cámara destino en clients
        const cameraClient = clients.find(c => c.role === 'camera' && c.group === group && c.cameraIdentity === cameraIdentity);
        if (cameraClient && cameraClient.socket) {
            cameraClient.socket.emit('play-audio', { audioUrl });
            console.log(`[SOCKET] Enviado play-audio a cámara ${cameraIdentity}`);
        } else {
            console.warn(`[SOCKET] No se encontró cámara ${cameraIdentity} en grupo ${group} para play-audio`);
        }
    });

    // Nuevo: manejar stop-audio
    socket.on('stop-audio', ({ group, cameraIdentity }) => {
        const cameraClient = clients.find(c => c.role === 'camera' && c.group === group && c.cameraIdentity === cameraIdentity);
        if (cameraClient && cameraClient.socket) {
            cameraClient.socket.emit('stop-audio');
            console.log(`[SOCKET] Enviado stop-audio a cámara ${cameraIdentity}`);
        } else {
            console.warn(`[SOCKET] No se encontró cámara ${cameraIdentity} en grupo ${group} para stop-audio`);
        }
    });



    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
        const idx = clients.findIndex(c => c.socket.id === socket.id);
        if (idx !== -1) clients.splice(idx, 1);
    });
}