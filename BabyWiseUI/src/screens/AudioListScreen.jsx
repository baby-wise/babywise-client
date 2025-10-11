import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Button, StyleSheet, Alert, SafeAreaView } from 'react-native';

import { pick } from '@react-native-documents/picker';
import Video from 'react-native-video';
import { useNavigation, useRoute } from '@react-navigation/native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import { GlobalStyles, Colors } from '../styles/Styles';

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
      <View style={GlobalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.primary, marginTop: 16, fontWeight: 'bold', fontSize: 18, textAlign: 'center' }}>Cargando audios...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={GlobalStyles.loadingContainer}>
        <Text style={{ color: Colors.secondary, fontWeight: 'bold', fontSize: 18, marginBottom: 20 }}>{error}</Text>
        <TouchableOpacity 
          style={[GlobalStyles.button, GlobalStyles.buttonPrimary]} 
          onPress={() => navigation.goBack()}
        >
          <Text style={GlobalStyles.buttonText}>Volver</Text>
        </TouchableOpacity>
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
    <View style={GlobalStyles.itemRow}>
      <TouchableOpacity style={[GlobalStyles.optionList, GlobalStyles.card]}onPress={() => handleSelect(audio)}>
        <Text style={GlobalStyles.cardTitle}>
          {audio.key.replace(`audio/${room}/`, '')}
          {playingAudio && playingAudio.key === audio.key ? '  🔊' : ''}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={GlobalStyles.deleteButton} onPress={() => handleDeleteAudio(audio)}>
        <Text >❌</Text>
      </TouchableOpacity>
    </View>
  );


  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View>
        <TouchableOpacity style={GlobalStyles.backButton} onPress={() => navigation.goBack()}>
          <Text style={GlobalStyles.backButtonText}>‹</Text>
        </TouchableOpacity>
      </View>
      
      <View style={GlobalStyles.optionList}>
      {audios.length === 0 ? (
        <View>
          <Text style={GlobalStyles.title}>Audios</Text>
          <Text style={GlobalStyles.cardSubtitle}>No hay audios disponibles.</Text>
        </View>
      ) : (
        <FlatList
          data={audios}
          keyExtractor={item => item.key}
          renderItem={renderAudioItem}
          ListHeaderComponent={
             <Text style={[GlobalStyles.title, { textAlign: "center", marginBottom: 20 }]}>
              Audios
              </Text>
          }
          contentContainerStyle={{
            flexGrow: 1,                  
            justifyContent: "center",     
            alignItems: "center",         
            paddingBottom: 20,
          }}
        />
      )}
      <TouchableOpacity style={GlobalStyles.fab} onPress={handleUploadAudio}>
        <Text style={GlobalStyles.fabText}>+</Text>
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
    </View>
    </SafeAreaView>
  );
};

export default AudioListScreen;
