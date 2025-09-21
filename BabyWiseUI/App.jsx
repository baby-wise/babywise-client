import React from 'react';
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
import MediaOptionsScreen from './src/screens/MediaOptionsScreen';
import StatisticsScreen from './src/screens/StatisticsScreen';
import BabyHomeScreen from './src/screens/BabyHomeScreen';

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
  return (
    <SocketProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="HomeGroups"
          screenOptions={{
            headerShown: false, // Ocultar la navigation bar
            cardStyleInterpolator: forSlide,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        >
          <Stack.Screen 
            name="HomeGroups" 
            component={HomeGroupsScreen} 
            options={{ title: 'Baby Monitor Groups' }}
          />
          <Stack.Screen 
            name="GroupOptions" 
            component={GroupOptionsScreen} 
            options={({ route }) => ({ title: `${route.params?.group?.name || 'Group'} Options` })}
          />

          <Stack.Screen 
            name="BabyHome" 
            component={BabyHomeScreen} 
            options={{ title: `Baby Home Screen` }}
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
            name="MediaOptionsScreen" 
            component={MediaOptionsScreen} 
            options={{ title: 'Archivos multimedia' }}
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
      </NavigationContainer>
    </SocketProvider>
  );
};

export default App;
