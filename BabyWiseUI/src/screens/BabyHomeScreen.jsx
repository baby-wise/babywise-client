import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  TouchableOpacity,
  View
} from 'react-native';


const BabyHomeScreen = ({ navigation, route }) => {
  const { group, userName, babyName } = route.params || {};
  const goToViewer = () => {
    navigation.navigate('Viewer', { group, userName });
  };

  const goToCamera = () => {
    navigation.navigate('Camera', { group, cameraName: babyName, userName });
  };

  const goToStatistics = () => {
    navigation.navigate('Statistics', { group, babyName });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Botón de volver minimalista */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>‹</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>{babyName? babyName: "Error No Baby Name sent"}</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.optionButton} 
          onPress={goToViewer}
        >
          <Text style={styles.optionButtonText}>Ver a {babyName}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.optionButton} 
          onPress={goToCamera}
        >
          <Text style={styles.optionButtonText}>Ser Cámara</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.optionButton} 
          onPress={() => navigation.navigate('MediaOptionsScreen', { group })}
        >
          <Text style={styles.optionButtonText}>Ver archivos multimedia</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.optionButton, styles.statisticsButton]} 
          onPress={goToStatistics}
        >
          <Text style={styles.optionButtonText}>Ver Estadísticas</Text>
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
  backButton: {
    position: 'absolute',
    top: 20,
    left: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 15,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  settingsButtonText: {
    fontSize: 24,
    color: '#fff',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  toastContainer: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  toggle: {
    width: 50,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleCircleActive: {
    transform: [{ translateX: 24 }],
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  codeContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3E5F8A',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
    letterSpacing: 2,
  },
  copyButton: {
    backgroundColor: '#E8F4FD',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  copyButtonText: {
    color: '#3E5F8A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
});

  

export default BabyHomeScreen;
