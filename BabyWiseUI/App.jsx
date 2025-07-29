import React, { useState } from 'react';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import ViewerScreen from './src/screens/ViewerScreen';
import UploadScreen from './src/screens/UploadScreen'

const App = () => {
  const [role, setRole] = useState('home');

  const renderScreen = () => {
    switch (role) {
      case 'camera':
        return <CameraScreen setRole={setRole} />;
      case 'viewer':
        return <ViewerScreen setRole={setRole} />;
      case 'upload':
        return <UploadScreen setRole={setRole} />
      default:
        return <HomeScreen setRole={setRole} />;
    }
  };

  return renderScreen();
};

export default App;
