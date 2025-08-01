
import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View, FlatList } from 'react-native';
import { LiveKitRoom, useTracks, VideoTrack, AudioSession, registerGlobals, isTrackReference } from '@livekit/react-native';
import { Track } from 'livekit-client';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

const CameraScreen = ({ route }) => {
  const { group, cameraName } = route.params;
  const navigation = useNavigation();
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState('Inicializando...');
  const [error, setError] = useState(null);
  const ROOM_ID = `baby-room-${group.id}`;
  // Construye la URL WebSocket correctamente, evitando doble puerto
  let wsUrl;
  try {
    const urlObj = new URL(SIGNALING_SERVER_URL);
    wsUrl = `ws://${urlObj.hostname}:7880`;
  } catch {
    wsUrl = SIGNALING_SERVER_URL.replace(/^http/, 'ws').replace(/:\d+$/, ':7880');
  }

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
          serverUrl={wsUrl}
          token={token}
          connect={true}
          audio={true}
          video={true}
          options={{
            adaptiveStream: { pixelDensity: 'screen' },
          }}
        >
          <RoomView setStatus={setStatus} />
        </LiveKitRoom>
      )}
    </SafeAreaView>
  );
};

const RoomView = ({ setStatus }) => {
  const tracks = useTracks([Track.Source.Camera]);
  // Mostrar solo el track local (de esta cámara)
  const localTrack = tracks.find(t => t.participant.isLocal);
  useEffect(() => {
    if (localTrack) {
      setStatus('En vivo');
    }
  }, [localTrack, setStatus]);
  return (
    <View style={styles.tracksContainer}>
      {localTrack ? (
        <VideoTrack trackRef={localTrack} style={styles.video} />
      ) : (
        <Text style={{ color: 'white', marginTop: 20 }}>Esperando transmisión local...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    width: '100%',
    height: 300,
    marginVertical: 10,
  },
  tracksContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center'
  },
});

export default CameraScreen;