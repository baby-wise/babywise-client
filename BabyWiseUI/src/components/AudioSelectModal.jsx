import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

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
        const res = await fetch(`${SIGNALING_SERVER_URL}/audios?room=${group.id}`);
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

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.popup} 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : audios.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay audios disponibles</Text>
            </View>
          ) : (
            audios.map((audio) => (
              <TouchableOpacity
                key={audio.key}
                style={styles.audioOption}
                onPress={() => {
                  onPlay(audio);
                  onClose();
                }}
              >
                <Text style={styles.audioOptionText}>
                  {audio.key.replace(`audio/${group.id}/`, '').replace(/\.[^/.]+$/, '')}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 180,
  },
  popup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 240,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  audioOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
    marginHorizontal: 4,
  },
  audioOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#d9534f',
    textAlign: 'center',
  },
  emptyContainer: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});

export default AudioSelectModal;
