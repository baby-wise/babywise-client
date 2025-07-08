import React, { useEffect, useRef, useState } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { mediaDevices, RTCPeerConnection, RTCView } from 'react-native-webrtc';

const SIGNALING_URL = 'ws://192.168.0.16:3001';

export default function Viewer({ onBack }: { onBack?: () => void }) {
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [status, setStatus] = useState('');
  const ws = useRef<WebSocket | null>(null);
  const pc = useRef<any>(null);

  useEffect(() => {
    ws.current = new WebSocket(SIGNALING_URL);

    ws.current.onopen = () => {
      // Identificarse como viewer
      ws.current?.send(JSON.stringify({ type: 'identify', role: 'viewer' }));
    };

    ws.current.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'offer') {
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
        pc.current.onicecandidate = (event: any) => {
          if (event.candidate) {
            ws.current?.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
          }
        };
        pc.current.ontrack = (event: any) => {
          setRemoteStream(event.streams[0]);
        };
        await pc.current.setRemoteDescription(data.offer);
        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);
        ws.current && ws.current.send(JSON.stringify({ type: 'answer', answer }));
        setStatus('Transmisión iniciada. Recibiendo video...');
      }
      if (data.type === 'candidate' && pc.current) {
        await pc.current.addIceCandidate(data.candidate);
      }
    };

    return () => {
      ws.current && ws.current.close();
      pc.current && pc.current.close();
    };
  }, []);

  const iniciarTransmision = () => {
    setStatus('Solicitando transmisión al emisor...');
    ws.current?.send(JSON.stringify({ type: 'request-offer' }));
  };

  return (
    <View style={styles.container}>
      <Button title="Volver" onPress={onBack} />
      <Text style={styles.title}>Viewer (Visualizador)</Text>
      <Button title="Iniciar transmisión" onPress={iniciarTransmision} />
      {remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={styles.video} />
      ) : (
        <Text>Esperando transmisión...</Text>
      )}
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
