/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Button, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import WebSocketTester from './WebSocketTester';
import EmisorViewer from './EmisorViewer';
import Emisor from './Emisor';
import Viewer from './Viewer';

export default function App() {
  const [role, setRole] = useState<'emisor' | 'viewer' | null>(null);
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      {role === null && (
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, marginBottom: 20 }}>Selecciona el rol:</Text>
          <Button title="Emisor (Cámara)" onPress={() => setRole('emisor')} />
          <View style={{ marginTop: 10 }}>
            <Button title="Viewer (Visualizador)" onPress={() => setRole('viewer')} />
          </View>
        </View>
      )}
      {role === 'emisor' && <Emisor onBack={() => setRole(null)} />}
      {role === 'viewer' && <Viewer onBack={() => setRole(null)} />}
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
