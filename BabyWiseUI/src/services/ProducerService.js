import { registerGlobals } from 'react-native-webrtc';
registerGlobals();

import { Device } from 'mediasoup-client';
import { io } from 'socket.io-client';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

class ProducerService {
  constructor(roomId) {
    this.roomId = roomId;
    this.socket = null;
    this.device = null;
    this.sendTransport = null;
    this.producers = new Map();
    this.deviceLoaded = false;
  }

  async connect() {
    this.socket = io(SIGNALING_SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        console.log('-> ProducerService: Socket conectado! ID:', this.socket.id);
        resolve();
      });
      this.socket.on('connect_error', (error) => reject(error));
      this.socket.on('error', (error) => reject(error));
    });
  }

  async joinRoom(peerId) {
    const routerRtpCapabilities = await this._emitWithAck('get-router-rtp-capabilities', { roomId: this.roomId });
    
    // Manipulate codecs to prefer H264
/*     const h264Codec = routerRtpCapabilities.codecs.find(c => c.mimeType.toLowerCase() === 'video/h264');
    const otherCodecs = routerRtpCapabilities.codecs.filter(c => c.mimeType.toLowerCase() !== 'video/h264');
    routerRtpCapabilities.codecs = [h264Codec, ...otherCodecs].filter(c => c); */

    if (!this.device) this.device = new Device({handlerName: 'ReactNative106'});
    if (!this.deviceLoaded) {
      await this.device.load({ routerRtpCapabilities });
      this.deviceLoaded = true;
    }
    return this._emitWithAck('join-room', { roomId: this.roomId, peerId });
  }

  async createSendTransport() {
    const params = await this._emitWithAck('create-webrtc-transport', { roomId: this.roomId, type: 'send' });
    this.sendTransport = this.device.createSendTransport(params);
    this.sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      this._emitWithAck('connect-transport', {
        roomId: this.roomId,
        transportId: this.sendTransport.id,
        dtlsParameters
      }).then(callback).catch(errback);
    });
    this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
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
  }

  async produce(track) {
    if (!this.sendTransport) throw new Error('No sendTransport');
    console.log('[ProducerService] produce() - Track info:', track);
    if (track) {
      console.log('[ProducerService] Track kind:', track.kind, 'enabled:', track.enabled, 'muted:', track.muted, 'readyState:', track.readyState);
    }
    const producer = await this.sendTransport.produce({ track });
    console.log('[ProducerService] Producer creado:', producer);
    this.producers.set(producer.id, producer);
    return producer;
  }

  _emitWithAck(event, data) {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket no conectado'));
      this.socket.emit(event, data, (response) => {
        if (response && response.error) reject(new Error(response.error));
        else resolve(response);
      });
    });
  }

  close() {
    this.sendTransport?.close();
    this.socket?.disconnect();
  }
}

export default ProducerService;
