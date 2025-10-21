import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import Video from 'react-native-video';
import { GlobalStyles, Colors } from '../styles/Styles';

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
    
    // Formatear fecha y hora igual que en RecordingsList
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const [year, month, day] = recording.date.split('-');
    const monthName = months[parseInt(month) - 1];
    const formattedTime = recording.time.replace(/_/g, ':');
    
    titleText = `${parseInt(day)} de ${monthName} de ${year} a las ${formattedTime}`;
    
    if (recording.duration) {
      subtitleText = `Duración: ${recording.duration}s`;
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
        {/* Título minimalista */}
        <Text style={styles.title}>{titleText}</Text>
        {subtitleText && <Text style={styles.subtitle}>{subtitleText}</Text>}

        <View style={styles.videoContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
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
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    backgroundColor: Colors.overlay,
    zIndex: 10,
  },
  loadingText: {
    color: Colors.white,
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.secondary,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorSubtext: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  errorButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionsContainer: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionHint: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  liveButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  liveButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RecordingPlayerScreen;
