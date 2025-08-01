import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, FlatList } from 'react-native';
import { LiveKitRoom, useTracks, AudioSession, registerGlobals, isTrackReference } from '@livekit/react-native';
import { Track } from 'livekit-client';
import axios from 'axios';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

const ViewerSelectorScreen = ({ navigation, route }) => {
  const { group } = route.params;
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [status, setStatus] = useState('Inicializando...');
  const [token, setToken] = useState(null);
  const ROOM_ID = `baby-room-${group.id}`;
  let wsUrl;
  try {
    const urlObj = new URL(SIGNALING_SERVER_URL);
    wsUrl = `ws://${urlObj.hostname}:7880`;
  } catch {
    wsUrl = SIGNALING_SERVER_URL.replace(/^http/, 'ws').replace(/:\d+$/, ':7880');
  }

  registerGlobals();
  React.useEffect(() => {
    AudioSession.startAudioSession();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  // Fetch token for subscription only
  React.useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await axios.get(`${SIGNALING_SERVER_URL}/getToken`, {
          params: {
            roomName: ROOM_ID,
            participantName: `viewer-${Date.now()}`,
          },
        });
        setToken(res.data.token);
        setStatus('Conectado, buscando cámaras...');
      } catch (err) {
        setStatus(`Error obteniendo token: ${err.message}`);
      }
    };
    fetchToken();
  }, [ROOM_ID]);

  const startViewing = () => {
    if (!selectedParticipant) {
      setStatus('Por favor selecciona una cámara');
      return;
    }
    navigation.navigate('Viewer', { group, participantIdentity: selectedParticipant });
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Seleccionar Cámara</Text>
      <Text style={styles.groupName}>{group.name}</Text>
      <Text style={styles.statusText}>{status}</Text>
      <View style={styles.selectorContainer}>
        {token ? (
          <LiveKitRoom
            serverUrl={wsUrl}
            token={token}
            connect={true}
            audio={false}
            video={false}
            options={{ adaptiveStream: { pixelDensity: 'screen' } }}
          >
            <ParticipantList
              selectedParticipant={selectedParticipant}
              setSelectedParticipant={setSelectedParticipant}
              setStatus={setStatus}
            />
          </LiveKitRoom>
        ) : (
          <Text style={{ color: '#333', marginBottom: 20 }}>Obteniendo token...</Text>
        )}
        <TouchableOpacity
          onPress={startViewing}
          style={styles.startButton}
          disabled={!selectedParticipant}
        >
          <Text style={styles.startButtonText}>Iniciar Visualización</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const ParticipantList = ({ selectedParticipant, setSelectedParticipant, setStatus }) => {
  const tracks = useTracks([Track.Source.Camera]);
  // Agrupa por participante
  const participants = Array.from(new Set(tracks.map(t => t.participant.identity)));
  React.useEffect(() => {
    if (participants.length > 0) {
      setStatus('Seleccione una cámara');
    } else {
      setStatus('No hay cámaras disponibles');
    }
  }, [participants, setStatus]);
  return (
    <FlatList
      data={participants}
      keyExtractor={item => item}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.cameraItem, selectedParticipant === item && styles.cameraItemSelected]}
          onPress={() => setSelectedParticipant(item)}
        >
          <Text style={styles.cameraLabel}>{item}</Text>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3E5F8A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  groupName: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  statusText: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 30,
    textAlign: 'center',
  },
  selectorContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  dropdown: {
    marginTop: 20,
    marginBottom: 20,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraItem: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
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
});

export default ViewerSelectorScreen;
