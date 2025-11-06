import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, Text, View, PanResponder, Animated, Platform, PermissionsAndroid } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { SocketProvider } from './src/contexts/SocketContext';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeGroupsScreen from './src/screens/HomeGroupsScreen';
import GroupOptionsScreen from './src/screens/GroupOptionsScreen';
import ViewerScreen from './src/screens/ViewerScreen';
import CameraScreen from './src/screens/CameraScreen';
import RecordingsListScreen from './src/screens/RecordingsListScreen';
import RecordingPlayerScreen from './src/screens/RecordingPlayerScreen';
import AudioListScreen from './src/screens/AudioListScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import { requestNotificationPermissionFirstTimeOpen } from './src/services/requestPermission';

const Stack = createStackNavigator();

// Configuración de transiciones de derecha a izquierda
const forSlide = ({ current, next, layouts }) => {
  return {
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
      ],
    },
    overlayStyle: {
      opacity: current.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
      }),
    },
  };
};

const App = () => {
  // Estado global para mostrar popup de notificación
  const [notifPopup, setNotifPopup] = useState({ visible: false, message: '', groupId: null });
  // Animaciones separadas para X y Y
  const popupAnimY = useRef(new Animated.Value(0)).current;
  const popupAnimX = useRef(new Animated.Value(0)).current;
  const notifTimeout = useRef(null);
  const navigationRef = useRef();
  // Guardar el email globalmente
  const [userEmail, setUserEmail] = useState(null);
  // Flag para procesar initial notification solo una vez
  const initialNotificationProcessed = useRef(false);
  
  useEffect(() => {
    requestNotificationPermissionFirstTimeOpen();
  }, []);




  // Recibir el email desde HomeGroupsScreen
  const handleSetUserEmail = (email) => {
    setUserEmail(email);
  };

  // PanResponder para swipe up, izquierda o derecha dismiss
  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > 10 || Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      // Swipe vertical solo hacia arriba
      if (Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
        if (gestureState.dy < 0) {
          popupAnimY.setValue(gestureState.dy);
        } else {
          popupAnimY.setValue(0);
        }
        popupAnimX.setValue(0);
      }
      // Swipe horizontal
      else {
        popupAnimX.setValue(gestureState.dx);
        popupAnimY.setValue(0);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      // Swipe up
      if (gestureState.dy < -60 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
        Animated.timing(popupAnimY, {
          toValue: -200,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setNotifPopup(p => ({ ...p, visible: false })));
      }
      // Swipe left
      else if (gestureState.dx < -60 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
        Animated.timing(popupAnimX, {
          toValue: -400,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setNotifPopup(p => ({ ...p, visible: false })));
      }
      // Swipe right
      else if (gestureState.dx > 60 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
        Animated.timing(popupAnimX, {
          toValue: 400,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setNotifPopup(p => ({ ...p, visible: false })));
      }
      // No dismiss
      else {
        Animated.spring(popupAnimY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        Animated.spring(popupAnimX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    },
  });

  useEffect(() => {
    // Foreground: mensaje recibido
    const unsubscribeOnMessage = messaging().onMessage(async remoteMessage => {
      console.log('[FCM] Notificación recibida en foreground:', remoteMessage);
      // Ignorar mensajes vacíos o sin datos relevantes
      if (!remoteMessage?.data || Object.keys(remoteMessage.data).length === 0 || !remoteMessage.data.type) {
        return;
      }
      const type = remoteMessage?.data?.type || '';
      const babyName = remoteMessage?.data?.baby || '';
      let popupText = '';
      if (type === 'LLANTO') {
        popupText = `¡Atención! Parece que ${babyName ? babyName : 'el bebé'} está llorando.`;
      } else if (type === 'MOVIMIENTO') {
        popupText = `${babyName ? babyName : 'El bebé'} se ha movido.`;
      } else {
        const title = remoteMessage?.notification?.title || 'Notificación';
        const body = remoteMessage?.notification?.body || '';
        popupText = `${title}${body ? '\n' + body : ''}`;
      }
      const groupId = remoteMessage?.data?.group || null;
      setNotifPopup({ visible: true, message: popupText, groupId });
      Animated.timing(popupAnimY, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }).start();
      Animated.timing(popupAnimX, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }).start();
      if (notifTimeout.current) clearTimeout(notifTimeout.current);
      notifTimeout.current = setTimeout(() => setNotifPopup(p => ({ ...p, visible: false })), 7000);
    });

    // Background: notificación tocada cuando la app está en background
    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('[FCM] Notificación abrió la app desde background:', remoteMessage);
      handleBackgroundNotification(remoteMessage);
    });

    // Killed: notificación que abrió la app desde estado cerrado (cold start)
    // Solo procesar si no se ha procesado antes
    if (!initialNotificationProcessed.current) {
      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          if (remoteMessage) {
            console.log('[FCM] Notificación abrió la app desde cold start:', remoteMessage);
            initialNotificationProcessed.current = true;
            // Delay para asegurar que la navegación esté lista
            setTimeout(() => {
              handleBackgroundNotification(remoteMessage);
            }, 1000);
          }
        });
    }

    return () => {
      unsubscribeOnMessage();
      unsubscribeOnNotificationOpenedApp();
    };
  }, []);

  // Maneja notificaciones en foreground (popup → Viewer en vivo)
  const handleNotifPress = () => {
    setNotifPopup(p => ({ ...p, visible: false }));
    const groupId = notifPopup.groupId;
    let userName = 'anonimo';
    if (userEmail) {
      userName = userEmail.split('@')[0];
    }
    if (groupId && navigationRef.current) {
      navigationRef.current.navigate('Viewer', { group: { id: groupId }, userName });
    }
  };

  // Maneja notificaciones en background/killed (ir directo a reproducir grabación)
  const handleBackgroundNotification = (remoteMessage) => {
    if (!remoteMessage?.data) {
      console.log('[FCM] No hay datos en la notificación');
      return;
    }

    const { recordingUrl, type, baby, date, group } = remoteMessage.data;

    console.log('[FCM] Datos de notificación:', {
      recordingUrl,
      type,
      baby,
      date,
      group
    });

    // Obtener userName del email si está disponible
    let userName = 'anonimo';
    if (userEmail) {
      userName = userEmail.split('@')[0];
    }

    // Si hay URL de grabación, navegar al reproductor
    if (recordingUrl && recordingUrl !== '' && navigationRef.current) {
      console.log('[FCM] Navegando a RecordingPlayerScreen con grabación');
      navigationRef.current.navigate('RecordingPlayerScreen', {
        recordingUrl,
        eventType: type,
        babyName: baby,
        eventDate: date,
        groupId: group,
        userName: userName
      });
    } 
    // Si no hay grabación pero hay groupId, navegar al viewer en vivo
    else if (group && navigationRef.current) {
      console.log('[FCM] No hay grabación, navegando a Viewer en vivo');
      navigationRef.current.navigate('Viewer', { group: { id: group }, userName });
    }
    // Fallback: mostrar mensaje
    else {
      console.log('[FCM] No hay suficientes datos para navegar');
    }
  };

  return (
    <SocketProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator 
          initialRouteName="HomeGroups"
          screenOptions={{
            headerShown: false,
            cardStyleInterpolator: forSlide,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        >
          <Stack.Screen 
            name="HomeGroups" 
            // Pasar el setter de email como prop
            children={props => <HomeGroupsScreen {...props} setUserEmail={handleSetUserEmail} />} 
            options={{ title: 'Baby Monitor Groups' }}
          />
          <Stack.Screen 
            name="GroupOptions" 
            component={GroupOptionsScreen} 
            options={({ route }) => ({ title: `${route.params?.group?.name || 'Group'} Options` })}
          />
          <Stack.Screen 
            name="Viewer" 
            component={ViewerScreen} 
            options={{ title: 'Baby Monitor Viewer' }}
          />
          <Stack.Screen 
            name="Camera" 
            component={CameraScreen} 
            options={{ title: 'Baby Monitor Camera' }}
          />
          <Stack.Screen 
            name="RecordingsListScreen" 
            component={RecordingsListScreen} 
            options={{ title: 'Videos grabados' }}
          />
          <Stack.Screen 
            name="RecordingPlayerScreen" 
            component={RecordingPlayerScreen} 
            options={{ title: 'Reproductor de grabación' }}
          />
          <Stack.Screen 
            name="AudioListScreen" 
            component={AudioListScreen} 
            options={{ title: 'Lista de audios personalizados' }}
          />
          <Stack.Screen 
            name="Statistics" 
            component={StatisticsScreen} 
            options={({ route }) => ({ title: `${route.params?.group?.name || 'Group'} Statistics` })}
          />
        </Stack.Navigator>
        {/* Popup de notificación push global */}
        {notifPopup.visible && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 32,
              left: 20,
              right: 20,
              backgroundColor: '#fff',
              borderRadius: 20,
              paddingVertical: 10,
              paddingHorizontal: 28,
              shadowColor: '#6EDC8A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 12,
              elevation: 12,
              zIndex: 100,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: '#6EDC8A',
              transform: [
                { translateY: popupAnimY },
                { translateX: popupAnimX },
              ],
            }}
            {...panResponder.panHandlers}
          >
            <TouchableOpacity activeOpacity={0.85} onPress={handleNotifPress} style={{ width: '100%', alignItems: 'center' }}>
              <Text style={{ color: '#6EDC8A', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
                Notificación
              </Text>
              <Text style={{ color: '#222', fontSize: 17, fontWeight: '600', textAlign: 'center', marginBottom: 12 }}>{notifPopup.message}</Text>
              <View style={{
                backgroundColor: '#6EDC8A',
                borderRadius: 12,
                paddingVertical: 6,
                paddingHorizontal: 18,
                marginTop: 4,
              }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>Ver</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </NavigationContainer>
    </SocketProvider>
  );
};

export default App;
