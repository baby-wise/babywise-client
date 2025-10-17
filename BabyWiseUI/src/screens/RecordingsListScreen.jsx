import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Button, StyleSheet, SafeAreaView } from 'react-native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import { GlobalStyles } from '../styles/Styles';

const RecordingsListScreen = ({ navigation, route }) => {
  const { room, babyName } = route.params;
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
      <View style={GlobalStyles.optionList}>
        {loading ? (
          <ActivityIndicator size="large" />
        ) : recordingsByParticipant.length === 0 ? (
          <View>
            <Text style={GlobalStyles.title}>
              {babyName ? `Grabaciones de ${babyName}` : 'Grabaciones'}
            </Text>
            <Text style={GlobalStyles.cardSubtitle}>No hay grabaciones disponibles</Text>
          </View>
        ) : (
            <FlatList
               data={recordingsByParticipant}
               keyExtractor={(item) => item.participant}
               ListHeaderComponent={
                  <Text style={[GlobalStyles.title, { textAlign: "center", marginBottom: 20 }]}>
                    {babyName ? `Grabaciones de ${babyName}` : 'Grabaciones'}
                  </Text>
                }
               contentContainerStyle={{
                   flexGrow: 1,                  
                   justifyContent: "center",     
                   alignItems: "center",         
                   paddingBottom: 20,
               }}
               renderItem={({ item }) => (
                 <View style={{ marginBottom: 20, alignItems: "center" }}>
                   <Text style={GlobalStyles.optionButtonText}>
                     Cámara: {item.participant.replace("camera-", "")}
                   </Text>
                   <FlatList
                     data={item.recordings}
                     keyExtractor={(rec) => rec.key}
                     contentContainerStyle={{ paddingBottom: 20, alignItems: "center" }}
                     renderItem={({ item }) => (
                       <TouchableOpacity
                         style={GlobalStyles.item}
                         onPress={() => handleSelect(item)}
                       >
                         <Text style={GlobalStyles.cardSubtitle}>
                           Fecha: {item.date}, Hora: {item.time} (
                           {item.duration ? item.duration + "s" : "sin duración"})
                         </Text>
                       </TouchableOpacity>
                     )}
                   />
                 </View>
               )}
             />
        )}
      </View>
    </SafeAreaView>

  );
};

export default RecordingsListScreen;
