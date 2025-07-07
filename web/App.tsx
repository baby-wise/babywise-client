/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Button, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import WebSocketTester from './WebSocketTester';

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <WebSocketTester />
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
