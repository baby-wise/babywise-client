import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Keyboard, FlatList } from 'react-native';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { completeChat } from '../services/cerebrasClient';
import { Colors, GlobalStyles } from '../styles/Styles';

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
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          item.role === 'assistant' ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <MaterialDesignIcons name="face-agent" size={22} color="#888" style={{ marginRight: 6, marginBottom: 2 }} />
              <View style={[styles.msgRow, styles.assistantRow, { maxWidth: '75%' }]}> 
                <Text style={styles.msgTextAssistant} selectable={true}>
                  {item.text}
                </Text>
              </View>
            </View>
          ) : (
            <View style={[styles.msgRow, styles.userRow, { maxWidth: '75%' }]}> 
              <Text style={styles.msgTextUser} selectable={true}>
                {item.text}
              </Text>
            </View>
          )
        )}
        contentContainerStyle={{ paddingVertical: 8, paddingBottom: bottomSpacerHeight + 8, flexGrow: 1 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={true}
        initialNumToRender={20}
        windowSize={10}
        removeClippedSubviews={false}
      />

      {/* Input row now outside the inner container, edge-to-edge */}
      <View style={styles.inputWrapper} pointerEvents="box-none">
        <View style={styles.inputRowOuter}>
          {/* White background bar, full width, behind input row */}
          <View style={styles.inputRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                value={text}
                onChangeText={setText}
                ref={inputRef}
                style={[styles.input, { borderTopRightRadius: 22, borderBottomRightRadius: 22, maxWidth: '90%',  zIndex: 1 }]}
                placeholder="Escribe un mensaje..."
                placeholderTextColor="#999"
                color="#000"
                returnKeyType="send"
                blurOnSubmit={true}
                onSubmitEditing={send}
              />
            </View>
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: Colors.primary, marginLeft: -22, zIndex: 1 }]} onPress={send}>
              <MaterialDesignIcons name="send" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  msgRow: {
    marginVertical: 6,
    marginHorizontal: 0,
    padding: 10,
    borderRadius: 18,
    maxWidth: '98%',
    minHeight: 32,
    alignSelf: 'stretch',
  },
  userRow: { alignSelf: 'flex-end', backgroundColor: Colors.secondary },
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
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 16 : 8,
    zIndex: 1000,
    elevation: 1000,
    borderTopWidth: 0,
    alignItems: 'center',
  },

  inputRowOuter: {
    width: '100%',
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    width: '98%',
    alignSelf: 'center',
    marginHorizontal: 0,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 0,
    marginRight: 0,
    height: 44,
    color: '#000',
    fontSize: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#3E5F8A',
    borderRadius: 22,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
});

export default ChatPanel;
