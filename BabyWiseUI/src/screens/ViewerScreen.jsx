import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import MediasoupService from '../services/mediaSoupService';

const ViewerScreen = ({ route }) => {
  const { group } = route.params;
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [status, setStatus] = useState('Inicializando...');
  const mediasoupService = useRef(null);
  const ROOM_ID = `baby-room-${group.id}`;

  useEffect(() => {
    mediasoupService.current = new MediasoupService(ROOM_ID);

    const start = async () => {
      try {
        // 1. Conectar al servidor de señalización
        setStatus('Conectando al servidor...');
        await mediasoupService.current.connect();

        // 2. Unirse a la sala, cargar el 'Device' y obtener productores existentes
        setStatus('Uniéndose a la sala...');
        const { producerIds } = await mediasoupService.current.joinRoom();

        // 3. Crear el transporte de recepción
        setStatus('Creando transporte...');
        await mediasoupService.current.createRecvTransport();
        
        // 4. Consumir los productores que ya existen en la sala
        if (producerIds && producerIds.length > 0) {
          setStatus(`Encontrados ${producerIds.length} productores. Consumiendo...`);
          for (const producerId of producerIds) {
            await consumeProducer(producerId);
          }
        } else {
          setStatus('Esperando a que la cámara comience a transmitir...');
        }
        
      } catch (error) {
        console.error('Error en el proceso de inicio del visor:', error);
        setStatus(`Error: ${error.message}`);
      }
    };

    const consumeProducer = async (producerId) => {
      try {
        const consumer = await mediasoupService.current.consume(producerId);
        const { track, kind } = consumer;
        if (kind === 'video') {
          console.log('Track de video:', track);
          console.log('Track readyState:', track.readyState);
          const audioTrack = Array.from(remoteStreams.values())
              .flatMap(stream => stream.getAudioTracks())[0];
          const newStream = audioTrack ? new MediaStream([track, audioTrack]) : new MediaStream([track]);
          setRemoteStreams(prevStreams => {
            const newStreams = new Map(prevStreams);
            newStreams.set(producerId, newStream);
            return newStreams;
          });
          setStatus('Recibiendo stream de video...');
        } else if (kind === 'audio') {
          // Solo cambia el status si no hay video
          setRemoteStreams(prevStreams => {
            if ([...prevStreams.values()].some(s => s.getVideoTracks().length > 0)) {
              return prevStreams;
            }
            return prevStreams;
          });
          if (![...remoteStreams.values()].some(s => s.getVideoTracks().length > 0)) {
            setStatus('Recibiendo stream de audio...');
          }
        }
      } catch (error) {
        console.error(`Error al consumir productor ${producerId}:`, error);
      }
    };

    start();

    // Función de limpieza
    return () => {
      mediasoupService.current?.close();
    };
  }, []);

  const videoStream = Array.from(remoteStreams.values()).find(
    stream => stream.getVideoTracks().length > 0
  );

  console.log('RTCView streamURL:', videoStream ? videoStream.toURL() : 'NO STREAM');
  console.log('Video tracks:', videoStream ? videoStream.getVideoTracks() : []);

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>{status}</Text>
      {videoStream && (
        <RTCView
          key={videoStream.id || Math.random()} // fuerza re-render si cambia el stream
          streamURL={videoStream.toURL()}
          style={styles.video}
          objectFit={'cover'}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%', // Prueba con toda la pantalla
    backgroundColor: '#111',
  },
  statusText: {
    color: 'white',
    position: 'absolute',
    top: 40,
    fontSize: 18,
  },
});

export default ViewerScreen;