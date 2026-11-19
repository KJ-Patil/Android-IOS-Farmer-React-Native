import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../app/providers/ThemeProvider';
import { OfflineBanner } from '../ui/OfflineBanner';

interface ScreenLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
  noTopInset?: boolean;
}

export function ScreenLayout({ children, noPadding, noTopInset }: ScreenLayoutProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {!noTopInset && <View style={{ height: insets.top }} />}
      <OfflineBanner />
      <View style={[styles.content, !noPadding && styles.padding]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  padding: { paddingHorizontal: 16 },
});
