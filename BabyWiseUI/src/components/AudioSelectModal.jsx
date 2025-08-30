import React, { useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Button, StyleSheet, Alert } from 'react-native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import { useSocket } from '../contexts/SocketContext';

const AudioSelectModal = ({ visible, onClose, group, cameraIdentity, onPlay }) => {
  const [audios, setAudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) return;
    const fetchAudios = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${SIGNALING_SERVER_URL}/audios?room=baby-room-${group.id}`);
        const data = await res.json();
        setAudios(data.audios || []);
      } catch (err) {
        setError('Error cargando audios');
      } finally {
        setLoading(false);
      }
    };
    fetchAudios();
  }, [visible, group.id]);

  const [selectedAudio, setSelectedAudio] = useState(null);

  const handlePlay = () => {
    if (!selectedAudio) {
      Alert.alert('Selecciona un audio');
      return;
    }
    onPlay(selectedAudio);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Selecciona un audio</Text>
          {loading ? (
            <ActivityIndicator size="large" />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : (
            <FlatList
              data={audios}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.item, selectedAudio?.key === item.key && styles.selectedItem]}
                  onPress={() => setSelectedAudio(item)}
                >
                  <Text style={styles.itemText}>{item.key.replace(`audio/baby-room-${group.id}/`, '')}</Text>
                </TouchableOpacity>
              )}
            />
          )}
          <View style={styles.buttonRow}>
            <Button title="Cancelar" onPress={onClose} color="#888" />
            <Button title="Reproducir" onPress={handlePlay} color="#007bff" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '85%', maxHeight: '80%' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  item: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  selectedItem: { backgroundColor: '#e6f0ff' },
  itemText: { fontSize: 16, color: 'black' },
  error: { color: 'red', marginTop: 16 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
});

export default AudioSelectModal;
