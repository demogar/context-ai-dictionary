import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet } from 'react-native';

import { Text, View } from '../components/Themed';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>This is a way to learn words in Italian easily, by using a contextualized dictionary from things you see.  It uses AI (Artificial Intelligence) to detect objects from a photo.</Text>

      <Text style={styles.text}>It uses TensorFlow, React Native, Expo, Google Translante, and COCO-SSD Model.</Text>

      <Text style={styles.text}>Developed by Demostenes Garcia (@demogar).</Text>

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  text: {
    fontSize: 14,
    marginBottom: 10,
  },
});
