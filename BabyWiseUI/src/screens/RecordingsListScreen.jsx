import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Button, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import Video from 'react-native-video';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import { GlobalStyles, Colors } from '../styles/Styles';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';

const RecordingsListScreen = ({ navigation, route }) => {
  const { room, babyName } = route.params;
  const [recordingsByParticipant, setRecordingsByParticipant] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedVideos, setLoadedVideos] = useState({});

  // Función para formatear la fecha y hora en un solo texto
  const formatDateTime = (dateString, timeString) => {
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    const [year, month, day] = dateString.split('-');
    const monthName = months[parseInt(month) - 1];
    
    // Reemplazar guiones bajos con dos puntos (hh_mm_ss -> hh:mm:ss)
    const formattedTime = timeString.replace(/_/g, ':');
    
    return `${parseInt(day)} de ${monthName} de ${year} a las ${formattedTime}`;
  };

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${SIGNALING_SERVER_URL}/recordings?room=${room}`);
        const data = await res.json();
        let recordings = data.recordingsByParticipant || [];
        
        // Si se recibe babyName, filtrar solo las grabaciones de ese bebé
        if (babyName) {
          recordings = recordings.filter(item => {
            const participantName = item.participant.replace("camera-", "");
            return participantName === babyName;
          });
        }
        
        setRecordingsByParticipant(recordings);
      } catch (err) {
        setError('Error cargando grabaciones');
      } finally {
        setLoading(false);
      }
    };
    fetchRecordings();
  }, [room, babyName]);


  const handleSelect = (rec) => {
    navigation.navigate('RecordingPlayerScreen', { recording: rec });
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View>
        <TouchableOpacity style={GlobalStyles.backButton} onPress={() => navigation.goBack()}>
          <Text style={GlobalStyles.backButtonText}>‹</Text>
        </TouchableOpacity>
      </View>
      
      {/* Título */}
      <Text style={styles.title}>
        {babyName ? `Grabaciones de ${babyName}` : 'Grabaciones'}
      </Text>
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : recordingsByParticipant.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={GlobalStyles.cardSubtitle}>No hay grabaciones disponibles</Text>
          </View>
        ) : (
          recordingsByParticipant.map((participantData) => (
            <View key={participantData.participant} style={styles.participantSection}>
              {!babyName && (
                <Text style={styles.participantTitle}>
                  {participantData.participant.replace("camera-", "")}
                </Text>
              )}
              
              {participantData.recordings.map((recording) => (
                <TouchableOpacity
                  key={recording.key}
                  style={styles.recordingCard}
                  onPress={() => handleSelect(recording)}
                  activeOpacity={0.7}
                >
                  {/* Video pausado como thumbnail */}
                  <View style={styles.thumbnailContainer}>
                    <Video
                      source={{ uri: recording.playlistUrl }}
                      style={[
                        styles.videoThumbnail,
                        !loadedVideos[recording.key] && { opacity: 0 }
                      ]}
                      paused={true}
                      muted={true}
                      resizeMode="cover"
                      controls={false}
                      disableFocus={true}
                      playInBackground={false}
                      playWhenInactive={false}
                      hideShutterView={true}
                      onLoad={() => setLoadedVideos(prev => ({ ...prev, [recording.key]: true }))}
                    />
                    {/* Placeholder mientras carga */}
                    {!loadedVideos[recording.key] && (
                      <View style={styles.videoPlaceholder} />
                    )}
                    {/* Overlay con ícono de play */}
                    <View style={styles.playOverlay}>
                      <MaterialDesignIcons name="play-circle-outline" size={56} color="#FFFFFF" />
                    </View>
                    {/* Capa extra para bloquear completamente los controles */}
                    <View style={styles.controlBlocker} />
                  </View>
                  
                  {/* Información de la grabación */}
                  <View style={styles.recordingInfo}>
                    <Text style={styles.recordingDate}>
                      {formatDateTime(recording.date, recording.time)}
                    </Text>
                    {recording.duration && (
                      <Text style={styles.recordingDuration}>
                        Duración: {recording.duration}s
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 18,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  participantSection: {
    marginBottom: 24,
  },
  participantTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  recordingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEFF1',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: '#E6EEF8',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  videoPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    pointerEvents: 'none',
  },
  controlBlocker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  recordingInfo: {
    paddingHorizontal: 4,
  },
  recordingDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  recordingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  recordingDuration: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
});

export default RecordingsListScreen;
