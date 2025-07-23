import { initializeApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyBtyd316gOvtc8ftgsDDtSkmgB68x0PvSA',
  authDomain: 'babywise-auth.firebaseapp.com',
  projectId: 'babywise-auth',
  storageBucket: 'babywise-auth.firebasestorage.app',
  messagingSenderId: '1011273483061',
  appId: '1:1011273483061:android:a43a4e11857486c2a3827c',
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firebase Auth
const auth = getAuth(app);

export { auth };
