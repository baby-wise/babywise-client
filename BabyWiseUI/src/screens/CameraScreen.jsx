
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { LiveKitRoom, useTracks, VideoTrack, AudioSession, registerGlobals, isTrackReference } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import { useSocket } from '../contexts/SocketContext';
import Video from 'react-native-video';
import { auth } from '../config/firebase';

const CameraScreen = ({ route }) => {
  const { group, cameraName } = route.params;
  const navigation = useNavigation();
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState('Inicializando...');
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const socket = useSocket();
  const ROOM_ID = `${group.id}`;
  const [camaraMode, setCameraMode] = useState('user')
  // Unirse a la sala como cámara y escuchar eventos cuando el socket esté listo
  useEffect(() => {
    if (socket && socket.connected) {
      socket.emit('join-room', {
        group: ROOM_ID,
        role: 'camera',
        cameraIdentity: `${cameraName}`,
        groupId: group.id,
        UID: auth.currentUser.uid,
        baby: cameraName
      });
      const handlePlayAudio = ({ audioUrl }) => setAudioUrl(audioUrl);
      const handleStopAudio = () => setAudioUrl(null);
      socket.on('play-audio', handlePlayAudio);
      socket.on('stop-audio', handleStopAudio);
      return () => {
        // Cuando se desmonta el componente, notificar que la cámara se desconecta
        socket.emit('camera-disconnect', {
          groupId: group.id,
          cameraName: cameraName
        });
        socket.off('play-audio', handlePlayAudio);
        socket.off('stop-audio', handleStopAudio);
      };
    }
  }, [socket, ROOM_ID, cameraName]);
  // Construye la URL WebSocket correctamente, evitando doble puerto
  let wsUrl = 'wss://babywise-jqbqqsgq.livekit.cloud'

  registerGlobals();
  useEffect(() => {
    let isMounted = true;
    const fetchToken = async () => {
      setStatus('Obteniendo token...');
      try {
        const res = await axios.get(`${SIGNALING_SERVER_URL}/getToken`, {
          params: {
            roomName: ROOM_ID,
            participantName: `camera-${cameraName}`,
          },
        });
        if (isMounted) {
          setToken(res.data.token);
          setStatus('Conectando...');
        }
      } catch (err) {
        setStatus(`Error: ${err.message}`);
      }
    };
    fetchToken();
    AudioSession.startAudioSession();
    return () => {
      isMounted = false;
      AudioSession.stopAudioSession();
    };
  }, [cameraName]);
  const handleChangeFacingMode = ()=>{
    console.log("Cambiando el facing mode, original en:", camaraMode)
    const cambiar = camaraMode === 'user' ? 'environment' : 'user';
    console.log("Cambiando a: ", cambiar  )
    setCameraMode(cambiar)

  }
  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{group.name}</Text>
      <Text style={styles.statusText}>{status}</Text>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      {token && (
        <LiveKitRoom
          key={camaraMode}
          serverUrl={wsUrl}
          token={token}
          connect={true}
          audio={{
            echoCancellation: true
          }}
          video={{ facingMode: camaraMode}}
          options={{
            adaptiveStream: { pixelDensity: 'screen' }
          }}
          connectOptions={{
            autoSubscribe: false
          }}
        >
          <RoomView setStatus={setStatus} />
        </LiveKitRoom>
      )}
      <TouchableOpacity
          style={styles.rotateButton}
          onPress={()=> handleChangeFacingMode()}
      >
        <Text>{'🔄'}</Text>
      </TouchableOpacity>
      {/* Reproductor de audio oculto, solo cuando hay audioUrl */}
      {audioUrl && (
        <Video
          source={{ uri: audioUrl }}
          audioOnly
          paused={false}
          onEnd={() => setAudioUrl(null)}
          onError={e => {
            setAudioUrl(null);
            setStatus('Error al reproducir audio');
          }}
          style={{ width: 0, height: 0 }}
        />
      )}
    </SafeAreaView>
  );
};

import { useRemoteParticipants, useRoomContext } from '@livekit/react-native';

const RoomView = ({ setStatus }) => {
  const room = useRoomContext();
  const videoTracks = useTracks([Track.Source.Camera]);
  const localVideoTrack = videoTracks.find(t => t.participant.isLocal);
  const remoteParticipants = useRemoteParticipants();

  // Suscribirse solo al audio de los viewers
  useEffect(() => {
    if (!room) return;
    // Para tracks publicados después de conectar
    const handleTrackPublished = (publication, participant) => {
      if (participant.identity && participant.identity.startsWith('viewer')) {
        if (publication.kind === 'audio') {
          publication.setSubscribed(true);
        }
      }
    };
    room.on('trackPublished', handleTrackPublished);

    // Para tracks publicados antes de conectar
    remoteParticipants.forEach((participant) => {
      if (participant.identity && participant.identity.startsWith('viewer')) {
        participant.trackPublications.forEach((publication) => {
          if (publication.kind === 'audio') {
            publication.setSubscribed(true);
          }
        });
      }
    });

    return () => {
      room.off('trackPublished', handleTrackPublished);
    };
  }, [room, remoteParticipants]);

  useEffect(() => {
    if (localVideoTrack) {
      setStatus('En vivo');
    }
  }, [localVideoTrack, setStatus]);

  return (
    <View style={styles.tracksContainer}>
      {localVideoTrack ? (
        <VideoTrack 
          trackRef={localVideoTrack} 
          style={styles.video} 
          objectFit="cover"
        />
      ) : (
        <Text style={styles.waitingText}>Esperando transmisión local...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rotateButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 25,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 32,
    color: '#fff',
  },
  title: {
    position: 'absolute',
    top: 90,
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
    flex: 1,
    width: '100%',
    height: '100%',
  },
  tracksContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
  },
});

export default CameraScreen;