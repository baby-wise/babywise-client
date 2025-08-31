import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Button, StyleSheet, Alert } from 'react-native';

import { pick } from '@react-native-documents/picker';
import Video from 'react-native-video';
import { useNavigation, useRoute } from '@react-navigation/native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

const AudioListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { room } = route.params;
  const [audios, setAudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [paused, setPaused] = useState(false);

  const handleSelect = (audio) => {
    if (playingAudio && playingAudio.key === audio.key) {
      setPlayingAudio(null);
      setPaused(false);
    } else {
      setPlayingAudio(audio);
      setPaused(false);
    }
  };

  const handleUploadAudio = async () => {
    try {
      const [file] = await pick({
        type: ['audio/*'],
        allowMultiSelection: false,
      });
      if (!file) return;
      const formData = new FormData();
      formData.append('file', {
        uri: file.fileCopyUri || file.uri,
        name: file.name || 'audio.m4a',
        type: file.type || 'audio/mpeg',
      });
      formData.append('room', room);
      formData.append('fileName', file.name || 'audio.m4a');
      setLoading(true);
      console.log('[UPLOAD] Enviando FormData:', {
        uri: file.fileCopyUri || file.uri,
        name: file.name || 'audio.m4a',
        type: file.type || 'audio/mpeg',
        room
      });
      const uploadRes = await fetch(`${SIGNALING_SERVER_URL}/audios/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      let errorText = '';
      if (!uploadRes.ok) {
        try {
          errorText = await uploadRes.text();
        } catch {}
        console.log('[UPLOAD] Error response:', errorText);
        throw new Error('Error al subir el audio: ' + errorText);
      }
      Alert.alert('Éxito', 'Audio subido correctamente');
      // Refrescar lista
      const data = await uploadRes.json();
      if (data.audios) setAudios(data.audios);
      else {
        const res = await fetch(`${SIGNALING_SERVER_URL}/audios?room=${room}`);
        const data2 = await res.json();
        setAudios(data2.audios || []);
      }
    } catch (err) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        Alert.alert('Error', err.message || 'No se pudo subir el audio');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!room)  {
      Alert.alert('Error', 'No se especificó la sala');
      return;
    }
    const fetchAudios = async () => {
      try
      {
        setLoading(true);
        setError(null);
        const res = await fetch(`${SIGNALING_SERVER_URL}/audios?room=${room}`);
        const data = await res.json();
        setAudios(data.audios || []);
      } catch (error) {
        setError('Error al cargar audios');
      } finally {
        setLoading(false);
      }
    };
    fetchAudios();
  }, [room]);


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{ color: '#fff', marginTop: 16, fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>Cargando audios...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: 'red', fontWeight: 'bold' }}>{error}</Text>
        <Button title="Volver" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const handleDeleteAudio = async (audio) => {
    Alert.alert(
      'Eliminar audio',
      '¿Estás seguro de que deseas eliminar este audio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive', onPress: async () => {
            try {
              setLoading(true);
              const res = await fetch(`${SIGNALING_SERVER_URL}/audios/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: audio.key, room }),
              });
              if (!res.ok) throw new Error('Error al eliminar el audio');
              // Refrescar lista
              const data = await res.json();
              if (data.audios) setAudios(data.audios);
              else {
                const res2 = await fetch(`${SIGNALING_SERVER_URL}/audios?room=${room}`);
                const data2 = await res2.json();
                setAudios(data2.audios || []);
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo eliminar el audio');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderAudioItem = ({ item: audio }) => (
    <View style={styles.itemRow}>
      <TouchableOpacity style={styles.item} onPress={() => handleSelect(audio)}>
        <Text style={styles.itemText}>
          {audio.key.replace(`audio/${room}/`, '')}
          {playingAudio && playingAudio.key === audio.key ? '  🔊' : ''}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteAudio(audio)}>
        <Text style={styles.trashEmoji}>❌</Text>
      </TouchableOpacity>
    </View>
  );


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audios</Text>
      {audios.length === 0 ? (
        <Text style={styles.emptyText}>No hay audios disponibles.</Text>
      ) : (
        <FlatList
          data={audios}
          keyExtractor={item => item.key}
          renderItem={renderAudioItem}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}
      <TouchableOpacity style={styles.fab} onPress={handleUploadAudio}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      {playingAudio && (
        <Video
          source={{ uri: playingAudio.url }}
          audioOnly
          paused={paused}
          onEnd={() => setPlayingAudio(null)}
          onError={e => {
            setPlayingAudio(null);
            Alert.alert('Error', 'No se pudo reproducir el audio');
          }}
          style={{ width: 0, height: 0 }}
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '98%',
    alignSelf: 'center',
    marginVertical: 0,
    paddingRight: 24,
    paddingLeft: 8,
  },
  deleteButton: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  trashEmoji: {
    fontSize: 28,
    color: '#e53935',
    marginLeft: 2,
    marginRight: 2,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#3E5F8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 32,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: 10,
    borderRadius: 8,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginVertical: 12,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  itemText: {
    color: '#3E5F8A',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    marginTop: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    opacity: 0.8,
  },
  fab: {
    backgroundColor: '#fff',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  fabText: {
    color: '#3E5F8A',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: -2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    alignSelf: 'center',
    paddingRight: 24,
    paddingLeft: 8,
    marginVertical: 0,
  },
  deleteButton: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
});

export default AudioListScreen;
