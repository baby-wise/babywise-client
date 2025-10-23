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
  const [expandedBabies, setExpandedBabies] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

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

  // Función para agrupar grabaciones por mes y año
  const groupRecordingsByMonth = (recordings) => {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const grouped = {};
    
    recordings.forEach(rec => {
      const [year, month] = rec.date.split('-');
      const monthName = months[parseInt(month) - 1];
      const key = `${month}-${year}`; // Formato: "02-2025"
      
      if (!grouped[key]) {
        grouped[key] = {
          displayName: `${monthName} de ${year}`, // Formato: "Febrero de 2025"
          recordings: []
        };
      }
      grouped[key].recordings.push(rec);
    });

    // Ordenar por fecha (más reciente primero)
    Object.keys(grouped).forEach(key => {
      grouped[key].recordings.sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.time.replace(/_/g, ':'));
        const dateB = new Date(b.date + ' ' + b.time.replace(/_/g, ':'));
        return dateB - dateA;
      });
    });

    return grouped;
  };

  const toggleBaby = (babyName) => {
    setExpandedBabies(prev => ({
      ...prev,
      [babyName]: !prev[babyName]
    }));
  };

  const toggleMonth = (babyName, monthKey) => {
    const key = `${babyName}-${monthKey}`;
    setExpandedMonths(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
          recordingsByParticipant.map((participantData) => {
            const babyDisplayName = participantData.participant.replace("camera-", "");
            const isBabyExpanded = expandedBabies[babyDisplayName];
            const groupedByMonth = groupRecordingsByMonth(participantData.recordings);

            return (
              <View key={participantData.participant} style={styles.participantSection}>
                {/* Acordeón del bebé */}
                {!babyName && (
                  <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => toggleBaby(babyDisplayName)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.babyName}>{babyDisplayName}</Text>
                    <MaterialDesignIcons 
                      name={isBabyExpanded ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color="#64748B" 
                    />
                  </TouchableOpacity>
                )}

                {/* Contenido expandible del bebé */}
                {(babyName || isBabyExpanded) && (
                  <View style={styles.accordionContent}>
                    {Object.entries(groupedByMonth).map(([monthKey, monthData]) => {
                      const monthExpandKey = `${babyDisplayName}-${monthKey}`;
                      const isMonthExpanded = expandedMonths[monthExpandKey];

                      return (
                        <View key={monthKey} style={styles.monthSection}>
                          {/* Acordeón del mes */}
                          <TouchableOpacity
                            style={styles.monthHeader}
                            onPress={() => toggleMonth(babyDisplayName, monthKey)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.monthName}>{monthData.displayName}</Text>
                            <MaterialDesignIcons 
                              name={isMonthExpanded ? "chevron-up" : "chevron-down"} 
                              size={22} 
                              color="#64748B" 
                            />
                          </TouchableOpacity>

                          {/* Contenido expandible del mes */}
                          {isMonthExpanded && (
                            <View style={styles.monthContent}>
                              {monthData.recordings.map((recording) => (
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
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
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
    paddingHorizontal: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  participantSection: {
    marginBottom: 8,
  },
  // Estilos para acordeón del bebé
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  babyName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  accordionContent: {
    paddingLeft: 8,
  },
  // Estilos para acordeón del mes
  monthSection: {
    marginBottom: 4,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  monthName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
  },
  monthContent: {
    paddingLeft: 8,
    paddingTop: 8,
  },
  // Estilos de las tarjetas de grabación (sin cambios)
  recordingCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    marginBottom: 12,
    padding: 0,
    borderWidth: 0,
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
