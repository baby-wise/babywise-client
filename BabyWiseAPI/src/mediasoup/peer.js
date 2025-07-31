export class Peer {
  constructor(socketId, name) {
    this.id = socketId;
    this.name = name;
    this.transports = new Map();
    this.producers = new Map();
    this.consumers = new Map();
  }

  addTransport(transport) {
    this.transports.set(transport.id, transport);
  }

  addProducer(producer) {
    this.producers.set(producer.id, producer);
  }

  getTransport(transportId) {
    return this.transports.get(transportId);
  }

  getProducer(producerId) {
    return this.producers.get(producerId);
  }

  addConsumer(consumer) {
    this.consumers.set(consumer.id, consumer);
  }

  close() {
    this.transports.forEach(transport => transport.close());
  }

  removeConsumer(consumerId) {
    this.consumers.delete(consumerId);
  }
}