
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { LiveKitRoom, useTracks, VideoTrack, AudioSession, registerGlobals, isTrackReference } from '@livekit/react-native';
import { Track } from 'livekit-client';
import axios from 'axios';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

const ViewerScreen = ({ route, navigation }) => {
  const { group } = route.params;
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState('Inicializando...');
  const [error, setError] = useState(null);
  const ROOM_ID = `baby-room-${group.id}`;
  let wsUrl = 'wss://babywise-jqbqqsgq.livekit.cloud';

  registerGlobals();
  useEffect(() => {
    let isMounted = true;
    const fetchToken = async () => {
      setStatus('Obteniendo token...');
      try {
        const res = await axios.get(`${SIGNALING_SERVER_URL}/getToken`, {
          params: {
            roomName: ROOM_ID,
            participantName: `viewer-${Date.now()}`,
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
  }, []);

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
            adaptiveStream: { pixelDensity: 'screen' },
            autoSubscribe: false,
          }}
        >
          <RoomView />
        </LiveKitRoom>
      )}
    </SafeAreaView>
  );
};


import { useRemoteParticipants, useRoomContext } from '@livekit/react-native';

const RoomView = () => {
  const room = useRoomContext();
  const tracks = useTracks([Track.Source.Camera]);
  const remoteParticipants = useRemoteParticipants();
  // Filtrar solo participantes que son cámaras
  const cameraTracks = tracks.filter(t => t.participant.identity && t.participant.identity.startsWith('camera-'));
  const cameraParticipants = Array.from(new Set(cameraTracks.map(t => t.participant.identity)));
  const [selectedCamera, setSelectedCamera] = useState(cameraParticipants[0] || null);

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
      {selectedTrack ? (
        <>
          <VideoTrack trackRef={selectedTrack} style={styles.video} />
          <Text style={styles.cameraNameLabel}>{selectedCamera.replace('camera-', '')}</Text>
        </>
      ) : (
        <Text style={{ color: 'white', marginTop: 20 }}>Esperando transmisión de cámara...</Text>
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