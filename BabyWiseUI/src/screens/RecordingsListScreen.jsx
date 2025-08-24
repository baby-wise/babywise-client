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
      <Button title="Volver" onPress={() => navigation.goBack()} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  participantBlock: { marginBottom: 24 },
  participantTitle: { fontSize: 17, fontWeight: 'bold', color: '#007AFF', marginBottom: 8 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemText: { fontSize: 16, color: '#007AFF' },
  error: { color: 'red', marginTop: 16 },
});

export default RecordingsListScreen;
