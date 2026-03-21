import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Events App</Text>
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={styles.loading}>Verification session...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b5ed7',
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 24,
  },
  loading: {
    color: '#ffffff',
    marginTop: 14,
    fontSize: 14,
  },
});
