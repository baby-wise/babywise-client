import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Platform, PermissionsAndroid, TouchableOpacity } from 'react-native';
import { RTCView, mediaDevices } from 'react-native-webrtc';
import MediasoupService from '../services/mediaSoupService'; // Importamos nuestro servicio

const CameraScreen = ({ navigation, route }) => {
  const { group } = route.params;
  const [localStream, setLocalStream] = useState(null);
  const [status, setStatus] = useState('Inicializando...');
  const mediasoupService = useRef(null);
  const ROOM_ID = `baby-room-${group.id}`;

  useEffect(() => {
    // Inicializar el servicio y la conexión
    mediasoupService.current = new MediasoupService(ROOM_ID);

    const start = async () => {
      try {
        // 1. Pedir permisos y obtener stream local
        setStatus('Pidiendo permisos...');
        const stream = await getLocalStream();

        // Log para depurar las pistas obtenidas
        if (stream) {
          console.log('Stream obtenido. Analizando pistas...');
          console.log('Todas las pistas (stream.getTracks()):', stream.getTracks());
          console.log('Número de pistas de video:', stream.getVideoTracks().length);
          console.log('Número de pistas de audio:', stream.getAudioTracks().length);
        } else {
          console.log('Error: getLocalStream() devolvió un stream nulo.');
        }

        if (!stream) {
          throw new Error('No se pudo obtener el stream local.');
        }
        const videoTrack = stream.getVideoTracks()[0];
        console.log('Camera video track:', videoTrack);
        console.log('enabled:', videoTrack.enabled, 'muted:', videoTrack.muted, 'readyState:', videoTrack.readyState);
        const audioTrack = stream.getAudioTracks()[0];
        if (!videoTrack || !audioTrack) {
          throw new Error('El stream obtenido no contiene las pistas de audio/video necesarias.');
        }
        // --- FIN DE LA VALIDACIÓN ---

        setLocalStream(stream);

        // 2. Conectar al servidor de señalización
        setStatus('Conectando al servidor...');
        await mediasoupService.current.connect();

        // 3. Unirse a la sala y cargar el 'Device'
        setStatus('Uniéndose a la sala...');
        await mediasoupService.current.joinRoom();

        // 4. Crear el transporte de envío
        setStatus('Creando transporte...');
        await mediasoupService.current.createSendTransport();

        // 5. Empezar a producir (enviar) el stream de video y audio
        // Ahora usamos las variables que ya validamos.
        setStatus('Transmitiendo...');
        await mediasoupService.current.produce(videoTrack);
        await mediasoupService.current.produce(audioTrack);
        setStatus('En vivo');

      } catch (error) {
        console.error('Error en el proceso de inicio de cámara:', error);
        // Mostramos el error en la UI para que sea más fácil de depurar.
        setStatus(`Error: ${error.message}`);
      }
    };

    start();

    // Función de limpieza al desmontar el componente
    return () => {
      console.log('Limpiando CameraScreen...');
      localStream?.getTracks().forEach((track) => track.stop());
      mediasoupService.current?.close();
    };
  }, []);

  const getLocalStream = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      throw new Error('Permisos de cámara/micrófono denegados');
    }
    // Simplificamos las restricciones de video para máxima compatibilidad.
    return await mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      return (
        granted['android.permission.CAMERA'] === 'granted' &&
        granted['android.permission.RECORD_AUDIO'] === 'granted'
      );
    }
    return true;
  };

  const stopTransmitting = () => {
    mediasoupService.current?.close();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{group.name}</Text>
      <Text style={styles.statusText}>{status}</Text>
      {localStream && (
        <>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.video}
            objectFit={'cover'}
            mirror={true}
          />
          <TouchableOpacity style={styles.stopButton} onPress={stopTransmitting}>
            <Text style={styles.stopButtonText}>Dejar de transmitir</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
};

// Estilos (sin cambios significativos, puedes usar los tuyos)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 40, left: 20, zIndex: 10 },
  backButtonText: { fontSize: 32, color: '#fff' },
  title: { position: 'absolute', top: 90, fontSize: 20, fontWeight: 'bold', color: 'white', backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius: 5, zIndex: 1 },
  statusText: { position: 'absolute', top: 40, color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 5, zIndex: 1 },
  video: { width: '100%', height: '100%' },
  stopButton: { position: 'absolute', bottom: 40, backgroundColor: 'red', padding: 15, borderRadius: 10 },
  stopButtonText: { color: 'white', fontWeight: 'bold' }
});

export default CameraScreen;