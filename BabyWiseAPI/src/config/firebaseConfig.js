import * as firebaseAdmin  from 'firebase-admin';
import { readFileSync } from 'node:fs' //Para leer archivos

//FireBase configuration
export const admin = firebaseAdmin.default;
const serviceAccount = JSON.parse(readFileSync('./firebase.json', 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log('Firebase Admin SDK inicializado correctamente.');