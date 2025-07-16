import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Role } from '../../App'; // Importando el tipo desde App.tsx

interface HomeScreenProps {
  setRole: (role: Role) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ setRole }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Baby Monitor</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => setRole('camera')}>
          <Text style={styles.buttonText}>Soy la Cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setRole('viewer')}>
          <Text style={styles.buttonText}>Soy el Monitor</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginVertical: 10,
    width: 250,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeScreen;

