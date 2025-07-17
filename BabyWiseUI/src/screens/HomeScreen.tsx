import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Role } from '../../App'; // Importando el tipo desde App.tsx
import styles from '../styles/Styles';

interface HomeScreenProps {
  setRole: (role: Role) => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ setRole }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Baby Monitor</Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => setRole('camera')}>
          <Text style={styles.buttonText}>Cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => setRole('viewer')}>
          <Text style={styles.buttonText}>Viewer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

