
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AudioSelectModal from '../components/AudioSelectModal';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { LiveKitRoom, useTracks, VideoTrack, AudioSession, registerGlobals, isTrackReference } from '@livekit/react-native';
import { Track } from 'livekit-client';
import axios from 'axios';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import { useSocket } from '../contexts/SocketContext';

const ViewerScreen = ({ route, navigation }) => {
  const { group, userName } = route.params || {};
  const socket = useSocket();
  const ROOM_ID = `${group.id}`;
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState('Inicializando...');
  const [error, setError] = useState(null);
  let wsUrl = 'wss://babywise-jqbqqsgq.livekit.cloud';

  // Unirse a la sala como viewer cuando el socket esté listo
  useEffect(() => {
    if (socket && socket.connected) {
      socket.emit('join-room', {
        group: ROOM_ID,
        role: 'viewer'
      });
    }
  }, [socket, ROOM_ID]);

  registerGlobals();
  useEffect(() => {
    let isMounted = true;
    const fetchToken = async () => {
      setStatus('Obteniendo token...');
      try {
        const res = await axios.get(`${SIGNALING_SERVER_URL}/getToken`, {
          params: {
            roomName: ROOM_ID,
            participantName: `viewer-${userName || Date.now()}`,
          },
        });
        if (isMounted) {
          setToken(res.data.token);
          setStatus('Conectando a LiveKit...');
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
  }, [userName]);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
        <Text style={styles.backButtonText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{group.name}</Text>
      <Text style={styles.statusText}>{status}</Text>
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      {token && (
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          connect={true}
          audio={true}
          video={false}
          options={{
            adaptiveStream: { pixelDensity: 'screen' }
          }}
          connectOptions={{
            autoSubscribe: false
          }}
        >
          <RoomView
            navigation={navigation}
            group={group}
            userName={userName}
            socket={socket}
          />
        </LiveKitRoom>
      )}
    </SafeAreaView>
  );
};




import { useRemoteParticipants, useRoomContext, useLocalParticipant } from '@livekit/react-native';

const RoomView = ({ navigation, group, userName, socket }) => {
  // Audio modal y reproducción
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [reproduciendoAudio, setReproduciendoAudio] = useState(false);
  // Escuchar eventos de audio para mostrar/ocultar botón detener
  useEffect(() => {
    if (!socket) return;
    const handlePlayAudio = () => setReproduciendoAudio(true);
    const handleStopAudio = () => setReproduciendoAudio(false);
    socket.on('play-audio', handlePlayAudio);
    socket.on('stop-audio', handleStopAudio);
    return () => {
      socket.off('play-audio', handlePlayAudio);
      socket.off('stop-audio', handleStopAudio);
    };
  }, [socket]);

  // Función para enviar play-audio
  const handlePlayAudio = (audio) => {
    if (!socket) {
      Alert.alert('Error', 'No hay conexión con el servidor');
      return;
    }
    const cameraIdentity = selectedCamera;
    if (!cameraIdentity) {
      Alert.alert('Error', 'No hay cámara seleccionada');
      return;
    }
    socket.emit('play-audio', {
      group: `baby-room-${group.id}`,
      cameraIdentity,
      audioUrl: audio.url,
    });
    setReproduciendoAudio(true);
    setAudioModalVisible(false);
  };

  // Función para enviar stop-audio
  const handleStopAudio = () => {
    if (!socket) {
      Alert.alert('Error', 'No hay conexión con el servidor');
      return;
    }
    const cameraIdentity = selectedCamera;
    if (!cameraIdentity) {
      Alert.alert('Error', 'No hay cámara seleccionada');
      return;
    }
    socket.emit('stop-audio', {
      group: `baby-room-${group.id}`,
      cameraIdentity,
    });
    setReproduciendoAudio(false);
  };
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera]);
  const remoteParticipants = useRemoteParticipants();
  const localParticipant = useLocalParticipant().localParticipant;
  // Filtrar solo participantes que son cámaras
  const cameraTracks = tracks.filter(t => t.participant.identity && t.participant.identity.startsWith('camera-'));
  const cameraParticipants = Array.from(new Set(cameraTracks.map(t => t.participant.identity)));
  const [selectedCamera, setSelectedCamera] = useState(cameraParticipants[0] || null);
  const [isTalking, setIsTalking] = useState(false);
  const [speakingViewers, setSpeakingViewers] = useState([]); // array de identities
  // Escuchar eventos de mute/unmute de viewers
  useEffect(() => {
    if (!room) return;
    // Handler para mute/unmute
    const handleTrackMuted = (publication, participant) => {
      if (participant.identity && participant.identity.startsWith('viewer')) {
        setSpeakingViewers(prev => prev.filter(id => id !== participant.identity));
      }
    };
    const handleTrackUnmuted = (publication, participant) => {
      if (participant.identity && participant.identity.startsWith('viewer')) {
        setSpeakingViewers(prev => {
          if (!prev.includes(participant.identity)) {
            return [...prev, participant.identity];
          }
          return prev;
        });
      }
    };
    room.on('trackMuted', handleTrackMuted);
    room.on('trackUnmuted', handleTrackUnmuted);
    // Inicializar con los viewers que ya están desmuteados
    remoteParticipants.forEach((participant) => {
      if (participant.identity && participant.identity.startsWith('viewer')) {
        participant.trackPublications.forEach((pub) => {
          if (pub.kind === 'audio' && !pub.isMuted) {
            setSpeakingViewers(prev => {
              if (!prev.includes(participant.identity)) {
                return [...prev, participant.identity];
              }
              return prev;
            });
          }
        });
      }
    });
    return () => {
      room.off('trackMuted', handleTrackMuted);
      room.off('trackUnmuted', handleTrackUnmuted);
    };
  }, [room, remoteParticipants]);

  // Suscribirse solo a audio y video de cámaras
  useEffect(() => {
    if (!room) return;
    // Para tracks publicados después de conectar
    const handleTrackPublished = (publication, participant) => {
      if (participant.identity && participant.identity.startsWith('camera')) {
        // Suscribirse a audio y video
        if (publication.kind === 'audio' || publication.kind === 'video') {
          publication.setSubscribed(true);
        }
      }
    };
    room.on('trackPublished', handleTrackPublished);

    // Para tracks publicados antes de conectar
    remoteParticipants.forEach((participant) => {
      if (participant.identity && participant.identity.startsWith('camera')) {
        participant.trackPublications.forEach((publication) => {
          if (publication.kind === 'audio' || publication.kind === 'video') {
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
    if (cameraParticipants.length > 0 && !selectedCamera) {
      setSelectedCamera(cameraParticipants[0]);
    }
    if (cameraParticipants.length === 0 && selectedCamera) {
      setSelectedCamera(null);
    }
  }, [cameraParticipants.length]);

  // Push-to-talk handlers

  // Helper para obtener el primer publication del Map
  const getFirstAudioPub = () => {
    const pubs = localParticipant?.audioTrackPublications;
    if (pubs) {
      const arr = Array.from(pubs.values());
      return arr.length > 0 ? arr[0] : undefined;
    }
    return undefined;
  };

  const handlePressIn = () => {
    const pub = getFirstAudioPub();
    if (pub) {
      console.log('[PushToTalk] Unmuting local audio track');
      try {
        pub.unmute();
        setIsTalking(true);
      } catch (e) {
        console.error('[PushToTalk] Error al desmutear:', e);
      }
    } else {
      console.warn('[PushToTalk] No se encontró publication para desmutear');
    }
  };

  const handlePressOut = () => {
    const pub = getFirstAudioPub();
    if (pub && typeof pub.mute === 'function') {
      console.log('[PushToTalk] Muting local audio track');
      try {
        pub.mute();
        setIsTalking(false);
      } catch (e) {
        console.error('[PushToTalk] Error al mutear:', e);
      }
    } else {
      console.warn('[PushToTalk] No se encontró publication para mutear');
    }
  };

  // Mutear cualquier audioTrackPublication local apenas se publique
  useEffect(() => {
    const pubs = localParticipant?.audioTrackPublications;
    if (pubs) {
      Array.from(pubs.values()).forEach(pub => {
        if (pub && !pub.isMuted) {
          console.log('[PushToTalk] Muting local audio track (auto on publish)', pub);
          try {
            pub.mute();
          } catch (e) {
            console.error('[PushToTalk] Error al mutear en auto-mute:', e);
          }
        }
      });
    } else {
      console.warn('[PushToTalk] No se encontró publication para auto-mute');
    }
  }, [localParticipant?.audioTrackPublications?.size]);

  const selectedTrack = cameraTracks.find(t => t.participant.identity === selectedCamera);



  return (
    <View style={styles.tracksContainer}>
      {cameraParticipants.length > 1 && (
        <View style={styles.cameraButtonsRow}>
          <FlatList
            data={cameraParticipants}
            keyExtractor={item => item}
            horizontal
            contentContainerStyle={{ alignItems: 'center', paddingVertical: 0 }}
            style={{ maxHeight: 48, marginBottom: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.cameraItem, selectedCamera === item && styles.cameraItemSelected]}
                onPress={() => setSelectedCamera(item)}
              >
                <Text style={styles.cameraLabel}>{item.replace('camera-', '')}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
      {/* Mostrar nombres de viewers hablando */}
      {speakingViewers.length > 0 && (
        <View style={{ marginBottom: 12, alignItems: 'center' }}>
          <Text style={{ color: '#00FF00', fontWeight: 'bold', fontSize: 18 }}>
            {speakingViewers.length === 1
              ? `Hablando: ${speakingViewers[0].replace('viewer-', '')}`
              : `Hablando: ${speakingViewers.map(id => id.replace('viewer-', '')).join(', ')}`}
          </Text>
        </View>
      )}
      {selectedTrack ? (
        <>
          <VideoTrack trackRef={selectedTrack} style={styles.video} />
          <Text style={styles.cameraNameLabel}>{selectedCamera.replace('camera-', '')}</Text>
        </>
      ) : (
        <Text style={{ color: 'white', marginTop: 20 }}>Esperando transmisión de cámara...</Text>
      )}
      {selectedCamera && (
        <TouchableOpacity
          style={{
            marginTop: 24,
            backgroundColor: isTalking ? '#007AFF' : '#aaa',
            padding: 18,
            borderRadius: 32,
            alignSelf: 'center',
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 20 }}>🎙️ </Text>
            {isTalking ? 'Hablando...' : 'Mantener para hablar'}
          </Text>
        </TouchableOpacity>
      )}
      {selectedTrack && !reproduciendoAudio && (
        <TouchableOpacity style={[styles.audioButton, { marginTop: 18 }]} onPress={() => setAudioModalVisible(true)}>
          <Text style={styles.audioButtonText}>🎵 Reproducir audio</Text>
        </TouchableOpacity>
      )}
      {selectedTrack && reproduciendoAudio && (
        <TouchableOpacity style={[styles.stopButton, { marginTop: 18 }]} onPress={handleStopAudio}>
          <Text style={styles.stopButtonText}>⏹ Detener audio</Text>
        </TouchableOpacity>
      )}
      <AudioSelectModal
        visible={audioModalVisible}
        onClose={() => setAudioModalVisible(false)}
        group={group}
        cameraIdentity={selectedCamera}
        onPlay={handlePlayAudio}
      />
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
  audioButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  audioButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  stopButton: {
    backgroundColor: '#d9534f',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  stopButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tracksContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
  video: {
    width: '100%',
    height: 260,
    marginTop: 10,
    marginBottom: 0,
    alignSelf: 'center',
    borderRadius: 12,
    backgroundColor: '#222',
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
  },
  cameraButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 8,
    marginBottom: 0,
  },
  cameraItem: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#eee',
    marginHorizontal: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
    minHeight: 36,
    minWidth: 36,
  },
  cameraItemSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  cameraLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  cameraNameLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default ViewerScreen;