import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import styles from '../styles/Styles';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../config/firebase';
import { signInWithCredential, GoogleAuthProvider, signOut } from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/Feather';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

const HomeScreen = ({ setRole }) => {
  const email = useRef();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayEmail, setDisplayEmail] = useState(null); // Estado para forzar re-render del email
  
  useEffect(() => {
    // Listener para notificaciones push recibidas en foreground
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('[PUSH] Notificación recibida en foreground:', remoteMessage);
      Alert.alert(
        remoteMessage.notification?.title || 'Notificación',
        remoteMessage.notification?.body || JSON.stringify(remoteMessage.data)
      );
    });

    // Listener para notificaciones recibidas cuando la app está en background o cerrada
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('[PUSH] Notificación recibida en background:', remoteMessage);
    });

    // Listener para notificaciones que abren la app desde estado cerrado
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('[PUSH] Notificación abrió la app:', remoteMessage);
    });

    // Notificación que abrió la app desde estado cerrado (cold start)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('[PUSH] Notificación abrió la app desde cold start:', remoteMessage);
        }
      });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Configurar Google Sign-In
    GoogleSignin.configure({
      webClientId: '1011273483061-7bl7mchini6fdosmf2ij6ngiep47e96a.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      scopes: ['profile', 'email'], // Asegurar que solicite estos scopes
    });
    
    // Verificar si hay un usuario ya autenticado
    checkCurrentUser();
  }, []);


  const checkCurrentUser = async () => {
    try {
      const currentUser = await GoogleSignin.getCurrentUser();
      console.log('checkCurrentUser - currentUser:', currentUser);
      if (currentUser) {
        setIsLoggedIn(true);
        email.current = currentUser.user.email;
        setDisplayEmail(currentUser.user.email); // Actualizar estado para mostrar en pantalla
        console.log('User already signed in:', email.current);
      } else {
        setIsLoggedIn(false);
        email.current = null;
        setDisplayEmail(null); // Limpiar el display
        console.log('No user currently signed in');
      }
    } catch (error) {
      console.log('checkCurrentUser error:', error);
      setIsLoggedIn(false);
      email.current = null;
      setDisplayEmail(null); // Limpiar el display en caso de error
    }
  };

  const signIn = async () => {
    if (isLoggedIn === false) {
      // Si no está logueado
      setIsLoading(true);
      try {
        // Intentar login silencioso primero
        const currentUser = await GoogleSignin.signInSilently();
        setIsLoggedIn(true);
        email.current = currentUser.user.email;
        setDisplayEmail(currentUser.user.email);
        console.log('Silent sign in successful:', email.current);
      } catch (error) {
        // Si el login silencioso falla, intentar login manual
        try {
          await GoogleSignin.hasPlayServices();
          const userInfo = await GoogleSignin.signIn();
          
          console.log('Google Sign-In userInfo:', userInfo);
          console.log('userInfo.type:', userInfo.type);
          console.log('userInfo.data:', userInfo.data);
          
          // Verificar si el usuario canceló la autenticación
          if (userInfo.type === 'cancelled') {
            console.log('User cancelled the sign in process');
            setIsLoggedIn(false);
            setDisplayEmail(null);
            setIsLoading(false); // Importante: detener el loading antes del return
            return; // Salir sin mostrar error
          }
          
          console.log('userInfo.data.user:', userInfo.data?.user);
          console.log('idToken:', userInfo.data?.idToken);
          console.log('accessToken:', userInfo.data?.accessToken);
          
          // Verificar que tenemos los tokens necesarios
          if (!userInfo.data?.idToken) {
            throw new Error('No idToken received from Google Sign-In');
          }
          
          // Verificar que tenemos la información del usuario
          if (!userInfo.data?.user?.email) {
            throw new Error('No user information received from Google Sign-In');
          }
          
          // Crear credencial para Firebase
          const googleCredential = GoogleAuthProvider.credential(userInfo.data.idToken);
          
          // Autenticar con Firebase
          await signInWithCredential(auth, googleCredential);
          
          setIsLoggedIn(true);
          email.current = userInfo.data.user.email;
          setDisplayEmail(userInfo.data.user.email);
          console.log('Manual sign in successful:', email.current);
          // Registrar token push en el backend
          if (currentUser.user.email) {
            await registerPushToken(currentUser.user.email);
          }
          if (userInfo.data.user.email) {
            await registerPushToken(userInfo.data.user.email);
          }
        } catch (signInError) {
          console.log('Sign in error:', signInError);
          console.log('Error message:', signInError.message);
          console.log('Error code:', signInError.code);
          setIsLoggedIn(false);
          
          // Manejar diferentes tipos de errores sin usar statusCodes deprecados
          if (signInError.message?.includes('SIGN_IN_CANCELLED') || signInError.message?.includes('cancelled')) {
            console.log('User cancelled the login flow');
            // No mostrar alert para cancelaciones
          } else if (signInError.message?.includes('SIGN_IN_CURRENTLY_IN_PROGRESS') || signInError.message?.includes('in progress')) {
            console.log('Sign in is in progress already');
          } else if (signInError.message?.includes('PLAY_SERVICES_NOT_AVAILABLE') || signInError.message?.includes('Play Services')) {
            Alert.alert('Error', 'Google Play Services not available');
          } else if (signInError.message?.includes('network') || signInError.message?.includes('internet')) {
            Alert.alert('Error', 'No internet connection');
          } else {
            // Solo mostrar alert para errores que no sean cancelaciones
            if (!signInError.message?.includes('No idToken received')) {
              Alert.alert('Error', `Something went wrong with sign in: ${signInError.message}`);
            }
            console.log('Full error:', signInError);
          }
        }
      }
      setIsLoading(false);
    } else {
      // Si está logueado, hacer logout
      setIsLoading(true);
      try {
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();
        await signOut(auth);
        email.current = null;
        setDisplayEmail(null);
        setIsLoggedIn(false);
        console.log('Sign out successful');
      } catch (error) {
        console.error('Sign out error:', error);
        email.current = null;
        setDisplayEmail(null);
        setIsLoggedIn(false);
      }
      setIsLoading(false);
    }
  };

  const getUserName = () => {
    if (!email.current) return 'anonimo';
    // Si querés usar el nombre de Google, deberías guardar el nombre en el estado al loguear
    // Por ahora, usamos la parte antes del @ del email
    return email.current.split('@')[0];
  };

  const goToViewer = async () => {
    console.log('goToViewer called');
    console.log('isLoggedIn state:', isLoggedIn);
    console.log('email.current:', email.current);
    
    if (isLoggedIn && email.current) {
      console.log('Navigating to viewer screen');
      setRole({ role: 'viewer', userName: getUserName() });
    } else {
      console.log('User not authenticated, calling signIn');
      await signIn();
    }
  };

  const goToCamera = async () => {
    console.log('goToCamera called');
    console.log('isLoggedIn state:', isLoggedIn);
    console.log('email.current:', email.current);
    
    if (isLoggedIn && email.current) {
      console.log('Navigating to camera screen');
      setRole('camera');
    } else {
      console.log('User not authenticated, calling signIn');
      await signIn();
    }
  };

  const goToUpload = () =>{
    setRole('upload')
  }

  const googleText = isLoggedIn ? 'Cerrar Sesión' : 'Iniciar Sesión con Google';

  return (
    <SafeAreaView style={localStyles.container}>

      <View style={localStyles.header}>
        <Text style={localStyles.title}>Baby Monitor</Text>
        <TouchableOpacity onPress={goToUpload} style={localStyles.uploadIcon}>
          <Icon name="upload" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <View style={localStyles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={goToViewer}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Viewer</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={goToCamera}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Cámara</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[localStyles.googleButton, isLoading && localStyles.disabledButton]} 
          onPress={signIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={localStyles.googleButtonText}>{googleText}</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Debug info - siempre visible para debugging */}
      <View style={localStyles.debugInfo}>
        <Text style={localStyles.debugText}>
          Email: {displayEmail || 'No hay email'}
        </Text>
      </View>
      
      {/* Info del usuario - solo cuando está logueado */}
      {isLoggedIn && email.current && (
        <View style={localStyles.userInfo}>
          <Text style={localStyles.userText}>Usuario: {email.current}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const localStyles = StyleSheet.create({
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
    marginBottom: 50,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
    width: '80%',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  userInfo: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  userText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '90%',
  },
  debugText: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 5,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  uploadIcon: {
    padding: 8,
  },
});

export default HomeScreen;

