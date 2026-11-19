import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { fontSizes } from '../../shared/utils/typography';

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>The app ran into an unexpected error.</Text>

          <TouchableOpacity
            onPress={this.handleRestart}
            style={styles.restartBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.restartBtnText}>Restart App</Text>
          </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: '#0F1512', padding: 24, paddingTop: 80, alignItems: 'center' },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: fontSizes.xl, fontWeight: '700', color: '#F87171', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: fontSizes.base, color: '#9CA3AF', marginBottom: 24, textAlign: 'center' },
  restartBtn: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  restartBtnText: { color: '#FFFFFF', fontSize: fontSizes.md, fontWeight: '700' },
  scroll: { flex: 1, width: '100%', backgroundColor: '#1A2820', borderRadius: 12, padding: 14 },
  error: { fontSize: fontSizes.base, color: '#F87171', marginBottom: 12, fontWeight: '600' },
  stack: { fontSize: fontSizes.xs, color: '#9CA3AF', lineHeight: 18 },
});
