import { registerGlobals } from 'react-native-webrtc';
import { Device } from 'mediasoup-client';
import 'mediasoup-client/lib/handlers/ReactNative106';
import { io } from 'socket.io-client';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

registerGlobals();

class MediasoupService {
  constructor(roomId) {
    this.roomId = roomId;
    this.socket = null;
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producers = new Map();
    this.consumers = new Map();
  }

  // Conectar al socket y crear el 'Device' de Mediasoup
  async connect() {
    this.socket = io(SIGNALING_SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    return new Promise((resolve, reject) => {
      this.socket.on('connect', async () => {
        console.log('-> Socket.IO Client: Evento "connect" recibido! Socket ID:', this.socket.id);
        try {
          this.device = new Device();
          resolve();
        } catch (error) {
          console.error('Error al crear el Device de Mediasoup:', error);
          reject(error);
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('-> Socket.IO Client: Error de conexión:', error.message);
        reject(new Error(`Error de conexión de Socket.IO: ${error.message}`));
      });

      this.socket.on('error', (error) => {
        console.error('-> Socket.IO Client: Error general:', error.message);
        reject(new Error(`Error general de Socket.IO: ${error.message}`));
      });
    });
  }

  // Unirse a la sala y cargar el 'Device' (Refactorizado)
  async joinRoom() {
    try {
      console.log('-> Obteniendo capacidades del router...');
      const routerRtpCapabilities = await this._emitWithAck('get-router-rtp-capabilities', { roomId: this.roomId });
      
      console.log('-> Cargando el Device de Mediasoup...');
      await this.device.load({ routerRtpCapabilities });
      console.log('-> Device cargado. Enviando petición para unirse...');

      // La respuesta de 'join-room' contiene la lista de productores existentes.
      const response = await this._emitWithAck('join-room', { roomId: this.roomId });
      console.log('-> ¡Unido a la sala con éxito!');
      
      // Devolvemos la respuesta completa para que el visor pueda usarla.
      return response;

    } catch (error) {
      console.error('Error en joinRoom:', error);
      // Re-lanzamos el error para que sea capturado en la pantalla
      throw error;
    }
  }

  // Crear el transporte de envío
  async createSendTransport() {
    console.log('-> Creando transporte de envío...');
    const params = await this._emitWithAck('create-webrtc-transport', {
      roomId: this.roomId,
      type: 'send'
    });

    this.sendTransport = this.device.createSendTransport(params);

    this.sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      console.log('-> Evento "connect" del transporte de envío');
      this._emitWithAck('connect-transport', {
        roomId: this.roomId,
        transportId: this.sendTransport.id,
        dtlsParameters
      })
        .then(callback)
        .catch(errback);
    });

    this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
      console.log(`-> Evento "produce" del transporte de envío para ${kind}`);
      try {
        const { id } = await this._emitWithAck('produce', {
          roomId: this.roomId,
          transportId: this.sendTransport.id,
          kind,
          rtpParameters,
        });
        callback({ id });
      } catch (error) {
        errback(error);
      }
    });

    console.log('-> Transporte de envío creado');
  }

  // Producir (enviar) una pista de audio o video
  async produce(track) {
    if (!this.sendTransport) {
      throw new Error('El transporte de envío no ha sido creado.');
    }
    console.log(`-> Produciendo pista de ${track.kind}...`);
    const producer = await this.sendTransport.produce({ track });
    this.producers.set(producer.id, producer);
    console.log(`-> Pista de ${track.kind} producida con éxito. ID: ${producer.id}`);
    return producer;
  }

  // --- MÉTODOS PARA EL VISOR ---

  async createRecvTransport() {
    console.log('-> Creando transporte de recepción...');
    const params = await this._emitWithAck('create-webrtc-transport', {
      roomId: this.roomId,
      type: 'recv'
    });

    this.recvTransport = this.device.createRecvTransport(params);

    this.recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      console.log('-> Evento "connect" del transporte de recepción');
      this._emitWithAck('connect-transport', {
        roomId: this.roomId,
        transportId: this.recvTransport.id,
        dtlsParameters
      })
        .then(callback)
        .catch(errback);
    });
  }

  async consume(producerId) {
    if (!this.recvTransport) {
      throw new Error('El transporte de recepción no ha sido creado.');
    }
    // --- LOG DE DEPURACIÓN ---
    console.log(`-> Preparando para consumir productor: ${producerId}`);
    console.log('-> Capacidades del device antes de consumir:', this.device.rtpCapabilities);
    if (!this.device.loaded) {
      console.error('¡ALERTA! El device no está cargado. La llamada a consume probablemente fallará.');
      throw new Error('El device de Mediasoup no está cargado. No se puede consumir.');
    }
    // --- FIN LOG ---

    console.log(`-> Consumiendo productor con ID: ${producerId}`);
    const { id, kind, rtpParameters } = await this._emitWithAck('consume', {
      roomId: this.roomId,
      transportId: this.recvTransport.id,
      producerId: producerId,
      rtpCapabilities: this.device.rtpCapabilities,
    });

    const consumer = await this.recvTransport.consume({
      id,
      producerId,
      kind,
      rtpParameters,
    });

    this.consumers.set(consumer.id, consumer);
    console.log(`-> Consumidor creado para productor ${producerId}`);
    return consumer;
  }

  // Helper para emitir eventos de socket y esperar una respuesta (ack)
  _emitWithAck(event, data) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        return reject(new Error('Socket no está conectado'));
      }
      this.socket.emit(event, data, (response) => {
        if (response && response.error) {
          console.error(`Error en el evento '${event}':`, response.error);
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // Cerrar la conexión
  close() {
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.socket?.disconnect();
  }
}

export default MediasoupService;