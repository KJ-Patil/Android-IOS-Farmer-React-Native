import React from 'react';
import { View, StyleSheet, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../app/providers/ThemeProvider';
import { OfflineBanner } from '../ui/OfflineBanner';

const STATUS_BAR_HEIGHT = RNStatusBar.currentHeight || 0;

interface ScreenLayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
  noTopInset?: boolean;
}

export function ScreenLayout({ children, noPadding, noTopInset }: ScreenLayoutProps) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {!noTopInset && <View style={{ height: STATUS_BAR_HEIGHT }} />}
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
