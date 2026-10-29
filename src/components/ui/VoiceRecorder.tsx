import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../app/providers/ThemeProvider';
import { useTranslation } from 'react-i18next';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string) => void;
}

export function VoiceRecorder({ onRecordingComplete: _ }: VoiceRecorderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
        {t('voiceNote')} (coming soon)
      </Text>
    </View>
  );
}
