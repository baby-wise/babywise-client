import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
const ChatPanel = ({ initialMessages = [], groupId = null }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatRef = useRef(null);

  // If parent provides initialMessages after mount, seed the chat only when empty
  useEffect(() => {
    if (initialMessages && initialMessages.length && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  const send = async () => {
    if (!text.trim() || isSending) return;
    const content = text.trim();
    const userMsg = { id: Date.now().toString(), role: 'user', text: content };
    // Optimistically add user's message
    setMessages(prev => {
      return [...prev, userMsg];
    });
    setText('');
    setIsSending(true);

    try {
      // Prepare conversation payload: include prior messages plus the new user message
      const conversation = [...messages, userMsg];

      const payload = {
        UID: groupId,
        // Send the conversation so backend can handle prompt engineering
        conversation,
        // Also include the latest user input for convenience
        userMessage: content,
      };

      const res = await fetch(`${SIGNALING_SERVER_URL}/llm-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data && data.success && data.response) {
        const assistant = { id: (Date.now() + 1).toString(), role: 'assistant', text: data.response };
        setMessages(prev => [...prev, assistant]);
      } else {
        const errMsg = data && data.response ? data.response : 'No se recibió respuesta del servidor.';
        const assistant = { id: (Date.now() + 1).toString(), role: 'assistant', text: errMsg };
        setMessages(prev => [...prev, assistant]);
      }
    } catch (error) {
      console.error('Error sending message to backend:', error);
      const assistant = { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Error al contactar con el servidor.' };
      setMessages(prev => [...prev, assistant]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView
        ref={flatRef}
        contentContainerStyle={{ paddingVertical: 8 }}
        nestedScrollEnabled={true}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(item => (
          <View key={item.id} style={[styles.msgRow, item.role === 'user' ? styles.userRow : styles.assistantRow]}>
            <Text style={item.role === 'user' ? styles.msgTextUser : styles.msgTextAssistant}>{item.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput value={text} onChangeText={setText} style={styles.input} placeholder="Escribe un mensaje..." />
        <TouchableOpacity style={styles.sendBtn} onPress={send}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 200 },
  msgRow: { marginVertical: 6, marginHorizontal: 10, padding: 10, borderRadius: 8, maxWidth: '80%' },
  userRow: { alignSelf: 'flex-end', backgroundColor: '#3E5F8A' },
  assistantRow: { alignSelf: 'flex-start', backgroundColor: '#f1f1f1' },
  msgTextUser: { color: '#fff' },
  msgTextAssistant: { color: '#222' },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderColor: '#eee', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 8 },
  sendBtn: { backgroundColor: '#3E5F8A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 }
});

export default ChatPanel;
