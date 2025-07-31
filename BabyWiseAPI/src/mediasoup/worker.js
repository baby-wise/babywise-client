import * as mediasoup from 'mediasoup';
import { config } from './config.js';

let workers = [];
let nextWorkerIdx = 0;

export const createWorkers = async () => {
  const numWorkers = 1;

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: config.worker.logLevel,
      logTags: config.worker.logTags,
      rtcMinPort: config.worker.rtcMinPort,
      rtcMaxPort: config.worker.rtcMaxPort,
    });

    worker.on('died', () => {
      console.error(`Mediasoup worker ${worker.pid} ha muerto. Saliendo...`);
      // En un entorno de producción, deberías tener una estrategia de reinicio.
      process.exit(1);
    });

    workers.push(worker);
    console.log(`-> Mediasoup worker ${worker.pid} creado.`);
  }
};

export const getMediasoupWorker = () => {
  const worker = workers[nextWorkerIdx];
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return worker;
};
