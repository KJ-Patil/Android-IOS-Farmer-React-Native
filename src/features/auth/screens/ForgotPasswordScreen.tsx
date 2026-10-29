import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

export function ForgotPasswordScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [step, setStep] = useState<'mobile' | 'otp' | 'password'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = () => {
    if (step === 'mobile') setStep('otp');
    else if (step === 'otp') setStep('password');
    else if (step === 'password') {
      if (password === confirmPassword && password.length >= 6) {
        navigation.navigate('Login');
      }
    }
  };

  const titles = { mobile: t('mobileNumber'), otp: t('otpVerification'), password: t('setNewPassword') };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.foreground }]}>{t('resetPassword')}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedFg }]}>{titles[step]}</Text>

        <Card style={{ marginTop: 20 }}>
          {step === 'mobile' && (
            <Input label={t('mobileNumber')} value={mobile} onChangeText={(v) => setMobile(v.replace(/[^0-9]/g, '').slice(0, 10))} keyboardType="phone-pad" maxLength={10} />
          )}
          {step === 'otp' && (
            <Input label={t('enterOtp')} value={otp} onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
          )}
          {step === 'password' && (
            <>
              <Input label={t('setNewPassword')} value={password} onChangeText={setPassword} secureTextEntry />
              <Input label={t('confirm')} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            </>
          )}
          <Button title={step === 'password' ? t('submit') : t('next')} onPress={handleSubmit} fullWidth />
        </Card>

        <Button title={t('back')} onPress={() => navigation.goBack()} variant="ghost" style={{ marginTop: 16 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
});
