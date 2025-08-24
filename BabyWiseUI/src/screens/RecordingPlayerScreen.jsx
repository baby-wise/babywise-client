import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import Video from 'react-native-video';

const RecordingPlayerScreen = ({ navigation, route }) => {
  const { recording } = route.params;
  console.log('[UI] Reproduciendo grabación:', recording);

  return (
    <View style={styles.container}>
      <Button title="Volver" onPress={() => navigation.goBack()} />
      <Text style={styles.title}>Reproduciendo grabacion del {recording.date} a las {recording.time}</Text>
      <Video
        source={{ uri: recording.playlistUrl }}
        controls
        style={styles.video}
        resizeMode="contain"
        poster={
            posterResizeMode="cover"
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 8 },
  title: { color: '#fff', fontSize: 18, marginBottom: 12 },
  video: { width: '100%', height: 300, backgroundColor: '#222' },
});

export default RecordingPlayerScreen;
