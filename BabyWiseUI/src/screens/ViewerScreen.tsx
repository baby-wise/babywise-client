import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { RTCPeerConnection, RTCView, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import { io as ioViewer, Socket } from 'socket.io-client';
import styles from '../styles/Styles';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

// --- CONFIGURACIÓN ---
const VIEWER_ROOM_ID = 'baby-room-1';

const ViewerScreen = () => {
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [status, setStatus] = useState('Inicializando...');
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const socket = useRef<Socket | null>(null);

  const configurationViewer = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  useEffect(() => {
    socket.current = ioViewer(SIGNALING_SERVER_URL);
    
    socket.current.on('connect', () => {
        setStatus('Conectado. Esperando stream de la cámara...');
        socket.current?.emit('join-room', VIEWER_ROOM_ID);
    });

    socket.current.on('offer', async ({ sdp, sourcePeerId }) => {
        setStatus(`Oferta recibida de ${sourcePeerId}. Creando respuesta...`);
        peerConnection.current = new RTCPeerConnection(configurationViewer);

        peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));

        peerConnection.current.ontrack = (event: any) => {
            if(event.streams && event.streams[0]){
                setRemoteStream(event.streams[0]);
                setStatus('¡Conectado al bebé!');
            }
        };

        peerConnection.current.onicecandidate = event => {
            if (event.candidate) {
                socket.current?.emit('ice-candidate', {
                    candidate: event.candidate,
                    targetPeerId: sourcePeerId,
                });
            }
        };

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.current.emit('answer', { sdp: answer, targetPeerId: sourcePeerId });
    });

    socket.current.on('ice-candidate', ({ candidate }) => {
        if (peerConnection.current && candidate) {
            peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
    });

    return () => {
        socket.current?.disconnect();
        if (peerConnection.current) {
            peerConnection.current.close();
        }
    };
  }, []);

  return (
      <SafeAreaView style={viewerStyles.container}>
        <Text style={viewerStyles.statusText}>{status}</Text>
        {remoteStream ? (
          <>
            <RTCView
              streamURL={remoteStream.toURL()}
              style={viewerStyles.video}
              objectFit={'cover'}
            />
            <TouchableOpacity style={styles.stopButton} onPress={stopViewing} activeOpacity={0.7}>
              <Text style={styles.stopButtonText}>Dejar de visualizar</Text>
            </TouchableOpacity>
          </>
        ) : (
        <View style={viewerStyles.placeholder}>
          <Text style={viewerStyles.placeholderText}>Esperando video...</Text>
        </View>
        )}
      </SafeAreaView>
  );
};

const stopViewing = () => {}

const viewerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', alignItems: 'center', justifyContent: 'center' },
  statusText: { position: 'absolute', top: 40, color: 'white', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 5, zIndex: 1 },
  video: { width: '100%', height: '100%' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: 'white', fontSize: 20 },
});

export default ViewerScreen;