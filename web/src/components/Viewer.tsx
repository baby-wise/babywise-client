import React, { useEffect, useRef, useState } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { RTCPeerConnection, RTCView, RTCSessionDescription, RTCIceCandidate, MediaStream } from 'react-native-webrtc';
import io from 'socket.io-client';
import SIGNALING_URL from '../socket.ts'

export default function Viewer({ email, onBack }: { email: string; onBack?: () => void }) {
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [cameras, setCameras] = useState<string[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const ws = useRef<any>(null);
  const pc = useRef<any>(null);

  useEffect(() => {
    ws.current = io(SIGNALING_URL);

    ws.current.on('connect', () => {
      ws.current.emit('email', { email, type: 'viewer' });
      ws.current.emit('get-cameras-list', { email });
    });

    ws.current.on('cameras-list', (camerasId: string[]) => {
      setCameras(camerasId || []);
    });

    ws.current.on('answer', async (payload: any) => {
      // En el viejo, la answer se recibe como {sdp, email}
      if (pc.current) {
        await pc.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        setStatus('Viewer conectado. Transmisión activa.');
      }
    });

    ws.current.on('ice-candidate', async (payload: any) => {
      console.log('📥 Recibiendo ICE candidate:', payload.candidate);
      if (pc.current) {
        await pc.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });

    return () => {
      ws.current && ws.current.disconnect();
      pc.current && pc.current.close();
    };
    
  }, []);

  const iniciarTransmision = async () => {
    if (!selectedCamera) {
      setStatus('Selecciona una cámara para iniciar la transmisión');
      return;
    }
    setStatus('Creando conexión...');
    const pc_config = {
      iceServers: [
        {urls: 'stun:stun.l.google.com:19302'},
        {urls: 'stun:124.64.206.224:8800'},
        {
          urls: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com',
        },
        {
          urls: 'turn:relay.backups.cz',
          credential: 'webrtc',
          username: 'webrtc',
        },
      ],
    };
    
    pc.current = new RTCPeerConnection(pc_config);

    console.log('🔍 SignalingState inicial:', pc.current.signalingState);

    pc.current.onicecandidate = (event: any) => {
      console.log('📤 Enviando ICE candidate:', event.candidate);
      if (event.candidate) {
        ws.current.emit('ice-candidate', {
          candidate: event.candidate,
          targetId: selectedCamera,
        });
      }
    };

    pc.current.onconnectionstatechange = () => {
      console.log('🔄 Connection state:', pc.current.connectionState);
    };

    pc.current.onsignalingstatechange = () => {
      console.log('🔄 Signaling state:', pc.current.signalingState);
    };

    pc.current.addEventListener('track', (event: any) => {
      console.log('Track recibido:', event);  
      let remoteStreamFalopa = remoteStream || new MediaStream();
      remoteStreamFalopa.addTrack(event.track, remoteStreamFalopa);
      setRemoteStream(remoteStreamFalopa);
      }
    )

    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    console.log('📨 Offer creada:', offer);
    ws.current.emit('offer', {
      sdp: pc.current.localDescription,
      targetId: selectedCamera,
      callerId: ws.current.id,
    });
    setStatus('Offer enviada. Esperando respuesta del emisor...');
  };

  return (
    <View style={styles.container}>
      <Button title="Volver" onPress={onBack} />
      <Text style={styles.title}>Viewer (Visualizador)</Text>
      <Text style={{ marginBottom: 10 }}>Cámaras disponibles:</Text>
      {cameras.length === 0 ? (
        <Text>No hay cámaras conectadas en este grupo.</Text>
      ) : (
        cameras.map((cam) => (
          <Button
            key={cam}
            title={cam}
            color={selectedCamera === cam ? 'green' : undefined}
            onPress={() => setSelectedCamera(cam)}
          />
        ))
      )}
      <Button title="Iniciar transmisión" onPress={iniciarTransmision} />
      {remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={styles.video} />
      ) : (
        <Text>Esperando transmisión...</Text>
      )}
      <Text style={styles.status}>{status}</Text>
      {/* Debug info */}
      <Text style={{color:'red',fontSize:12}}>
        Stream: {remoteStream ? 'OK' : 'NO'} | 
        {remoteStream && remoteStream.getTracks && `Tracks: ${remoteStream.getTracks().length}`}
        {remoteStream && remoteStream.getTracks && remoteStream.getTracks().map((t:any,i:number)=>` [${i}]:${t.kind}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  video: { width: 300, height: 400, alignSelf: 'center', backgroundColor: '#000' },
  status: { marginTop: 20, textAlign: 'center', color: '#555' },
});
