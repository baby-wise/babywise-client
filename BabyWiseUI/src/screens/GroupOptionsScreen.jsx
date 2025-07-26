import React from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';

const GroupOptionsScreen = ({ navigation, route }) => {
  const { group } = route.params;

  const goToViewer = () => {
    navigation.navigate('ViewerSelector', { group });
  };

  const goToCamera = () => {
    navigation.navigate('Camera', { group });
  };

  const addMembers = () => {
    // Handler vacío por ahora
    console.log('Agregar miembros pressed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>{group.name}</Text>
      <Text style={styles.subtitle}>{group.members} miembros</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.optionButton} 
          onPress={goToViewer}
        >
          <Text style={styles.optionButtonText}>Ver Cámaras</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.optionButton} 
          onPress={goToCamera}
        >
          <Text style={styles.optionButtonText}>Ser Cámara</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.optionButton, styles.membersButton]} 
          onPress={addMembers}
        >
          <Text style={styles.optionButtonText}>Agregar Miembros</Text>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 50,
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  optionButton: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 20,
    width: '80%',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  membersButton: {
    backgroundColor: '#4CAF50',
  },
  optionButtonText: {
    color: '#3E5F8A',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default GroupOptionsScreen;
