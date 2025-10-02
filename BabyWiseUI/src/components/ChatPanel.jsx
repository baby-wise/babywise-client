import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';
import { Colors, GlobalStyles } from '../styles/Styles';
const ChatPanel = ({ initialMessages = [], groupId = null, cameraUid = null }) => {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatRef = useRef(null);
  const inputRef = useRef(null);

  // If parent provides initialMessages after mount, seed the chat only when empty
  useEffect(() => {
    if (initialMessages && initialMessages.length && messages.length === 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Auto-scroll whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        try {
          flatRef.current?.scrollToEnd({ animated: true });
        } catch (e) {
          // ignore
        }
      }, 100);
    }
  }, [messages]);

  // Clear chat when camera changes
  useEffect(() => {
    // reset messages and input when camera changes
    setMessages([]);
    setText('');
    try {
      Keyboard.dismiss();
    } catch (e) {}
  }, [cameraUid]);

  const send = async () => {
    if (!text.trim() || isSending) return;
    const content = text.trim();
    const userMsg = { id: Date.now().toString(), role: 'user', text: content };
    
    // Dismiss keyboard immediately before adding message
    Keyboard.dismiss();
    
    // Optimistically add user's message
    setMessages(prev => {
      const newMessages = [...prev, userMsg];
      // Trigger scroll after state update
      setTimeout(() => {
        try {
          flatRef.current?.scrollToEnd({ animated: true });
        } catch (e) {
          // ignore
        }
      }, 50);
      return newMessages;
    });
    setText('');
    setIsSending(true);

    try {
      // Prepare conversation payload: include prior messages plus the new user message
      const conversation = [...messages, userMsg];

      const payload = {
        UID: groupId,
        cameraUid: cameraUid, // Incluir la cámara específica
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
        setMessages(prev => {
          const newMessages = [...prev, assistant];
          // Trigger scroll after assistant message
          setTimeout(() => {
            try {
              flatRef.current?.scrollToEnd({ animated: true });
            } catch (e) {
              // ignore
            }
          }, 50);
          return newMessages;
        });
      } else {
        const errMsg = data && data.response ? data.response : 'No se recibió respuesta del servidor.';
        const assistant = { id: (Date.now() + 1).toString(), role: 'assistant', text: errMsg };
        setMessages(prev => {
          const newMessages = [...prev, assistant];
          // Trigger scroll after error message
          setTimeout(() => {
            try {
              flatRef.current?.scrollToEnd({ animated: true });
            } catch (e) {
              // ignore
            }
          }, 50);
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error sending message to backend:', error);
      const assistant = { id: (Date.now() + 1).toString(), role: 'assistant', text: 'Error al contactar con el servidor.' };
      setMessages(prev => {
        const newMessages = [...prev, assistant];
        // Trigger scroll after error message
        setTimeout(() => {
          try {
            flatRef.current?.scrollToEnd({ animated: true });
          } catch (e) {
            // ignore
          }
        }, 50);
        return newMessages;
      });
    } finally {
      setIsSending(false);
    }
  };

  // Autoscroll: use onContentSizeChange for reliable scrolling
  const handleContentSizeChange = () => {
    // Usar setTimeout más largo para mensajes largos
    setTimeout(() => {
      try {
        flatRef.current?.scrollToEnd({ animated: true });
      } catch (e) {
        // ignore
      }
    }, 150);
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, styles.chartContainer]}>
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={flatRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingVertical: 8,
              paddingBottom: 140,
              flexGrow: 1,
              minHeight: '100%'
            }}
            onContentSizeChange={() => handleContentSizeChange()}
            onLayout={() => handleContentSizeChange()}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={true}
            scrollEnabled={true}
            bounces={true}
            alwaysBounceVertical={false}
          >
            {messages.map(item => (
              <View key={item.id} style={[styles.msgRow, item.role === 'user' ? styles.userRow : styles.assistantRow]}>
                <Text 
                  style={item.role === 'user' ? styles.msgTextUser : styles.msgTextAssistant}
                  selectable={true}
                >
                  {item.text}
                </Text>
              </View>
            ))}
          </ScrollView>

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
                onSubmitEditing={() => send()}
              />
              <TouchableOpacity style={[styles.sendBtn, {backgroundColor: Colors.secondary}]} onPress={send}>
                <Text style={GlobalStyles.buttonText}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  msgRow: { 
    marginVertical: 6, 
    marginHorizontal: 10, 
    padding: 10, 
    borderRadius: 8, 
    maxWidth: '85%',
    minHeight: 44,
    flexShrink: 1
  },
  userRow: { alignSelf: 'flex-end', backgroundColor: '#3E5F8A' },
  assistantRow: { alignSelf: 'flex-start', backgroundColor: '#f1f1f1' },
  msgTextUser: { 
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap',
    flexShrink: 1
  },
  msgTextAssistant: { 
    color: '#222',
    fontSize: 14,
    lineHeight: 20,
    flexWrap: 'wrap',
    flexShrink: 1
  },
  inputWrapper: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', paddingBottom: Platform.OS === 'ios' ? 16 : 8, zIndex: 1000, elevation: 1000, borderTopWidth: 1, borderTopColor: '#eee' },
  inputRow: { flexDirection: 'row', padding: 8, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 8, height: 44 },
  sendBtn: { backgroundColor: '#3E5F8A', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    }}
});

export default ChatPanel;
