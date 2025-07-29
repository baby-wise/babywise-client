import React, { useState } from 'react';
import { View, Button, Text, ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet , TouchableOpacity} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';
import SIGNALING_SERVER_URL from '../siganlingServerUrl';

export default function UploadScreen({ setRole }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = async () => {
    const result = await launchImageLibrary({
      mediaType: 'mixed', // permite audio y video
      selectionLimit: 1,
    });

    if (result.didCancel || !result.assets || !result.assets[0].uri) {
      Alert.alert('Error', 'No se seleccionó ningún archivo');
      return;
    }

    setFile(result.assets[0]); // contiene uri, fileName, type
  };

  const uploadFile = async () => {
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.fileName,
        type: file.type,
      });
      console.log(`${SIGNALING_SERVER_URL}/upload`)
      const res = await axios.post(`${SIGNALING_SERVER_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Éxito', `Archivo subido: ${res.data.fileName}`);
    } catch (e) {
      Alert.alert('Error', 'No se pudo subir el archivo');
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Button title="Seleccionar audio/video" onPress={pickFile} />

        {file && <Text style={styles.fileName}>{file.fileName}</Text>}

        {uploading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          file && <Button title="Subir al backend" onPress={uploadFile} />
        )}
      </ScrollView>
      <TouchableOpacity style={styles.backButton} onPress={() => setRole('home')}>
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    padding: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  fileName: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
    zIndex: 2,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
