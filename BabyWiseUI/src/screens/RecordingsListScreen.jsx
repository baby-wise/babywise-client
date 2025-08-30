import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Button, StyleSheet } from 'react-native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

const RecordingsListScreen = ({ navigation, route }) => {
  const { room } = route.params;
  const [recordingsByParticipant, setRecordingsByParticipant] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${SIGNALING_SERVER_URL}/recordings?room=${room}`);
        const data = await res.json();
        console.log('[UI] Grabaciones recibidas:', data);
        setRecordingsByParticipant(data.recordingsByParticipant || []);
      } catch (err) {
        setError('Error cargando grabaciones');
      } finally {
        setLoading(false);
      }
    };
    fetchRecordings();
  }, [room]);


  const handleSelect = (rec) => {
    navigation.navigate('RecordingPlayerScreen', { recording: rec });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grabaciones disponibles</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={recordingsByParticipant}
          keyExtractor={(item) => item.participant}
          renderItem={({ item }) => (
            <View style={styles.participantBlock}>
              <Text style={styles.participantTitle}>Cámara: {item.participant.replace('camera-', '')}</Text>
              <FlatList
                data={item.recordings}
                keyExtractor={(rec) => rec.key}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
                    <Text style={styles.itemText}>Fecha: {item.date}, Hora: {item.time} ({item.duration ? item.duration + 's' : 'sin duración'})</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        />
      )}
      <View style={{ marginTop: 32, width: '100%' }}>
        <Button title="Volver" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3E5F8A',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 10,
    borderRadius: 8,
  },
  participantBlock: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  participantTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#3E5F8A',
    marginBottom: 8,
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontSize: 16,
    color: '#3E5F8A',
  },
  error: {
    color: 'red',
    marginTop: 16,
  },
});

export default RecordingsListScreen;
