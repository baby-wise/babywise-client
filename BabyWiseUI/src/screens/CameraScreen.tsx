import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, View, Platform, PermissionsAndroid, TouchableOpacity } from 'react-native';
import { RTCPeerConnection, RTCView, mediaDevices, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import { io , Socket } from 'socket.io-client';
import styles from '../styles/Styles';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

// --- CONFIGURACIÓN ---
const ROOM_ID = 'baby-room-1';

const CameraScreen = () => {
  const [localStream, setLocalStream] = useState<any>(null);
  const [status, setStatus] = useState('Inicializando...');
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const socket = useRef<Socket | null>(null);

  const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  useEffect(() => {
    const start = async () => {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        setStatus('Permisos denegados');
        return;
      }

      setStatus('Iniciando cámara...');
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: { width: 640, height: 480, frameRate: 30 , facingMode: 'environment' },
      });
      setLocalStream(stream);
      setStatus('Cámara activa. Conectando al servidor...');

      socket.current = io(SIGNALING_SERVER_URL);
      setupSocketListeners(stream);
    };

    start();

    return () => {
      localStream?.getTracks().forEach((track: any) => track.stop());
      socket.current?.disconnect();
      peerConnections.current.forEach(pc => pc.close());
    };
  }, []);

  const setupSocketListeners = (stream: any) => {
    socket.current?.on('connect', () => {
      setStatus('Conectado. Esperando monitores...');
      socket.current?.emit('join-room', ROOM_ID);
    });

    socket.current?.on('peer-joined', ({ peerId }) => {
      setStatus(`Monitor ${peerId} se unió. Creando oferta...`);
      createPeerConnection(peerId, stream);
    });

    socket.current?.on('answer', async ({ sdp, sourcePeerId }) => {
      setStatus(`Respuesta recibida de ${sourcePeerId}.`);
      const pc = peerConnections.current.get(sourcePeerId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    });

    socket.current?.on('ice-candidate', ({ candidate, sourcePeerId }) => {
      const pc = peerConnections.current.get(sourcePeerId);
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });
  };

  const createPeerConnection = async (peerId: string, stream: any) => {
    const pc = new RTCPeerConnection(configuration);
    peerConnections.current.set(peerId, pc);

    stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

    (pc as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        socket.current?.emit('ice-candidate', {
          candidate: event.candidate,
          targetPeerId: peerId,
        });
      }
    };

    const offer = await (pc as any).createOffer();
    await pc.setLocalDescription(offer);
    socket.current?.emit('offer', { sdp: offer, targetPeerId: peerId });
  };
  
  const requestPermissions = async () => {
    // ... (función de permisos sin cambios)
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        return (
          granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  return (
    <SafeAreaView style={cameraStyles.container}>
      <Text style={cameraStyles.statusText}>{status}</Text>
      {localStream && (
        <>
          <RTCView
            streamURL={localStream.toURL()}
            style={cameraStyles.video}
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

const cameraStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' },
  statusText: { position: 'absolute', top: 40, color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 5, zIndex: 1 },
  video: { width: '100%', height: '100%' },
});

const stopTransmitting = () => {
}

export default CameraScreen;
