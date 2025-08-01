import { registerGlobals } from 'react-native-webrtc';
registerGlobals();

import { Device } from 'mediasoup-client';
import { io } from 'socket.io-client';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

class ConsumerService {
  constructor(roomId) {
    this.roomId = roomId;
    this.socket = null;
    this.device = null;
    this.recvTransport = null;
    this.consumers = new Map();
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
        console.log('-> ConsumerService: Socket conectado! ID:', this.socket.id);
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

  async createRecvTransport() {
    const params = await this._emitWithAck('create-webrtc-transport', { roomId: this.roomId, type: 'recv' });
    this.recvTransport = this.device.createRecvTransport(params);
    this.recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      this._emitWithAck('connect-transport', {
        roomId: this.roomId,
        transportId: this.recvTransport.id,
        dtlsParameters
      }).then(callback).catch(errback);
    });
  }

  async consume(producerId) {
    if (!this.recvTransport) throw new Error('No recvTransport');
    const { id, kind, rtpParameters } = await this._emitWithAck('consume', {
      roomId: this.roomId,
      transportId: this.recvTransport.id,
      producerId,
      rtpCapabilities: this.device.rtpCapabilities,
    });
    const consumer = await this.recvTransport.consume({ id, producerId, kind, rtpParameters });
    // This next line is now critical. It tells the server to unpause.
    await this._emitWithAck('resume-consumer', { roomId: this.roomId, consumerId: consumer.id });
    this.consumers.set(consumer.id, consumer);
    return consumer;
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

  requestKeyFrame(producerId) {
    // No necesitamos esperar una respuesta, es una solicitud de "dispara y olvida"
    this.socket.emit('request-keyframe', { roomId: this.roomId, producerId });
  }

  close() {
    this.recvTransport?.close();
    this.socket?.disconnect();
  }
}

export default ConsumerService;
