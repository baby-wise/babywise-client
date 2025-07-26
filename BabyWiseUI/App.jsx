import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';
import HomeGroupsScreen from './src/screens/HomeGroupsScreen';
import GroupOptionsScreen from './src/screens/GroupOptionsScreen';
import ViewerSelectorScreen from './src/screens/ViewerSelectorScreen';
import ViewerScreen from './src/screens/ViewerScreen';
import CameraScreen from './src/screens/CameraScreen';

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
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="HomeGroups"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
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
          name="ViewerSelector" 
          component={ViewerSelectorScreen} 
          options={{ title: 'Select Cameras' }}
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
