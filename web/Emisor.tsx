import React, { useEffect, useRef, useState } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { mediaDevices, RTCPeerConnection, RTCView } from 'react-native-webrtc';

const SIGNALING_URL = 'ws://192.168.0.16:3001'; // Reemplaza con tu URL de WebSocket

export default function Emisor({ onBack }: { onBack?: () => void }) {
  const [localStream, setLocalStream] = useState<any>(null);
  const [status, setStatus] = useState('');
  const ws = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<any>(null);

  useEffect(() => {
    ws.current = new WebSocket(SIGNALING_URL);
    ws.current.onopen = () => {
      // Identificarse como emisor
      ws.current?.send(JSON.stringify({ type: 'identify', role: 'emisor' }));
    };
    let isMounted = true;
    (async () => {
      setStatus('Solicitando cámara y micrófono...');
      try {
        const stream = await mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
        if (isMounted) {
          setLocalStream(stream);
          localStreamRef.current = stream;
          setStatus('Listo para transmitir');
        }
      } catch (e: any) {
        if (isMounted) setStatus('Error al acceder a cámara/micrófono: ' + (e.message || e.toString()));
      }
    })();
    const handleMessage = async (e: any) => {
      const data = JSON.parse(e.data);
      console.log('Mensaje recibido en emisor:', data); // <-- LOG para depuración
      if (data.type === 'request-offer') {
        if (!localStreamRef.current) {
          setStatus('No hay stream local disponible para transmitir');
          return;
        }
        setStatus('Iniciando transmisión...');
        // Aquí el emisor crea la offer y la envía
        const pc_config = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
          ],
        };
        try {
          const pc = new RTCPeerConnection(pc_config);
          localStreamRef.current.getTracks().forEach((track: any) => pc.addTrack(track, localStreamRef.current));
          pc.onicecandidate = (event: any) => {
            if (event.candidate) {
              ws.current?.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
            }
          };
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.current?.send(JSON.stringify({ type: 'offer', offer }));
          setStatus('Transmisión iniciada. Esperando respuesta del viewer...');
        } catch (e: any) {
          setStatus('Error al crear RTCPeerConnection: ' + e.message);
        }
      }
    };
    ws.current.addEventListener('message', handleMessage);
    return () => {
      isMounted = false;
      ws.current && ws.current.close();
      ws.current?.removeEventListener('message', handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <Button title="Volver" onPress={onBack} />
      <Text style={styles.title}>Emisor (Cámara)</Text>
      {localStream && <RTCView streamURL={localStream.toURL()} style={styles.video} />}
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  video: { width: 300, height: 400, alignSelf: 'center', backgroundColor: '#000' },
  status: { marginTop: 20, textAlign: 'center', color: '#555' },
});
