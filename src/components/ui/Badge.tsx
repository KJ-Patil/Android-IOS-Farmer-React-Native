import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../app/providers/ThemeProvider';

interface BadgeProps {
  text: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
}

export function Badge({ text, variant = 'default' }: BadgeProps) {
  const { colors } = useTheme();

  const bgMap = {
    default: colors.muted,
    success: colors.primary + '20',
    warning: colors.warning + '20',
    destructive: colors.destructive + '20',
    info: colors.info + '20',
  };

  const fgMap = {
    default: colors.mutedFg,
    success: colors.primary,
    warning: colors.warning,
    destructive: colors.destructive,
    info: colors.info,
  };

  return (
    <View style={[styles.badge, { backgroundColor: bgMap[variant], borderRadius: 6 }]}>
      <Text style={[styles.text, { color: fgMap[variant] }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
});
