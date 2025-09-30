import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { GlobalStyles} from '../styles/Styles';

const MediaOptionsScreen = ({ navigation, route }) => {
  const { group } = route.params;
  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View>
      <TouchableOpacity style={GlobalStyles.backButton} onPress={() => navigation.goBack()}>
        <Text style={GlobalStyles.backButtonText}>‹</Text>
      </TouchableOpacity>
      </View>
      <View style={GlobalStyles.optionList}>
      <Text style={GlobalStyles.title}>Archivos multimedia</Text>
      <TouchableOpacity
        style={GlobalStyles.optionButton}
        onPress={() => navigation.navigate('RecordingsListScreen', { room: `baby-room-${group.id}` })}
      >
        <Text style={GlobalStyles.optionButtonText}>Ver videos</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={GlobalStyles.optionButton}
        onPress={() => navigation.navigate('AudioListScreen', { room: `baby-room-${group.id}` })}
      >
        <Text style={GlobalStyles.optionButtonText}>Ver audios</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3E5F8A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  button: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    marginVertical: 12,
    width: 220,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    color: '#3E5F8A',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MediaOptionsScreen;
