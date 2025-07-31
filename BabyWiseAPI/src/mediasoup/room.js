import { config } from './config.js';

export class Room {
  constructor(roomId, router) {
    this.id = roomId;
    this.router = router;
    this.peers = new Map();
  }

  static async create({ worker, roomId }) {
    const router = await worker.createRouter({ mediaCodecs: config.router.mediaCodecs });
    return new Room(roomId, router);
  }

  addPeer(peer) {
    this.peers.set(peer.id, peer);
  }



  getPeer(socketId) {
    return this.peers.get(socketId);
  }

  removePeer(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.close();
      this.peers.delete(peerId);
    }
  }

  handlePeerDisconnect(peerId) {
    console.log(`Peer ${peerId} desconectado de la sala ${this.id}`);
    this.removePeer(peerId);
  }

    getProducerListForPeer() {
    const producerList = [];
    this.peers.forEach(peer => {
      // Consideramos un "peer" como una "cámara" si tiene al menos un productor.
      if (peer.producers.size > 0) {
        producerList.push({
          id: peer.id,       // El ID del peer (socket.id)
          name: peer.name,   // Un nombre descriptivo, ej: 'user-xxxx'
          // Podríamos añadir la lista de producerIds si fuera necesario más adelante
        });
      }
    });
    return producerList;
  }

  getRtpCapabilities() {
    return this.router.rtpCapabilities;
  }

  async createWebRtcTransport(socketId) {
    const transport = await this.router.createWebRtcTransport(config.webRtcTransport);
    
    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        console.log(`Transport para ${socketId} cerrado`);
        // Aquí podrías querer limpiar el transporte del peer
      }
    });

    // El cliente necesita los parámetros del transporte, no el objeto de transporte completo del servidor.
    const params = {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
      sctpParameters: transport.sctpParameters,
    };

    // Devolvemos tanto el objeto de transporte (para uso interno del servidor) como los parámetros (para el cliente).
    return { transport, params };
  }

  async connectPeerTransport(socketId, transportId, dtlsParameters) {
    const peer = this.getPeer(socketId);
    if (!peer) {
      throw new Error(`Peer con socketId ${socketId} no encontrado`);
    }

    const transport = peer.getTransport(transportId);
    if (!transport) {
      throw new Error(`Transporte con id ${transportId} no encontrado para el peer ${socketId}`);
    }

    await transport.connect({ dtlsParameters });
  }

  async createProducer({ peerId, transportId, kind, rtpParameters }) {
    const peer = this.getPeer(peerId);
    if (!peer) {
      throw new Error(`Peer con id ${peerId} no encontrado`);
    }

    const transport = peer.getTransport(transportId);
    if (!transport) {
      throw new Error(`Transporte con id ${transportId} no encontrado`);
    }

    const producer = await transport.produce({ kind, rtpParameters });
    peer.addProducer(producer);

    return producer;
  }

  async createConsumer({ consumerTransport, producerId, rtpCapabilities }) {
    const producer = this.getProducerById(producerId);
    if (!producer) {
      console.error('El productor no existe o fue cerrado:', producerId);
      return;
    }
    console.log('Intentando consumir productor:', producerId);

    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      console.error('El router no puede consumir este productor:', producerId);
      return;
    }

    try {
      // Creamos el consumidor en el transporte del visor.
      // Es buena práctica crearlo pausado y reanudarlo en el cliente.
      const consumer = await consumerTransport.consume({
        producerId,
        rtpCapabilities,
        paused: true,
      });

      // El cliente necesita estos parámetros para crear su propio consumidor.
      const params = {
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      };

      // Devolvemos tanto el objeto consumidor (para el servidor) como los parámetros (para el cliente).
      return { consumer, params };

    } catch (error) {
      console.error('Error al crear el consumidor:', error);
      return; // Devolvemos undefined en caso de error.
    }
  }

  getProducerById(producerId) {
    for (const peer of this.peers.values()) {
      if (peer.producers.has(producerId)) {
        return peer.producers.get(producerId);
      }
    }
    return null;
  }

  getAllProducerIds() {
    const producerIds = [];
    for (const peer of this.peers.values()) {
      for (const producer of peer.producers.values()) {
        producerIds.push(producer.id);
      }
    }
    return producerIds;
  }
}