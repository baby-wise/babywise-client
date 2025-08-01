import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import ConsumerService from '../services/ConsumerService';

const ViewerScreen = ({ route }) => {
  const { group, selectedPeerId } = route.params;
  // Use a ref for the stream to keep a stable instance.
  const mediaStreamRef = useRef(new MediaStream());
  // Use state to trigger re-renders when the stream changes.
  const [streamVersion, setStreamVersion] = useState(0);
  const [status, setStatus] = useState('Inicializando...');
  const consumerService = useRef(null);
  const ROOM_ID = `baby-room-${group.id}`;

  useEffect(() => {
    consumerService.current = new ConsumerService(ROOM_ID);

    const start = async () => {
      try {
        // 1. Conectar al servidor de señalización
        setStatus('Conectando al servidor...');
        await consumerService.current.connect();

        // 2. Unirse a la sala, cargar el 'Device' y obtener productores existentes
        setStatus('Uniéndose a la sala...');
        const { producerIds } = await consumerService.current.joinRoom(selectedPeerId);

        // 3. Crear el transporte de recepción
        setStatus('Creando transporte...');
        await consumerService.current.createRecvTransport();

        if (producerIds && producerIds.length > 0) {
          setStatus(`Encontrados ${producerIds.length} productores. Consumiendo...`);
          await Promise.all(producerIds.map(id => consumeProducer(id)));
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
        const consumer = await consumerService.current.consume(producerId);
        console.log('Consumer creado:', consumer);
        
        const { track } = consumer;

        if (track) {
          console.log(`[consumeProducer] Track recibido: kind=${track.kind}, id=${track.id}`);
          // Add the track to the existing stream object.
          mediaStreamRef.current.addTrack(track);
          // Force a re-render by updating state.
          setStreamVersion(prev => prev + 1);
          setStatus('Recibiendo stream...');
        }
      } catch (error) {
        console.error(`Error al consumir productor ${producerId}:`, error);
        setStatus(`Error al consumir productor: ${error.message}`);
      }
    };

    start();

    // Función de limpieza
    return () => {
      console.log('Cleaning up ViewerScreen...');
      consumerService.current?.close();
      // Stop all tracks and clear the stream.
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = new MediaStream();
      setStreamVersion(0); // Reset version on cleanup.
    };
  }, [group.id, selectedPeerId]);

  const mediaStream = mediaStreamRef.current;

  return (
    <View style={styles.container}>
      {mediaStream && mediaStream.getVideoTracks().length > 0 ? (
        <RTCView
          key={streamVersion} // Force re-render of RTCView when stream changes
          streamURL={mediaStream.toURL()}
          style={styles.video}
          objectFit={'cover'}
        />
      ) : (
        <>
          <Text style={styles.statusText}>{status}</Text>
          <Text style={styles.warningText}>
            {status === 'Recibiendo stream...' ? 'Recibiendo solo audio...' : 'No se está recibiendo video. Verifica la transmisión.'}
          </Text>
        </>
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
    height: '100%',
  },
  statusText: {
    color: 'white',
    textAlign: 'center',
    padding: 10,
    fontSize: 18,
  },
  warningText: {
    color: 'red',
    textAlign: 'center',
    padding: 10,
  }
});

export default ViewerScreen;