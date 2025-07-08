import React, { useEffect, useRef, useState } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { mediaDevices, RTCPeerConnection, RTCView } from 'react-native-webrtc';

const SIGNALING_URL = 'ws://192.168.0.16:3001';

export default function EmisorViewer({ role = 'emisor', onBack }: { role?: 'emisor' | 'viewer', onBack?: () => void }) {
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [status, setStatus] = useState('');
  const ws = useRef<WebSocket | null>(null);
  const pc = useRef<any>(null);

  useEffect(() => {
    ws.current = new WebSocket(SIGNALING_URL);

    ws.current.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      if (role === 'emisor') {
        if (data.type === 'answer') {
          await pc.current.setRemoteDescription(data.answer);
        }
        if (data.type === 'candidate') {
          await pc.current.addIceCandidate(data.candidate);
        }
      } else if (role === 'viewer') {
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
        }
        if (data.type === 'candidate' && pc.current) {
          await pc.current.addIceCandidate(data.candidate);
        }
      }
    };

    return () => {
      ws.current && ws.current.close();
      pc.current && pc.current.close();
    };
  }, [role]);

  // Nuevo: getUserMedia apenas se renderiza la view de cámara (rol emisor)
  useEffect(() => {
    if (role === 'emisor' && !localStream) {
      (async () => {
        setStatus('Solicitando cámara y micrófono...');
        try {
          const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
          setLocalStream(stream);
          setStatus('Listo para transmitir');
        } catch (e) {
          setStatus('Error al acceder a cámara/micrófono');
        }
      })();
    }
  }, [role]);

  const startStream = async () => {
    setStatus('Creando conexión P2P...');
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
    try {
      pc.current = new RTCPeerConnection(pc_config);
      console.log('Conexión P2P creada');
      localStream.getTracks().forEach((track: any) => pc.current.addTrack(track, localStream));
      console.log('Cámara y micrófono añadidos a la conexión P2P');
      pc.current.onicecandidate = (event: any) => {
        if (event.candidate) {
          ws.current?.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
          console.log('Candidato ICE enviado');
        }
      };
      const offer = await pc.current.createOffer();
      console.log('Oferta creada, enviando al viewer...');
      await pc.current.setLocalDescription(offer);
      console.log('Oferta enviada al viewer');
      ws.current?.send(JSON.stringify({ type: 'offer', offer }));
      console.log('Transmisión iniciada. Esperando viewer...');
    } catch (e: any) {
      console.log('Error al crear RTCPeerConnection: ' + e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Volver" onPress={onBack} />
      <Text style={styles.title}>{role === 'emisor' ? 'Emisor (Cámara)' : 'Viewer (Visualizador)'}</Text>
      {role === 'emisor' && (
        <>
          {localStream && <RTCView streamURL={localStream.toURL()} style={styles.video} />}
          <Button title="Iniciar transmisión" onPress={startStream} disabled={!localStream} />
        </>
      )}
      {role === 'viewer' && (
        <>
          {remoteStream ? (
            <RTCView streamURL={remoteStream.toURL()} style={styles.video} />
          ) : (
            <Text>Esperando transmisión...</Text>
          )}
        </>
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
