import React, { useState } from "react";
import { ActivityIndicator, Button, View, StyleSheet, Text } from 'react-native'; // Ajout de Text
import { WebView } from 'react-native-webview';

export default function AgendaScreen() {
  const [key, setKey] = useState(0);
  const [loading, setLoading] = useState(true);

  return (
    <View style={{ flex: 1 }}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text> {/* Ajout du texte */}
        </View>
      )}

      <WebView 
        key={key} 
        source={{ uri: 'https://bonndia-peddidos.fly.dev/scheduling?token=F6EpNSQzQ0qj4gz1Hyiajg==' }}
        style={{ flex: 1 }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />

      <Button title="Reload" onPress={() => {
        setLoading(true);
        setKey(prevKey => prevKey + 1);
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {  // Ajout du style pour le texte
    marginTop: 10,
    fontSize: 16,
    color: '#007AFF'
  }
});
