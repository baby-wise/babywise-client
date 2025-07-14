import React, { useEffect, useRef, useState } from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { RTCPeerConnection, RTCView, RTCSessionDescription, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';
import io from 'socket.io-client';
import SIGNALING_URL from '../socket.ts'

export default function Camera({ email, onBack }: { email: string; onBack?: () => void }) {
  const [localStream, setLocalStream] = useState<any>(null);
  const [status, setStatus] = useState('');
  const ws = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const pc = useRef<any>(null);

  useEffect(() => {
    ws.current = io(SIGNALING_URL);

    ws.current.on('connect', () => {
      ws.current.emit('email', { email, type: 'camera' });
      ws.current.emit('add-cameras-list', { email });
    });

    ws.current.on('offer', async (payload: any) => {
      // El emisor recibe la offer como {sdp, callerId, email}
      setStatus('Recibida offer del viewer. Creando answer...');
      const pc_config = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:124.64.206.224:8800' },
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
      
      setStatus('Antes de pc.current = new RTCPeerConnection(pc_config);');

      pc.current = new RTCPeerConnection(pc_config);
      if(localStreamRef.current) {
        setStatus('Agregando tracks locales a la conexión.');
        localStreamRef.current.getTracks().forEach((track: any) => {
          console.log('Track enviado')
          pc.current.addTrack(track, localStreamRef.current);
        });
      }
      pc.current.onicecandidate = (event: any) => {
        if (event.candidate) {
          ws.current.emit('ice-candidate', {
            candidate: event.candidate,
            targetId: payload.callerId,
            email,
          });
        }
      };
      pc.current.ontrack = (event: any) => {
        // Si en el futuro el emisor recibe streams, se pueden mostrar aquí
        // Por ahora, solo logueamos
        setStatus('Recibido track remoto (no se muestra en emisor)');
      };

      setStatus('Antes de await pc.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));');

      await pc.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      
      setStatus('Antes de const answer = await pc.current.createAnswer();');

      const answer = await pc.current.createAnswer();
      
      setStatus('Antes de await pc.current.setLocalDescription(answer);');

      await pc.current.setLocalDescription(answer);
      ws.current.emit('answer', {
        sdp: pc.current.localDescription,
        targetId: payload.callerId,
        email,
      });

      setStatus('Answer enviada al viewer. Transmisión activa.');

    });

    ws.current.on('ice-candidate', async (payload: any) => {
    console.log('📥 Camera recibió ICE candidate:', payload.candidate);
    try {
      await pc.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
    } catch (e) {
      console.error('❌ Error ICE candidate (camera):', e);
    }
  });

    ws.current.on('disconnected-camera', (payload: any) => {
      setStatus('Viewer desconectado. Esperando nueva conexión...');
    });

    let isMounted = true;
    (async () => {
      setStatus('Solicitando cámara y micrófono...');
      try {
        const stream = await mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
        //stream.getTracks().forEach(track => pc.current.addTrack(track, stream)); esto me lo puso el chat
        if (isMounted) {
          setLocalStream(stream);
          localStreamRef.current = stream;
          setStatus('Listo para transmitir');
        }
      } catch (e: any) {
        if (isMounted) setStatus('Error al acceder a cámara/micrófono: ' + (e.message || e.toString()));
      }
    })();

    return () => {
      isMounted = false;
      ws.current && ws.current.disconnect();
      pc.current && pc.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    
  }, []);

  return (
    <View style={styles.container}>
      <Button title="Volver" onPress={onBack} />
      <Text style={styles.title}>Emisor (Cámara)</Text>
      {localStream && <RTCView streamURL={localStream.toURL()} style={styles.video} />}
      <Text style={styles.status}>{status}</Text>
      {/* Debug info */}
      <Text style={{color:'red',fontSize:12}}>
        Stream: {localStream ? 'OK' : 'NO'} | Tracks: {localStream ? localStream.getTracks().length : 0}
        {localStream && localStream.getTracks().map((t:any,i:number)=>` [${i}]:${t.kind}`)}
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
