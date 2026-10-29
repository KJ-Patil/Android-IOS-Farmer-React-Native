import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../app/providers/ThemeProvider';

interface SpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export function Spinner({ message, size = 'large' }: SpinnerProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <Text style={[styles.message, { color: colors.mutedFg }]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  message: { marginTop: 12, fontSize: 14 },
});
