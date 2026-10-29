import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>App Crashed</Text>
          <Text style={styles.subtitle}>Error details below:</Text>
          <ScrollView style={styles.scroll}>
            <Text style={styles.error}>{this.state.error?.message}</Text>
            <Text style={styles.stack}>{this.state.error?.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#e94560', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#eee', marginBottom: 16 },
  scroll: { flex: 1, backgroundColor: '#16213e', borderRadius: 8, padding: 12 },
  error: { fontSize: 14, color: '#e94560', marginBottom: 12, fontWeight: '600' },
  stack: { fontSize: 11, color: '#a8a8a8', lineHeight: 18 },
});
