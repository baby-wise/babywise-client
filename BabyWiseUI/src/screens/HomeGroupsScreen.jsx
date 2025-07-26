import React, { useEffect, useState, useRef } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput
} from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../config/firebase';
import { signInWithCredential, GoogleAuthProvider, signOut } from '@react-native-firebase/auth';

const HomeGroupsScreen = ({ navigation }) => {
  const email = useRef();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayEmail, setDisplayEmail] = useState(null);
  const [groups, setGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Configurar Google Sign-In
    GoogleSignin.configure({
      webClientId: '1011273483061-7bl7mchini6fdosmf2ij6ngiep47e96a.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      scopes: ['profile', 'email'],
    });
    
    // Verificar si hay un usuario ya autenticado
    checkCurrentUser();
  }, []);

  // Función para cargar grupos del usuario
  const loadUserGroups = async (userEmail) => {
    setIsLoadingGroups(true);
    try {
      /* 
      // TODO: Reemplazar con llamada real al backend
      // Esta función debería hacer una petición HTTP al backend:
      // 
      // const response = await fetch(`${API_BASE_URL}/groups/user`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${userToken}` // si usas tokens
      //   },
      //   body: JSON.stringify({
      //     email: userEmail
      //   })
      // });
      // 
      // const groupsData = await response.json();
      // 
      // El backend debería devolver un array de objetos con esta estructura:
      // [
      //   { id: number, name: string, members: number },
      //   { id: number, name: string, members: number },
      //   ...
      // ]
      */
      
      // Datos hardcodeados por ahora - remover cuando se implemente el backend
      const mockGroups = [
        { id: 1, name: 'Casa Principal', members: 3 },
        { id: 2, name: 'Casa de Verano', members: 2 },
        { id: 3, name: 'Oficina', members: 5 }
      ];
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setGroups(mockGroups);
    } catch (error) {
      console.error('Error loading user groups:', error);
      // TODO: Mostrar mensaje de error al usuario
      setGroups([]); // En caso de error, mostrar lista vacía
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const checkCurrentUser = async () => {
    try {
      const currentUser = await GoogleSignin.getCurrentUser();
      console.log('checkCurrentUser - currentUser:', currentUser);
      if (currentUser) {
        setIsLoggedIn(true);
        email.current = currentUser.user.email;
        setDisplayEmail(currentUser.user.email);
        console.log('User already signed in:', email.current);
        
        // Cargar grupos del usuario autenticado
        await loadUserGroups(currentUser.user.email);
      } else {
        setIsLoggedIn(false);
        email.current = null;
        setDisplayEmail(null);
        setGroups([]); // Limpiar grupos si no hay usuario
        console.log('No user currently signed in');
      }
    } catch (error) {
      console.log('checkCurrentUser error:', error);
      setIsLoggedIn(false);
      email.current = null;
      setDisplayEmail(null);
      setGroups([]);
    }
  };

  const signIn = async () => {
    if (isLoggedIn === false) {
      setIsLoading(true);
      try {
        const currentUser = await GoogleSignin.signInSilently();
        setIsLoggedIn(true);
        email.current = currentUser.user.email;
        setDisplayEmail(currentUser.user.email);
        console.log('Silent sign in successful:', email.current);
        
        // Cargar grupos del usuario autenticado
        await loadUserGroups(currentUser.user.email);
      } catch (error) {
        try {
          await GoogleSignin.hasPlayServices();
          const userInfo = await GoogleSignin.signIn();
          
          console.log('Google Sign-In userInfo:', userInfo);
          console.log('userInfo.type:', userInfo.type);
          console.log('userInfo.data:', userInfo.data);
          
          if (userInfo.type === 'cancelled') {
            console.log('User cancelled the sign in process');
            setIsLoggedIn(false);
            setDisplayEmail(null);
            setIsLoading(false);
            return;
          }
          
          console.log('userInfo.data.user:', userInfo.data?.user);
          console.log('idToken:', userInfo.data?.idToken);
          console.log('accessToken:', userInfo.data?.accessToken);
          
          if (!userInfo.data?.idToken) {
            throw new Error('No idToken received from Google Sign-In');
          }
          
          if (!userInfo.data?.user?.email) {
            throw new Error('No user information received from Google Sign-In');
          }
          
          const googleCredential = GoogleAuthProvider.credential(userInfo.data.idToken);
          await signInWithCredential(auth, googleCredential);
          
          setIsLoggedIn(true);
          email.current = userInfo.data.user.email;
          setDisplayEmail(userInfo.data.user.email);
          console.log('Manual sign in successful:', email.current);
          
          // Cargar grupos del usuario autenticado
          await loadUserGroups(userInfo.data.user.email);
        } catch (signInError) {
          console.log('Sign in error:', signInError);
          console.log('Error message:', signInError.message);
          console.log('Error code:', signInError.code);
          setIsLoggedIn(false);
          
          if (signInError.message?.includes('SIGN_IN_CANCELLED') || signInError.message?.includes('cancelled')) {
            console.log('User cancelled the login flow');
          } else if (signInError.message?.includes('SIGN_IN_CURRENTLY_IN_PROGRESS') || signInError.message?.includes('in progress')) {
            console.log('Sign in is in progress already');
          } else if (signInError.message?.includes('PLAY_SERVICES_NOT_AVAILABLE') || signInError.message?.includes('Play Services')) {
            Alert.alert('Error', 'Google Play Services not available');
          } else if (signInError.message?.includes('network') || signInError.message?.includes('internet')) {
            Alert.alert('Error', 'No internet connection');
          } else {
            if (!signInError.message?.includes('No idToken received')) {
              Alert.alert('Error', `Something went wrong with sign in: ${signInError.message}`);
            }
            console.log('Full error:', signInError);
          }
        }
      }
      setIsLoading(false);
    } else {
      setIsLoading(true);
      try {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
        await signOut(auth);
        email.current = null;
        setDisplayEmail(null);
        setIsLoggedIn(false);
        setGroups([]); // Limpiar grupos al cerrar sesión
        console.log('Sign out successful');
      } catch (error) {
        console.error('Sign out error:', error);
        email.current = null;
        setDisplayEmail(null);
        setIsLoggedIn(false);
        setGroups([]);
      }
      setIsLoading(false);
    }
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

  // Función para crear un nuevo grupo
  const createNewGroup = async (groupName, userEmail) => {
    setIsCreatingGroup(true);
    try {
      /* 
      // TODO: Reemplazar con llamada real al backend
      // Esta función debería hacer una petición HTTP al backend:
      // 
      // const response = await fetch(`${API_BASE_URL}/groups/create`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${userToken}` // si usas tokens
      //   },
      //   body: JSON.stringify({
      //     name: groupName,
      //     creatorEmail: userEmail
      //   })
      // });
      // 
      // const newGroup = await response.json();
      // 
      // El backend debería devolver el grupo creado con esta estructura:
      // { id: number, name: string, members: number }
      */
      
      // Simular creación del grupo - remover cuando se implemente el backend
      const mockNewGroup = {
        id: Date.now(), // ID temporal usando timestamp
        name: groupName,
        members: 1 // El creador es el primer miembro
      };
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Agregar el nuevo grupo a la lista
      setGroups(prevGroups => [...prevGroups, mockNewGroup]);
      
      // Mostrar toast de éxito
      showSuccessToast(`Grupo "${groupName}" creado exitosamente`);
      
      return mockNewGroup;
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'No se pudo crear el grupo. Inténtalo de nuevo.');
      throw error;
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const createGroup = () => {
    if (!isLoggedIn) {
      Alert.alert('Iniciar Sesión', 'Debes iniciar sesión para crear un grupo');
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Por favor ingresa un nombre para el grupo');
      return;
    }
    
    try {
      await createNewGroup(newGroupName.trim(), email.current);
      setShowCreateModal(false);
      setNewGroupName('');
    } catch (error) {
      // Error ya manejado en createNewGroup
    }
  };

  const cancelCreateGroup = () => {
    setShowCreateModal(false);
    setNewGroupName('');
  };

  const joinGroup = (group) => {
    if (!isLoggedIn) {
      Alert.alert('Iniciar Sesión', 'Debes iniciar sesión para unirte a un grupo');
      return;
    }
    // Navegar a la pantalla del grupo
    navigation.navigate('GroupOptions', { group });
  };

  const googleText = isLoggedIn ? 'Cerrar Sesión' : 'Iniciar Sesión con Google';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Baby Monitor</Text>
      
      <TouchableOpacity 
        style={styles.createButton} 
        onPress={createGroup}
      >
        <Text style={styles.createButtonText}>Crear Grupo</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Mis Grupos</Text>
        
        {isLoadingGroups ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Cargando grupos...</Text>
          </View>
        ) : groups.length > 0 ? (
          groups.map(group => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => joinGroup(group)}
            >
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMembers}>{group.members} miembros</Text>
              </View>
              <Text style={styles.joinText}>→</Text>
            </TouchableOpacity>
          ))
        ) : isLoggedIn ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes grupos aún</Text>
            <Text style={styles.emptySubText}>Crea un grupo o espera a que te inviten</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Inicia sesión para ver tus grupos</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.googleButton, isLoading && styles.disabledButton]} 
        onPress={signIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.googleButtonText}>{googleText}</Text>
        )}
      </TouchableOpacity>

      {/* Debug info */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugText}>
          Email: {displayEmail || 'No hay email'}
        </Text>
      </View>

      {/* Modal para crear grupo */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelCreateGroup}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Crear Nuevo Grupo</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Nombre del grupo"
              placeholderTextColor="#999"
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus={true}
              maxLength={50}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={cancelCreateGroup}
                disabled={isCreatingGroup}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.createButton, isCreatingGroup && styles.disabledButton]} 
                onPress={handleCreateGroup}
                disabled={isCreatingGroup}
              >
                {isCreatingGroup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Crear</Text>
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
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF', // Azul elegante que combina con la navegación
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 30,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  groupCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  groupMembers: {
    fontSize: 14,
    color: '#666',
  },
  joinText: {
    fontSize: 24,
    color: '#3E5F8A',
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  debugInfo: {
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
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
    color: '#333', // Texto negro
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
    height: 48, // Altura exacta en lugar de minHeight
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  toastContainer: {
    position: 'absolute',
    top: 10, // Más alto, al nivel de la navigation bar
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

export default HomeGroupsScreen;
