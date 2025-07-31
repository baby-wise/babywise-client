import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, Switch } from 'react-native';
import { io as ioViewer } from 'socket.io-client';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import DropDownPicker from 'react-native-dropdown-picker';

const ViewerSelectorScreen = ({ navigation, route }) => {
  const { group } = route.params;
  const [status, setStatus] = useState('Inicializando...');
  const [cameras, setCameras] = useState([]);
  const socket = useRef(null);
  const ROOM_ID = `baby-room-${group.id}`; // Usar el ID del grupo

  // Variables para el selector de cámaras
  const [selectedCameras, setSelectedCameras] = useState([]);
  const [open, setOpen] = useState(false);
  const [multiple, setMultiple] = useState(false);
  const [dropdownItems, setDropdownItems] = useState([]);

  useEffect(() => {
    // Este socket es temporal y solo para obtener la lista de cámaras.
    socket.current = ioViewer(SIGNALING_SERVER_URL);
    
    socket.current.on('connect', () => {
      setStatus('Conectado. Solicitando cámaras disponibles...');
      socket.current?.emit('get-cameras-list', { roomId: ROOM_ID });
    });

    socket.current.on('cameras-list', (cameras) => {
      setStatus(`${cameras.length > 0 ? 'Seleccione una cámara' : 'No hay cámaras disponibles'}`);
      console.log('Cámaras recibidas:', cameras);
      setCameras(cameras);
    });

    // Limpiamos este socket temporal cuando el componente se desmonta.
    return () => {
      socket.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    // Filtramos defensivamente para asegurarnos de que cada cámara tenga un ID.
    // Esto previene el error de "key" si el servidor envía datos malformados.
    const validCameras = cameras.filter(camera => camera && camera.id);

    const items = validCameras.map(camera => ({
      label: camera.name || camera.id, // Usamos el nombre, o el ID como fallback.
      value: camera.id,                // El valor siempre será un ID válido.
    }));
    setDropdownItems(items);

    if (items.length > 0 && !multiple) {
      setSelectedCameras(items[0].value);
    } else {
      setSelectedCameras([]);
    }
  }, [cameras, multiple]); // Se ejecuta cuando 'cameras' o 'multiple' cambian

  const startViewing = () => {
    if (!selectedCameras || (Array.isArray(selectedCameras) && selectedCameras.length === 0)) {
      setStatus('Por favor selecciona una cámara');
      return;
    }
    
    // Navegamos a la pantalla de visualización, pasando solo la información del grupo.
    // El ViewerScreen se encargará de todo el proceso de conexión de Mediasoup.
    navigation.navigate('Viewer', { 
      group,
      // Ya no pasamos el socket ni el roomId.
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Botón de volver minimalista */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>‹</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Seleccionar Cámara</Text>
      <Text style={styles.groupName}>{group.name}</Text>
      <Text style={styles.statusText}>{status}</Text>
      
      <View style={styles.selectorContainer}>
        <Text style={styles.controlLabel}>Modo selección múltiple</Text>
        <Switch value={multiple} onValueChange={setMultiple} />

        <DropDownPicker
          open={open}
          value={selectedCameras}
          items={dropdownItems}
          setOpen={setOpen}
          setValue={setSelectedCameras}
          setItems={setDropdownItems}
          multiple={multiple}
          min={0}
          max={multiple ? 5 : 1}
          placeholder="Selecciona una o más cámaras"
          style={styles.dropdown}
        />

        <TouchableOpacity
          onPress={startViewing}
          style={styles.startButton}
          disabled={cameras.length === 0}
        >
          <Text style={styles.startButtonText}>Iniciar Visualización</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3E5F8A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  groupName: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  statusText: {
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
    marginBottom: 30,
    textAlign: 'center',
  },
  selectorContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  dropdown: {
    marginTop: 20,
    marginBottom: 20,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ViewerSelectorScreen;
