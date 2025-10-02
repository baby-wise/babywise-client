import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
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
import { groupService, userService } from '../services/apiService';

const HomeGroupsScreen = ({ navigation }) => {
  // Estado para el popup de notificación
  const [notifPopup, setNotifPopup] = useState({ visible: false, message: '', roomId: null });
  const notifTimeout = useRef(null);
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
  
  // Estados para unirse a grupo
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);

 // Función para registrar el token push en el backend
  const registerPushToken = async (UID) => {
    try {
      // Solicitar permisos de notificación
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) {
        console.log('[PUSH] Permiso de notificación denegado');
        return;
      }
      // Obtener token FCM
      const token = await messaging().getToken();
      console.log('[PUSH] Token FCM obtenido:', token);
      // Enviar al backend
      const res = await fetch(`${SIGNALING_SERVER_URL}/users/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ UID, pushToken: token, platform: Platform.OS }),
      });
      const data = await res.json();
      console.log('[PUSH] Respuesta backend:', data);
    } catch (err) {
      console.log('[PUSH] Error registrando token:', err);
    }
  };
  // Listener de notificaciones FCM
  useEffect(() => {
    // Foreground: mensaje recibido
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('[FCM] Notificación recibida en foreground:', remoteMessage);
      const title = remoteMessage?.notification?.title || 'Notificación';
      const body = remoteMessage?.notification?.body || '';
      const groupId = remoteMessage?.data?.group || null;
      const baby = remoteMessage?.data?.baby || '';
      const type = remoteMessage?.data?.type || '';
      const date = remoteMessage?.data?.date ? new Date(remoteMessage.data.date).toLocaleString() : '';
      // Texto bonito y claro para el popup
      const popupText = `${title}\n${body}\nFecha: ${date}`;
      setNotifPopup({ visible: true, message: popupText, groupId });
      if (notifTimeout.current) clearTimeout(notifTimeout.current);
      notifTimeout.current = setTimeout(() => setNotifPopup(p => ({ ...p, visible: false })), 3500);
    });
    // Handler para navegar al room si el usuario toca el popup

    // App abierta desde notificación (background)
    const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('[FCM] App abierta desde notificación:', remoteMessage);
      // Navegación o lógica especial
      const title = remoteMessage?.notification?.title || 'Notificación';
      const body = remoteMessage?.notification?.body || '';
      const groupId = remoteMessage?.data?.group || null;
      const baby = remoteMessage?.data?.baby || '';
      const type = remoteMessage?.data?.type || '';
      const date = remoteMessage?.data?.date ? new Date(remoteMessage.data.date).toLocaleString() : '';
      const popupText = `${title}\n${body}\nFecha: ${date}`;
      setNotifPopup({ visible: false, message: popupText, groupId });
      handleNotifPress();
      
    });

    // App iniciada por notificación (quit)
    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        console.log('[FCM] App iniciada por notificación:', remoteMessage);
        // Navegación o lógica especial
        const title = remoteMessage?.notification?.title || 'Notificación';
        const body = remoteMessage?.notification?.body || '';
        const groupId = remoteMessage?.data?.group || null;
        const baby = remoteMessage?.data?.baby || '';
        const type = remoteMessage?.data?.type || '';
        const date = remoteMessage?.data?.date ? new Date(remoteMessage.data.date).toLocaleString() : '';
        const popupText = `${title}\n${body}\nFecha: ${date}`;
        setNotifPopup({ visible: false, message: popupText, groupId });
        handleNotifPress();
      }
    });

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpened();
    };
  }, []);

    const handleNotifPress = () => {
      setNotifPopup(p => ({ ...p, visible: false }));
      const groupId = notifPopup.groupId;
      if (groupId) {
        navigation.navigate('ViewerScreen', { group: { id: groupId }, userName: getUserName() });
      }
    };

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

  // Función para crear usuario en el backend si no existe
  const createUserIfNeeded = async (userEmail, uid) => {
    try {
      console.log('Checking/creating user in backend:', { userEmail, uid });
      
      // Intentar crear el usuario en el backend
      // Si ya existe, el backend debería manejarlo apropiadamente
      const userData = {
        user: {
          email: userEmail,
          UID: uid
        }
      };
      
      await userService.createUser(userData);
      console.log('User created/verified in backend successfully');
    } catch (error) {
      // Si el error es porque el usuario ya existe, no es problema
      console.log('User creation response:', error.message);
      // Solo mostrar error si es un problema real de conectividad
      if (!error.message?.includes('duplicate') && !error.message?.includes('exists')) {
        console.error('Error creating user in backend:', error);
      }
    }
  };

  // Función para cargar grupos del usuario
  const loadUserGroups = async (userEmail) => {
    setIsLoadingGroups(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setGroups([]);
        return;
      }

      // Crear/verificar usuario en el backend primero
      await createUserIfNeeded(userEmail, currentUser.uid);

      // Obtener grupos del usuario usando el UID de Firebase
      const userGroups = await groupService.getUserGroups(currentUser.uid);
      
      // Transformar los datos del backend al formato esperado por el frontend
      const formattedGroups = userGroups.map((group, index) => ({
        id: group._id || group.id || `group-${index}`, // Asegurar que siempre haya un ID único
        name: group.name,
        members: group.users ? group.users.length : 0,
        _id: group._id // Mantener el _id original para uso interno
      }));
      
      setGroups(formattedGroups);
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
        // Registrar token push en el backend
        if (currentUser.user.email) {
          await registerPushToken(currentUser.user.email);
        }
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
        // Registrar token push en el backend
        if (currentUser.user.email) {
          await registerPushToken(currentUser.user.email);
        }
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
          // Registrar token push en el backend
          if (userInfo.data.user.email) {
            await registerPushToken(userInfo.data.user.email);
          }
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
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // Probar conectividad primero
      console.log('Testing backend connectivity...');
      const isConnected = await groupService.testConnection();
      if (!isConnected) {
        throw new Error('No se puede conectar al servidor. Verifica tu conexión.');
      }

      // Crear el grupo usando el servicio real
      const newGroup = await groupService.createGroup(currentUser.uid, groupName);
      
      // Transformar el grupo para el formato del frontend
      const formattedGroup = {
        id: newGroup._id,
        name: newGroup.name,
        members: newGroup.users ? newGroup.users.length : 1,
        _id: newGroup._id
      };
      
      // Agregar el nuevo grupo a la lista
      setGroups(prevGroups => [...prevGroups, formattedGroup]);
      
      // Mostrar toast de éxito
      showSuccessToast(`Grupo "${groupName}" creado exitosamente`);
      
      return formattedGroup;
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', `No se pudo crear el grupo: ${error.message}`);
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

  // Función para unirse a un grupo con código de invitación
  const joinGroupWithCode = async (code) => {
    setIsJoiningGroup(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // Unirse al grupo usando el código de invitación
      const updatedGroup = await groupService.addMember(currentUser.uid, code);
      
      // Transformar el grupo para el formato del frontend
      const formattedGroup = {
        id: updatedGroup._id,
        name: updatedGroup.name,
        members: updatedGroup.users ? updatedGroup.users.length : 1,
        _id: updatedGroup._id
      };
      
      // Agregar el grupo a la lista si no existe
      setGroups(prevGroups => {
        const exists = prevGroups.some(g => g.id === formattedGroup.id);
        if (!exists) {
          return [...prevGroups, formattedGroup];
        }
        return prevGroups;
      });
      
      showSuccessToast(`Te has unido al grupo "${updatedGroup.name}"`);
      setShowJoinModal(false);
      setInviteCode('');
      
      return formattedGroup;
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Código de invitación inválido o expirado');
      throw error;
    } finally {
      setIsJoiningGroup(false);
    }
  };

  const openJoinModal = () => {
    if (!isLoggedIn) {
      Alert.alert('Iniciar Sesión', 'Debes iniciar sesión para unirte a un grupo');
      return;
    }
    setShowJoinModal(true);
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Error', 'Por favor ingresa un código de invitación');
      return;
    }
    
    try {
      await joinGroupWithCode(inviteCode.trim());
    } catch (error) {
      // Error ya manejado en joinGroupWithCode
    }
  };

  const cancelJoinGroup = () => {
    setShowJoinModal(false);
    setInviteCode('');
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

  // Helper para obtener nombre de usuario legible
  const getUserName = () => {
    if (!email.current) return 'anonimo';
    return email.current.split('@')[0];
  };

  const joinGroup = (group) => {
    if (!isLoggedIn) {
      Alert.alert('Iniciar Sesión', 'Debes iniciar sesión para unirte a un grupo');
      return;
    }
    // Navegar a la pantalla del grupo, pasando el nombre de usuario
    navigation.navigate('GroupOptions', { group, userName: getUserName() });
  };

  const googleText = isLoggedIn ? 'Cerrar Sesión' : 'Iniciar Sesión con Google';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Baby Monitor</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.createButton]} 
          onPress={createGroup}
        >
          <Text style={styles.actionButtonText}>Crear Grupo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.joinButton]} 
          onPress={openJoinModal}
        >
          <Text style={styles.actionButtonText}>Unirse a Grupo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Mis Grupos</Text>
        
        {isLoadingGroups ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Cargando grupos...</Text>
          </View>
        ) : groups.length > 0 ? (
          groups.map((group, index) => (
            <TouchableOpacity
              key={group.id || group._id || `group-${index}`}
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

      {/* Modal para unirse a grupo */}
      <Modal
        visible={showJoinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelJoinGroup}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Unirse a Grupo</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Código de invitación"
              placeholderTextColor="#999"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoFocus={true}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={cancelJoinGroup}
                disabled={isJoiningGroup}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.createButton, isJoiningGroup && styles.disabledButton]} 
                onPress={handleJoinGroup}
                disabled={isJoiningGroup}
              >
                {isJoiningGroup ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Unirse</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Popup de notificación push solo foreground */}
      {notifPopup.visible && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleNotifPress}
          style={{
            position: 'absolute',
            top: 32,
            left: 20,
            right: 20,
            backgroundColor: '#fff',
            borderRadius: 16,
            paddingVertical: 18,
            paddingHorizontal: 22,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 8,
            zIndex: 100,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#222', fontSize: 17, fontWeight: '600', textAlign: 'center' }}>{notifPopup.message}</Text>
        </TouchableOpacity>
      )}
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  createButton: {
    backgroundColor: '#007AFF',
  },
  joinButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
