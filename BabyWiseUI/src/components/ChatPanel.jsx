import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, FlatList } from 'react-native';
import { completeChat } from '../services/cerebrasClient';
import { Colors, GlobalStyles } from '../styles/Styles';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';

const ChatPanel = ({ initialMessages = [], groupId = null, cameraUid = null, events = [] }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialMessages && initialMessages.length && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    setMessages([]);
    setText('');
    try { Keyboard.dismiss(); } catch (_) {}
  }, [cameraUid]);

  const send = async () => {
    if (!text.trim() || isSending) return;
    const content = text.trim();
    const userMsg = { id: Date.now().toString(), role: 'user', text: content };
    Keyboard.dismiss();
    setMessages(prev => [...prev, userMsg]);
    setText('');
    setIsSending(true);

    try {
      const recentEvents = Array.isArray(events) ? events.slice(-24) : [];
      const eventsSummary = recentEvents.map(e => `- ${e.hour}h: llantos=${e.crying}, movimientos=${e.movement}`).join('\n');
      const systemContent = [
        'Eres un asistente para padres. Responde en español, claro y breve cuando corresponda, y detalla si el usuario lo pide.',
        cameraUid ? `Cámara/niño actual: ${cameraUid}.` : null,
        recentEvents.length ? 'Resumen de actividad (últimas 24 horas):\n' + eventsSummary : 'No hay eventos recientes disponibles.',
        'Usa el historial del chat para mantener contexto.'
      ].filter(Boolean).join('\n');

      const conversation = [
        { role: 'system', content: systemContent },
        ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content }
      ];

      const completion = await completeChat({ messages: conversation });
      const reply = completion || 'No se recibió respuesta del LLM.';
      const assistant = { id: (Date.now() + 1).toString(), role: 'assistant', text: reply };
      setMessages(prev => [...prev, assistant]);
    } catch (e) {
      const assistant = { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Error al contactar con el LLM.' };
      setMessages(prev => [...prev, assistant]);
    } finally {
      setIsSending(false);
    }
  };

  const bottomSpacerHeight = Platform.OS === 'ios' ? 96 : 80;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ marginVertical: 6, marginHorizontal: 10 }}>
              {item.role === 'assistant' && (
                <View style={styles.agentHeader}>
                  <MaterialDesignIcons name="face-agent" size={18} color={Colors.primary} />
                  <Text style={styles.agentName}>Name</Text>
                </View>
              )}
              <View style={[styles.msgRow, item.role === 'user' ? styles.userRow : styles.assistantRow]}>
                <Text style={item.role === 'user' ? styles.msgTextUser : styles.msgTextAssistant} selectable={true}>
                  {item.text}
                </Text>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingVertical: 8, paddingBottom: bottomSpacerHeight + 8, flexGrow: 1 }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={true}
          initialNumToRender={20}
          windowSize={10}
          removeClippedSubviews={false}
        />

        <View style={styles.inputWrapper} pointerEvents="box-none">
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              ref={inputRef}
              style={styles.input}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#999"
              color="#000"
              returnKeyType="send"
              blurOnSubmit={true}
              onSubmitEditing={send}
            />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: Colors.secondary }]} onPress={send}>
              <Text style={GlobalStyles.buttonText}>Enviar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
  },
  agentName: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  msgRow: {
    padding: 10,
    borderRadius: 8,
    maxWidth: '85%',
    minHeight: 44,
  },
  userRow: { alignSelf: 'flex-end', backgroundColor: '#3E5F8A' },
  assistantRow: { alignSelf: 'flex-start', backgroundColor: '#f1f1f1' },
  msgTextUser: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  msgTextAssistant: {
    color: '#222',
    fontSize: 14,
    lineHeight: 20,
  },
  inputWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    zIndex: 1000,
    elevation: 1000,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  inputRow: { flexDirection: 'row', padding: 8, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 8, height: 44 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
});

export default ChatPanel;
