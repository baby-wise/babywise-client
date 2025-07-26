import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { RTCPeerConnection, RTCView, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import styles from '../styles/Styles';

const ViewerScreen = ({ navigation, route }) => {
  const { group, selectedCameras, socket, roomId } = route.params;
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('Conectando...');
  const peerConnection = useRef(null);
  const configurationViewer = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  useEffect(() => {
    if (!socket) return;
    
    setStatus('Iniciando transmisión...');
    socket.emit('start-stream', {group: roomId, socketId: socket.id, role: 'viewer'});

    socket.on('offer', async ({ sdp, sourcePeerId }) => {
        setStatus(`Oferta recibida de ${sourcePeerId}. Creando respuesta...`);
        peerConnection.current = new RTCPeerConnection(configurationViewer);

        peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));

        peerConnection.current.ontrack = (event) => {
            if(event.streams && event.streams[0]){
                setRemoteStream(event.streams[0]);
                setStatus('¡Conectado al bebé!');
            }
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {
                    candidate: event.candidate,
                    targetPeerId: sourcePeerId,
                });
            }
        };

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.emit('answer', { sdp: answer, targetPeerId: sourcePeerId });
    });

    socket.on('ice-candidate', ({ candidate }) => {
        if (peerConnection.current && candidate) {
            peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
    });

    return () => {
        if (peerConnection.current) {
            peerConnection.current.close();
        }
    };
  }, [socket, roomId]);

  const stopViewing = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    navigation.goBack();
  };

  return (
      <SafeAreaView style={viewerStyles.container}>
        <Text style={viewerStyles.title}>{group.name}</Text>
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
          <Text style={viewerStyles.placeholderText}>Esperando conexión...</Text>
          <Text style={viewerStyles.selectedText}>
            Cámara: {Array.isArray(selectedCameras) ? selectedCameras.join(', ') : selectedCameras}
          </Text>
        </View>
        )}
      </SafeAreaView>
  );
};

const viewerStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  title: {
    position: 'absolute',
    top: 80,
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  statusText: {
    position: 'absolute',
    top: 40,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  placeholderText: {
    color: 'white',
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  selectedText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
});
export default ViewerScreen;