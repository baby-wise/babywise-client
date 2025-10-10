import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import Video from 'react-native-video';
import { GlobalStyles } from '../styles/Styles';

const RecordingPlayerScreen = ({ navigation, route }) => {
  const { recording, recordingUrl, eventType, babyName, eventDate, groupId, userName } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Determinar el origen de los datos
  const isFromNotification = !!recordingUrl;
  const isFromRecordingsList = !!recording;

  // Extraer la URL del video según el origen
  let videoUrl = null;
  let titleText = '';
  let subtitleText = '';

  if (isFromNotification && recordingUrl) {
    // Viene desde una notificación
    videoUrl = recordingUrl;
    titleText = `Evento: ${eventType || 'Detección'}`;
    
    if (babyName) {
      subtitleText = `${babyName}`;
    }
    
    if (eventDate) {
      const date = new Date(eventDate);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString();
      subtitleText += subtitleText ? ` - ${formattedDate} ${formattedTime}` : `${formattedDate} ${formattedTime}`;
    }
  } else if (isFromRecordingsList && recording?.playlistUrl) {
    // Viene desde la lista de grabaciones
    videoUrl = recording.playlistUrl;
    titleText = 'Grabación';
    subtitleText = `Fecha: ${recording.date || 'N/A'}, Hora: ${recording.time || 'N/A'}`;
    
    if (recording.duration) {
      subtitleText += ` (${recording.duration}s)`;
    }
  }

  console.log('[RecordingPlayer] Origen:', isFromNotification ? 'Notificación' : 'Lista');
  console.log('[RecordingPlayer] Video URL:', videoUrl);
  console.log('[RecordingPlayer] Params:', route.params);

  // Si no hay URL válida, mostrar error
  if (!videoUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={GlobalStyles.backButton} onPress={() => navigation.goBack()}>
            <Text style={GlobalStyles.backButtonText}>‹</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No hay grabación disponible</Text>
          <Text style={styles.errorSubtext}>
            La grabación no está disponible o no se pudo encontrar.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={GlobalStyles.backButton} onPress={() => navigation.goBack()}>
          <Text style={GlobalStyles.backButtonText}>‹</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{titleText}</Text>
          {subtitleText && <Text style={styles.subtitle}>{subtitleText}</Text>}
        </View>

        <View style={styles.videoContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6EDC8A" />
              <Text style={styles.loadingText}>Cargando grabación...</Text>
            </View>
          )}
          
          {error && (
            <View style={styles.loadingContainer}>
              <Text style={styles.errorText}>Error al cargar el video</Text>
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={() => {
                  setError(false);
                  setLoading(true);
                }}
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          <Video
            source={{ uri: videoUrl }}
            controls
            style={styles.video}
            resizeMode="contain"
            onLoadStart={() => {
              console.log('[Video] Cargando...');
              setLoading(true);
            }}
            onLoad={() => {
              console.log('[Video] Cargado exitosamente');
              setLoading(false);
              setError(false);
            }}
            onError={(e) => {
              console.error('[Video] Error:', e);
              setLoading(false);
              setError(true);
            }}
          />
        </View>

        {isFromNotification && groupId && (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionHint}>
              ¿Quieres ver al bebé en vivo?
            </Text>
            <TouchableOpacity 
              style={styles.liveButton}
              onPress={() => {
                // Navegar a la pantalla de viewer con el grupo correspondiente
                const userNameToUse = userName || 'anonimo';
                console.log('[RecordingPlayer] Navegando a Viewer con groupId:', groupId, 'userName:', userNameToUse);
                navigation.navigate('Viewer', { 
                  group: { id: groupId }, 
                  userName: userNameToUse 
                });
              }}
            >
              <Text style={styles.liveButtonText}>Ver en vivo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorSubtext: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#6EDC8A',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#6EDC8A',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionsContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  actionHint: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 12,
  },
  liveButton: {
    backgroundColor: '#6EDC8A',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  liveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RecordingPlayerScreen;
