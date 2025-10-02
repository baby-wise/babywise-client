import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Button, StyleSheet } from 'react-native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import { GlobalStyles } from '../styles/Styles';

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
    <View style={GlobalStyles.container}>
      <View>
        <TouchableOpacity style={GlobalStyles.backButton} onPress={() => navigation.goBack()}>
          <Text style={GlobalStyles.backButtonText}>‹</Text>
        </TouchableOpacity>
      </View>
      <Text style={GlobalStyles.title}>Grabaciones disponibles</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : recordingsByParticipant ? (
        <View style={GlobalStyles.optionList}>
          <Text style={GlobalStyles.cardSubtitle}>No hay grabaciones disponibles</Text>
        </View>
      ):(
        <FlatList
          data={recordingsByParticipant}
          keyExtractor={(item) => item.participant}
          renderItem={({ item }) => (
            <View style={[GlobalStyles.optionList]}>
              <Text style={GlobalStyles.optionButtonText}>Cámara: {item.participant.replace('camera-', '')}</Text>
              <FlatList
                data={item.recordings}
                keyExtractor={(rec) => rec.key}
                renderItem={({ item }) => (
                  <TouchableOpacity style={GlobalStyles.item} onPress={() => handleSelect(item)}>
                    <Text style={GlobalStyles.cardSubtitle}>Fecha: {item.date}, Hora: {item.time} ({item.duration ? item.duration + 's' : 'sin duración'})</Text>
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

export default RecordingsListScreen;
