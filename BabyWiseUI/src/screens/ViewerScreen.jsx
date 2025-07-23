import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, Switch } from 'react-native';
import { RTCPeerConnection, RTCView, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';
import { io as ioViewer, Socket } from 'socket.io-client';
import styles from '../styles/Styles';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import DropDownPicker from 'react-native-dropdown-picker';

// --- CONFIGURACIÓN ---
const ROOM_ID = 'baby-room-1';

const ViewerScreen = ({ setRole }) => {
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('Inicializando...');
  const [cameras, setCameras] = useState([])
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const configurationViewer = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  //Variables para el selector de camras
  const [selectedCameras, setSelectedCameras] = useState([]);
  const [open, setOpen] = useState(false)
  const [multiple, setMultiple] = useState(false) // Modo selección múltiple
  const [dropdownItems, setDropdownItems] = useState([]);

  useEffect(() => {
    socket.current = ioViewer(SIGNALING_SERVER_URL);
    
    socket.current.on('connect', () => {
        setStatus('Conectado. Solicitando camaras disponibles...');
        socket.current?.emit('get-cameras-list', {group: ROOM_ID, socektId: socket.current.id, role: 'viewer'});
        socket.current?.emit('join-room', {group: ROOM_ID, socektId: socket.current.id, role: 'viewer'});
    });

    socket.current.on('cameras-list', (cameras) => {
      setStatus(`${cameras.length > 0 ? 'Seleccione una camara' : 'No hay camaras disponibles'}`);
      console.log(cameras)
      setCameras(cameras);
    });

    socket.current.on('offer', async ({ sdp, sourcePeerId }) => {
        setStatus(`Oferta recibida de ${sourcePeerId}. Creando respuesta...`);
        peerConnection.current = new RTCPeerConnection(configurationViewer);

        peerConnection.current.setRemoteDescription(new RTCSessionDescription(sdp));

        peerConnection.current.ontrack = (event) => {
            if(event.streams && event.streams[0]){
                setRemoteStream(event.streams[0]);
                setStatus('¡Conectado al bebé!');
            }
        };

        peerConnection.current.onicecandidate = (event) => {
            if (event.candidate) {
                socket.current?.emit('ice-candidate', {
                    candidate: event.candidate,
                    targetPeerId: sourcePeerId,
                });
            }
        };

        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.current?.emit('answer', { sdp: answer, targetPeerId: sourcePeerId });
    });

    socket.current.on('ice-candidate', ({ candidate }) => {
        if (peerConnection.current && candidate) {
            peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
    });

    return () => {
        socket.current?.disconnect();
        if (peerConnection.current) {
            peerConnection.current.close();
        }
    };
  }, []);

  useEffect(() => {
    const items = cameras.map(device => ({
      label: device,
      value: device,
    }));
    setDropdownItems(items);
    if (items.length > 0) {
      setSelectedCameras(multiple ? [items[0].value] : items[0].value);
    }
  }, [multiple,cameras]);

  const startStream = () => {
    console.log('Cámaras seleccionadas:', selectedCameras);
    socket.current?.emit('start-stream', {group: ROOM_ID, socektId: socket.current.id, role: 'viewer'});
  };

  return (
      <SafeAreaView style={viewerStyles.container}>
        <Text style={viewerStyles.statusText}>{status}</Text>
        {remoteStream ? (
          <>
            <RTCView
              streamURL={remoteStream.toURL()}
              style={viewerStyles.video}
              objectFit={'cover'}
            />
            <TouchableOpacity style={styles.stopButton} onPress={stopViewing} activeOpacity={0.7}>
              <Text style={styles.stopButtonText}>Dejar de visualizar</Text>
            </TouchableOpacity>
          </>
        ) : (
        <View style={viewerStyles.placeholder}>
          <Text style={viewerStyles.controlLabel}>Modo selección múltiple</Text>
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
            max={multiple ? 5 : 1} // Máximo opcional en múltiple
            placeholder="Selecciona una o más cámaras"
            style={{ marginTop: 20 }}
          />

          <TouchableOpacity
            onPress={startStream}
            style={{
              backgroundColor: '#007AFF',
              padding: 15,
              borderRadius: 10,
              marginTop: 30,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 16 }}>Iniciar Transmisión</Text>
          </TouchableOpacity>
        </View>
        )}
        
        <TouchableOpacity style={viewerStyles.backButton} onPress={() => setRole('home')}>
          <Text style={viewerStyles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
  );
};

const stopViewing = () => {}

const viewerStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    position: 'absolute',
    top: 40,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  placeholderText: {
    color: 'white',
    fontSize: 20,
    marginBottom: 20,
  },

  // 🔽 NUEVOS ESTILOS PARA UI
  controlPanel: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  switch: {
    marginBottom: 20,
  },
  dropdown: {
    width: '100%',
    marginBottom: 20,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
  },
  streamButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  streamButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
    zIndex: 2,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
export default ViewerScreen;