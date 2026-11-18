import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../../app/providers/ThemeProvider';
import { fontSizes } from '../../shared/utils/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, containerStyle, style, ...props }: InputProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      )}
      <TextInput
        placeholderTextColor={colors.mutedFg}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            color: colors.foreground,
            borderColor: error ? colors.destructive : colors.border,
            borderRadius: colors.radius,
          },
          style,
        ]}
        {...props}
      />
      {error && (
        <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: fontSizes.base, fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSizes.md,
    minHeight: 48,
  },
  error: { fontSize: fontSizes.sm, marginTop: 4 },
});
