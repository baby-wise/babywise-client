import React, { useState } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';

const GroupOptionsScreen = ({ navigation, route }) => {
  const { group } = route.params;
  
  // Estados para el modal de agregar miembro
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const goToViewer = () => {
    navigation.navigate('ViewerSelector', { group });
  };

  const goToCamera = () => {
    navigation.navigate('Camera', { group });
  };

  // Función para mostrar toast
  const showSuccessToast = (message) => {
    setToastMessage(message);
    setShowToast(true);
    
    // Ocultar el toast después de 3 segundos
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  // Función para agregar miembro al grupo
  const addMemberToGroup = async (groupId, email) => {
    setIsAddingMember(true);
    try {
      /* 
      // TODO: Reemplazar con llamada real al backend
      // Esta función debería hacer una petición HTTP al backend:
      // 
      // const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${userToken}` // si usas tokens
      //   },
      //   body: JSON.stringify({
      //     email: email
      //   })
      // });
      // 
      // const result = await response.json();
      // 
      // El backend debería devolver información del miembro agregado:
      // { success: true, member: { email: string, name: string } }
      // o un error si el usuario no existe o ya es miembro
      */
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mostrar toast de éxito
      showSuccessToast(`Miembro ${email} agregado exitosamente`);
      
      return { success: true };
    } catch (error) {
      console.error('Error adding member:', error);
      Alert.alert('Error', 'No se pudo agregar el miembro. Inténtalo de nuevo.');
      throw error;
    } finally {
      setIsAddingMember(false);
    }
  };

  const addMembers = () => {
    setShowAddMemberModal(true);
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim()) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }
    
    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(memberEmail.trim())) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }
    
    try {
      await addMemberToGroup(group.id, memberEmail.trim());
      setShowAddMemberModal(false);
      setMemberEmail('');
    } catch (error) {
      // Error ya manejado en addMemberToGroup
    }
  };

  const cancelAddMember = () => {
    setShowAddMemberModal(false);
    setMemberEmail('');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Botón de volver minimalista */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>‹</Text>
      </TouchableOpacity>
      
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

      {/* Modal para agregar miembro */}
      <Modal
        visible={showAddMemberModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelAddMember}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Agregar Miembro</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Email del miembro"
              placeholderTextColor="#999"
              value={memberEmail}
              onChangeText={setMemberEmail}
              autoFocus={true}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={cancelAddMember}
                disabled={isAddingMember}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButton, isAddingMember && styles.disabledButton]} 
                onPress={handleAddMember}
                disabled={isAddingMember}
              >
                {isAddingMember ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addButtonText}>Agregar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast de éxito */}
      {showToast && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
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
});

export default GroupOptionsScreen;
