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
  TextInput,
  RefreshControl
} from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../config/firebase';
import { signInWithCredential, GoogleAuthProvider, signOut } from '@react-native-firebase/auth';
import { groupService, userService } from '../services/apiService';
import { GlobalStyles, Colors } from '../styles/Styles';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { requestNotificationPermission } from '../services/requestPermission';

const HomeGroupsScreen = ({ navigation, setUserEmail }) => {
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
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para unirse a grupo
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  
  // Estado para menú de perfil
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Estado para menú de opciones del botón +
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  // Estados para configuración de usuario
  const [showUserSettingsModal, setShowUserSettingsModal] = useState(false);
  const [userSettings, setUserSettings] = useState({ allowNotifications: true });
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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

      // Registrar token push en el backend
      await registerPushToken(currentUser.uid);
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
        // Guardar el email globalmente en App.jsx
        if (setUserEmail) setUserEmail(currentUser.user.email);
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
        // Registrar token push en el backend
        if (currentUser.user.email) {
          await registerPushToken(currentUser.uid);
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
            await registerPushToken(userInfo.data.user.uid);
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

  // Función para cargar configuración del usuario
  const loadUserSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      const response = await userService.getUserSettings(currentUser.uid);
      
      if (response.success && response.settings) {
        setUserSettings(response.settings);
      } else {
        // Default values
        setUserSettings({ allowNotifications: true });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      setUserSettings({ allowNotifications: true });
    } finally {
      setIsLoadingSettings(false);
    }
  };

  // Función para guardar configuración del usuario
  const saveUserSettings = async () => {
    setIsSavingSettings(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }
      if(userSettings.allowNotifications){
        console.log("Mandando a request permisions")
        requestNotificationPermission()
      }
      const response = await userService.updateUserSettings(currentUser.uid, userSettings);
      
      if (response.success) {
        showSuccessToast('Configuración guardada exitosamente');
        setShowUserSettingsModal(false);
      } else {
        throw new Error('Error guardando configuración');
      }
    } catch (error) {
      console.error('Error saving user settings:', error);
      Alert.alert('Error', 'No se pudo guardar la configuración');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Función para abrir el modal de configuración
  const openUserSettings = async () => {
    setShowProfileMenu(false);
    setShowUserSettingsModal(true);
    await loadUserSettings();
  };

  // Función para refrescar grupos
  const onRefresh = async () => {
    setRefreshing(true);
    console.log('Refrescando lista de grupos...');
    if (isLoggedIn && email.current) {
      await loadUserGroups(email.current);
    }
    setRefreshing(false);
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
    <SafeAreaView style={GlobalStyles.container}>
    {/* Header con título y perfil */}
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
      <View style={{ flex: 1 }} />
      
      {/* Título centrado */}
      <View style={{ alignItems: 'center' }}>
        <Text style={[GlobalStyles.title, { marginBottom: 0 }]}>
          <Text style={{ color: Colors.primary }}>Baby</Text>
          <Text style={{ color: Colors.secondary }}>Wise</Text>
        </Text>
      </View>
      
      {/* Ícono de perfil - siempre visible */}
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <TouchableOpacity
          onPress={() => setShowProfileMenu(!showProfileMenu)}
          style={{
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialDesignIcons 
            name="account-circle" 
            size={40} 
            color={isLoggedIn ? Colors.primary : Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </View>

    {/* Menú desplegable de perfil */}
    {showProfileMenu && (
      <View style={{
        position: 'absolute',
        top: 80,
        right: 20,
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 16,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        zIndex: 1000,
      }}>
        {isLoggedIn ? (
          <>
            {/* Nombre del usuario */}
            <View style={{ 
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#eee'
            }}>
              <Text style={{ 
                fontSize: 16, 
                color: Colors.text, 
                fontWeight: '500',
                textAlign: 'center'
              }}>
                {displayEmail?.split('@')[0]}
              </Text>
            </View>
            
            {/* Botón de Configuración */}
            <TouchableOpacity
              onPress={openUserSettings}
              style={{ 
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#eee'
              }}
            >
              <Text style={{ 
                fontSize: 16, 
                color: Colors.text, 
                fontWeight: '500',
                textAlign: 'center'
              }}>
                Configuración
              </Text>
            </TouchableOpacity>
            
            {/* Botón de cerrar sesión */}
            <TouchableOpacity
              onPress={() => {
                setShowProfileMenu(false);
                signIn(); // Esta función ya maneja el logout cuando isLoggedIn es true
              }}
              disabled={isLoading}
              style={{ paddingVertical: 8, marginTop: 4 }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ff4444" />
              ) : (
                <Text style={{ 
                  fontSize: 16, 
                  color: '#ff4444', 
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  Cerrar Sesión
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Mensaje cuando no está logueado */}
            <Text style={{ 
              fontSize: 14, 
              color: Colors.textSecondary, 
              marginBottom: 12,
              textAlign: 'center'
            }}>
              No has iniciado sesión
            </Text>
            
            {/* Botón de iniciar sesión */}
            <TouchableOpacity
              onPress={() => {
                setShowProfileMenu(false);
                signIn();
              }}
              disabled={isLoading}
              style={{ 
                backgroundColor: Colors.primary,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={{ 
                  fontSize: 16, 
                  color: Colors.white, 
                  fontWeight: '600'
                }}>
                  Iniciar Sesión
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    )}
    
    {/* Lista de grupos */}
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      style={{ marginBottom: 100 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
          title="Actualizando grupos..."
          titleColor="#64748B"
        />
      }
    >
      <Text style={GlobalStyles.sectionTitle}>Mis grupos</Text>
      
      {isLoadingGroups ? (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: Colors.text, fontSize: 16, marginTop: 10 }}>Cargando grupos...</Text>
        </View>
      ) : groups.length > 0 ? (
        groups.map((group, index) => (
          <TouchableOpacity
            key={group.id || group._id || `group-${index}`}
            style={GlobalStyles.card}
            onPress={() => joinGroup(group)}
          >
            <View style={{ flex: 1 }}>
              <Text style={GlobalStyles.cardTitle}>{group.name}</Text>
              <Text style={GlobalStyles.cardSubtitle}>{group.members} miembros</Text>
            </View>
            <Text style={{ fontSize: 24, color: Colors.primary, fontWeight: "bold" }}>→</Text>
          </TouchableOpacity>
        ))
      ) : isLoggedIn ? (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "bold" }}>No tienes grupos aún</Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>Crea un grupo o espera a que te inviten</Text>
        </View>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "bold" }}>Inicia sesión para ver tus grupos</Text>
        </View>
      )}
    </ScrollView>

    {/* Modal para crear grupo */}
    <Modal
      visible={showCreateModal}
      transparent
      animationType="fade"
      onRequestClose={cancelCreateGroup}
    >
      <View style={GlobalStyles.modalOverlay}>
        <View style={GlobalStyles.modalContainer}>
          <Text style={GlobalStyles.modalTitle}>
            Crear nuevo gupo
          </Text>

          <TextInput
            style={GlobalStyles.modalInput}
            placeholder="Nombre del grupo"
            placeholderTextColor={Colors.textSecondary}
            value={newGroupName}
            onChangeText={setNewGroupName}
            autoFocus
            maxLength={50}
          />

          <View style={GlobalStyles.modalButtons}>
            {/* Cancelar */}
            <TouchableOpacity
              style={[GlobalStyles.modalButton, GlobalStyles.cancelButton]}
              onPress={cancelCreateGroup}
              disabled={isCreatingGroup}
            >
              <Text style={GlobalStyles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            {/* Crear */}
            <TouchableOpacity
              style={[
                GlobalStyles.modalButton,
                GlobalStyles.addButton,
                isCreatingGroup && GlobalStyles.disabledButton,
              ]}
              onPress={handleCreateGroup}
              disabled={isCreatingGroup}
            >
              {isCreatingGroup ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={GlobalStyles.addButtonText}>Crear</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>


    {/* Modal para unirse a grupo */}
    <Modal
      visible={showJoinModal}
      transparent
      animationType="fade"
      onRequestClose={cancelJoinGroup}
    >
      <View style={GlobalStyles.modalOverlay}>
        <View style={GlobalStyles.modalContainer}>
          <Text style={GlobalStyles.modalTitle}>Unirse a un grupo</Text>

          <TextInput
            style={GlobalStyles.modalInput}
            placeholder="Código de invitación"
            placeholderTextColor={Colors.textSecondary}
            value={inviteCode}
            onChangeText={setInviteCode}
            autoFocus
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <View style={GlobalStyles.modalButtons}>
            <TouchableOpacity
              style={[GlobalStyles.modalButton, GlobalStyles.cancelButton]}
              onPress={cancelJoinGroup}
              disabled={isJoiningGroup}
            >
              <Text style={GlobalStyles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                GlobalStyles.modalButton,
                GlobalStyles.addButton,
                isJoiningGroup && GlobalStyles.disabledButton,
              ]}
              onPress={handleJoinGroup}
              disabled={isJoiningGroup}
            >
              {isJoiningGroup ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={GlobalStyles.addButtonText}>Unirse</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>


    {/* Toast */}
    {showToast && (
      <View style={{ position: "absolute", top: 10, left: 20, right: 20, backgroundColor: Colors.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, elevation: 10 }}>
        <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "600", textAlign: "center" }}>{toastMessage}</Text>
      </View>
    )}

    {/* Modal de Configuración de Usuario */}
    <Modal
      visible={showUserSettingsModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowUserSettingsModal(false)}
    >
      <View style={GlobalStyles.modalOverlay}>
        <View style={[GlobalStyles.modalContainer, { maxWidth: 400 }]}>
          <Text style={GlobalStyles.modalTitle}>Configuración</Text>

          {isLoadingSettings ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ color: Colors.textSecondary, marginTop: 10 }}>
                Cargando configuración...
              </Text>
            </View>
          ) : (
            <>
              {/* Toggle para permitir notificaciones */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 16,
                paddingHorizontal: 12,
                backgroundColor: '#f9f9f9',
                borderRadius: 8,
                marginBottom: 16
              }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ 
                    fontSize: 16, 
                    fontWeight: '600', 
                    color: Colors.text,
                    marginBottom: 4
                  }}>
                    Permitir Notificaciones
                  </Text>
                  <Text style={{ 
                    fontSize: 13, 
                    color: Colors.textSecondary 
                  }}>
                    Recibir alertas de eventos de llanto y movimiento
                  </Text>
                </View>
                
                <TouchableOpacity
                  onPress={() => {
                    setUserSettings(prev => ({
                      ...prev,
                      allowNotifications: !prev.allowNotifications
                    }));
                  }}
                  style={{
                    width: 50,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: userSettings.allowNotifications ? Colors.primary : '#ccc',
                    padding: 2,
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: '#fff',
                      transform: [{ translateX: userSettings.allowNotifications ? 20 : 0 }],
                    }}
                  />
                </TouchableOpacity>
              </View>

              <View style={GlobalStyles.modalButtons}>
                {/* Cancelar */}
                <TouchableOpacity
                  style={[GlobalStyles.modalButton, GlobalStyles.cancelButton]}
                  onPress={() => setShowUserSettingsModal(false)}
                  disabled={isSavingSettings}
                >
                  <Text style={GlobalStyles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                {/* Guardar */}
                <TouchableOpacity
                  style={[
                    GlobalStyles.modalButton,
                    GlobalStyles.addButton,
                    isSavingSettings && GlobalStyles.disabledButton,
                  ]}
                  onPress={saveUserSettings}
                  disabled={isSavingSettings}
                >
                  {isSavingSettings ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={GlobalStyles.addButtonText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>

    {/* Menú de opciones del botón + */}
    {showAddMenu && (
      <View style={{
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        backgroundColor: Colors.white,
        borderRadius: 12,
        padding: 8,
        width: 200,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        zIndex: 1000,
      }}>
        <TouchableOpacity
          onPress={() => {
            setShowAddMenu(false);
            createGroup();
          }}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#f0f0f0',
            alignItems: 'center',
          }}
        >
          <Text style={{ 
            fontSize: 16, 
            color: Colors.text, 
            fontWeight: '600'
          }}>
            Crear Grupo Nuevo
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => {
            setShowAddMenu(false);
            openJoinModal();
          }}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ 
            fontSize: 16, 
            color: Colors.text, 
            fontWeight: '600'
          }}>
            Unirse a Grupo
          </Text>
        </TouchableOpacity>
      </View>
    )}

    {/* Barra de navegación inferior */}
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 74,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    }}>
      {/* Botón central de Agregar */}
      <TouchableOpacity 
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -40,
        }}
        onPress={() => {
          if (!isLoggedIn) {
            Alert.alert('Iniciar Sesión', 'Debes iniciar sesión para crear o unirte a un grupo');
            return;
          }
          setShowAddMenu(!showAddMenu);
        }}
      >
        <View style={{
          width: 70,
          height: 70,
          borderRadius: 35,
          backgroundColor: Colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}>
          <Text style={{
            fontSize: 40,
            color: '#fff',
            fontWeight: 'bold',
          }}>+</Text>
        </View>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
  );
};
export default HomeGroupsScreen;
