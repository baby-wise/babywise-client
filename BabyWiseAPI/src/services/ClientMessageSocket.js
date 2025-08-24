
//TODO revisar esto que habia quedado viejo del manejo del stream manual
function setUpClientMessageSocket(socket) {
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
}