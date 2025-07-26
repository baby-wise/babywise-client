import React, { useEffect, useState, useRef } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Alert, 
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth } from '../config/firebase';
import { signInWithCredential, GoogleAuthProvider, signOut } from '@react-native-firebase/auth';

const HomeGroupsScreen = ({ navigation }) => {
  const email = useRef();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [displayEmail, setDisplayEmail] = useState(null);
  const [groups, setGroups] = useState([
    { id: 1, name: 'Casa Principal', members: 3 },
    { id: 2, name: 'Casa de Verano', members: 2 },
    { id: 3, name: 'Oficina', members: 5 }
  ]); // Mock data por ahora

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

  const checkCurrentUser = async () => {
    try {
      const currentUser = await GoogleSignin.getCurrentUser();
      console.log('checkCurrentUser - currentUser:', currentUser);
      if (currentUser) {
        setIsLoggedIn(true);
        email.current = currentUser.user.email;
        setDisplayEmail(currentUser.user.email);
        console.log('User already signed in:', email.current);
      } else {
        setIsLoggedIn(false);
        email.current = null;
        setDisplayEmail(null);
        console.log('No user currently signed in');
      }
    } catch (error) {
      console.log('checkCurrentUser error:', error);
      setIsLoggedIn(false);
      email.current = null;
      setDisplayEmail(null);
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

  const createGroup = () => {
    // Handler vacío por ahora
    console.log('Crear grupo pressed');
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
        {groups.map(group => (
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
        ))}
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
    backgroundColor: '#4CAF50',
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
});

export default HomeGroupsScreen;
