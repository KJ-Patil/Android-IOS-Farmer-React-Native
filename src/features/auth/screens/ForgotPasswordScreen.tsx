import React, { useState } from 'react';
import { Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { fontSizes } from '../../../shared/utils/typography';

export function ForgotPasswordScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<'mobile' | 'otp' | 'password'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (step === 'mobile') {
      if (!mobile || mobile.length < 10) errs.mobile = t('mobileRequired');
      setFieldErrors(errs);
      if (Object.keys(errs).length === 0) setStep('otp');
    } else if (step === 'otp') {
      if (!otp || otp.length < 6) errs.otp = t('otpRequired');
      setFieldErrors(errs);
      if (Object.keys(errs).length === 0) setStep('password');
    } else if (step === 'password') {
      if (password.length < 6) errs.password = t('passwordMinLength');
      if (password !== confirmPassword) errs.confirmPassword = t('passwordMismatch');
      setFieldErrors(errs);
      if (Object.keys(errs).length === 0) navigation.navigate('Login');
    }
  };

  const titles = { mobile: t('mobileNumber'), otp: t('otpVerification'), password: t('setNewPassword') };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.foreground }]}>{t('resetPassword')}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedFg }]}>{titles[step]}</Text>

        <Card style={{ marginTop: 20 }}>
          {step === 'mobile' && (
            <Input
              label={t('mobileNumber')}
              value={mobile}
              onChangeText={(v) => { setMobile(v.replace(/[^0-9]/g, '').slice(0, 10)); setFieldErrors((e) => ({ ...e, mobile: '' })); }}
              keyboardType="phone-pad"
              maxLength={10}
              error={fieldErrors.mobile}
            />
          )}
          {step === 'otp' && (
            <Input
              label={t('enterOtp')}
              value={otp}
              onChangeText={(v) => { setOtp(v.replace(/[^0-9]/g, '').slice(0, 6)); setFieldErrors((e) => ({ ...e, otp: '' })); }}
              keyboardType="number-pad"
              maxLength={6}
              error={fieldErrors.otp}
            />
          )}
          {step === 'password' && (
            <>
              <Input
                label={t('setNewPassword')}
                value={password}
                onChangeText={(v) => { setPassword(v); setFieldErrors((e) => ({ ...e, password: '' })); }}
                secureTextEntry
                error={fieldErrors.password}
              />
              <Input
                label={t('confirm')}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); setFieldErrors((e) => ({ ...e, confirmPassword: '' })); }}
                secureTextEntry
                error={fieldErrors.confirmPassword}
              />
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
  scroll: { flexGrow: 1, padding: 24 },
  title: { fontSize: fontSizes.xl, fontWeight: '700' },
  subtitle: { fontSize: fontSizes.base, marginTop: 4 },
});
