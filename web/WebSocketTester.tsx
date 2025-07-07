import React, { useEffect, useRef, useState } from 'react';
import { View, Button, Text, StyleSheet, TextInput, ScrollView } from 'react-native';

export default function WebSocketTester() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Cambia la IP y puerto si es necesario
    ws.current = new WebSocket('ws://192.168.0.16:3001');

    ws.current.onopen = () => {
      setMessages((prev) => [...prev, 'Conectado al WebSocket']);
    };

    ws.current.onmessage = (e) => {
      setMessages((prev) => [...prev, `Recibido: ${e.data}`]);
    };

    ws.current.onerror = (e) => {
      setMessages((prev) => [...prev, `Error: ${e.message}`]);
    };

    ws.current.onclose = () => {
      setMessages((prev) => [...prev, 'WebSocket cerrado']);
    };

    return () => {
      ws.current && ws.current.close();
    };
  }, []);

  const enviarMensaje = () => {
    if (ws.current && input.trim()) {
      ws.current.send(input);
      setMessages((prev) => [...prev, `Enviado: ${input}`]);
      setInput('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test WebSocket</Text>
      <ScrollView style={styles.messages}>
        {messages.map((msg, idx) => (
          <Text key={idx} style={styles.message}>{msg}</Text>
        ))}
      </ScrollView>
      <TextInput
        style={styles.input}
        value={input}
        onChangeText={setInput}
        placeholder="Escribe un mensaje"
      />
      <Button title="Enviar mensaje" onPress={enviarMensaje} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  messages: { flex: 1, marginBottom: 20 },
  message: { fontSize: 16, marginVertical: 2 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 10 },
});
