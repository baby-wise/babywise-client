import React, { useState } from 'react';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import ViewerScreen from './src/screens/ViewerScreen';

const App = () => {
  const [role, setRole] = useState('home');

  const renderScreen = () => {
    switch (role) {
      case 'camera':
        return <CameraScreen />;
      case 'viewer':
        return <ViewerScreen />;
      default:
        return <HomeScreen setRole={setRole} />;
    }
  };

  return renderScreen();
};

export default App;
