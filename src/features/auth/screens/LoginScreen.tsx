import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, Dimensions, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useAuthStore } from '../../../shared/hooks/useAuthStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SUPPORTED_LANGUAGES } from '../../../shared/locales/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WAVE_HEIGHT = 220;

export function LoginScreen({ navigation }: any) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const {
    requestOtp,
    verifyOtp,
    loginWithVerifiedMobile,
    otpSent,
    isLoading,
    error,
    clearError,
    fetchUserProfile,
  } = useAuthStore();

  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [loginError, setLoginError] = useState('');

  const [langPickerOpen, setLangPickerOpen] = useState(false);

  const currentLangLabel = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)?.nativeLabel || 'English';

  const handleRequestOtp = async () => {
    if (mobile.length !== 10) return;
    clearError();
    setLoginError('');
    await requestOtp(mobile);
    setStep('otp');
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    clearError();
    setLoginError('');

    const success = await verifyOtp(otp);
    if (!success) return;

    try {
      const loggedIn = await loginWithVerifiedMobile(mobile);
      if (loggedIn) {
        console.log('LOGIN SUCCESS');
      } else {
        console.log('NAVIGATING TO REGISTER');
        navigation.navigate('Register', { mobile });
      }
    } catch (e: any) {
      console.log('LOGIN FAILED:', e?.code, e?.message);
      setLoginError(e?.message || t('loginFailed'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Wave Header */}
      <View style={styles.waveContainer}>
        <Svg width={SCREEN_WIDTH} height={WAVE_HEIGHT} viewBox={`0 0 ${SCREEN_WIDTH} ${WAVE_HEIGHT}`}>
          <Defs>
            <LinearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#16A34A" />
              <Stop offset="1" stopColor="#15803D" />
            </LinearGradient>
          </Defs>
          <Path
            d={`M0,0 L${SCREEN_WIDTH},0 L${SCREEN_WIDTH},${WAVE_HEIGHT * 0.65} Q${SCREEN_WIDTH * 0.75},${WAVE_HEIGHT * 0.95} ${SCREEN_WIDTH * 0.5},${WAVE_HEIGHT * 0.78} Q${SCREEN_WIDTH * 0.25},${WAVE_HEIGHT * 0.6} 0,${WAVE_HEIGHT * 0.85} Z`}
            fill="url(#waveGrad)"
          />
          <Path
            d={`M0,0 L${SCREEN_WIDTH},0 L${SCREEN_WIDTH},${WAVE_HEIGHT * 0.55} Q${SCREEN_WIDTH * 0.65},${WAVE_HEIGHT * 0.82} ${SCREEN_WIDTH * 0.4},${WAVE_HEIGHT * 0.7} Q${SCREEN_WIDTH * 0.15},${WAVE_HEIGHT * 0.58} 0,${WAVE_HEIGHT * 0.75} Z`}
            fill="#22C55E"
            opacity={0.3}
          />
        </Svg>
        <TouchableOpacity onPress={() => setLangPickerOpen(true)} style={styles.langBtn}>
          <Text style={[styles.langText, { color: '#FFFFFF' }]}>
            {currentLangLabel}
          </Text>
        </TouchableOpacity>
        <View style={styles.waveLogoWrap}>
          <View style={styles.waveLogo}>
            <Text style={styles.logoText}>F</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t('appName')}
        </Text>

        <Card style={styles.card}>
          {step === 'mobile' ? (
            <>
              <Input
                label={t('mobileNumber')}
                placeholder={t('enterMobile')}
                value={mobile}
                onChangeText={(text) => setMobile(text.replace(/[^0-9]/g, '').slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <Button
                title={t('requestOtp')}
                onPress={handleRequestOtp}
                loading={isLoading}
                disabled={mobile.length !== 10}
                fullWidth
                style={{ marginTop: 4 }}
              />
            </>
          ) : (
            <>
              <Text style={[styles.otpInfo, { color: colors.mutedFg }]}>
                {t('otpSent')} +91 {mobile}
              </Text>
              <Input
                label={t('enterOtp')}
                placeholder="000000"
                value={otp}
                onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
              <Button
                title={t('verifyOtp')}
                onPress={handleVerifyOtp}
                loading={isLoading}
                disabled={otp.length !== 6}
                fullWidth
                style={{ marginTop: 4 }}
              />
              <TouchableOpacity onPress={() => { setStep('mobile'); setOtp(''); setLoginError(''); clearError(); }} style={styles.backLink}>
                <Text style={{ color: colors.primary }}>{t('back')}</Text>
              </TouchableOpacity>
            </>
          )}

          {(error || loginError) && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error || loginError}</Text>
          )}
        </Card>

        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text style={[styles.orText, { color: colors.mutedFg }]}>{t('or')}</Text>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>

        <Button
          title={t('signInWithGoogle')}
          onPress={() => {}}
          variant="outline"
          fullWidth
          style={{ marginBottom: 12 }}
        />

        {Platform.OS === 'ios' && (
          <Button
            title={t('signInWithApple')}
            onPress={() => {}}
            variant="outline"
            fullWidth
            style={{ marginBottom: 12 }}
          />
        )}

        <View style={styles.footer}>
          <Text style={{ color: colors.mutedFg }}>{t('dontHaveAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('register')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={langPickerOpen} transparent animationType="fade">
        <TouchableOpacity
          style={styles.langModalOverlay}
          activeOpacity={1}
          onPress={() => setLangPickerOpen(false)}
        >
          <View style={[styles.langModalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.langModalTitle, { color: colors.foreground }]}>{t('language')}</Text>
            <View style={styles.langModalGrid}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  onPress={() => {
                    i18n.changeLanguage(lang.code);
                    setLangPickerOpen(false);
                  }}
                  style={[
                    styles.langModalBtn,
                    {
                      borderColor: i18n.language === lang.code ? colors.primary : colors.border,
                      backgroundColor: i18n.language === lang.code ? colors.primary + '15' : colors.card,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: i18n.language === lang.code ? colors.primary : colors.foreground,
                      fontWeight: '700',
                      fontSize: 15,
                    }}
                  >
                    {lang.nativeLabel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  waveContainer: { position: 'relative', width: '100%', height: WAVE_HEIGHT },
  langBtn: { position: 'absolute', top: 48, right: 16, padding: 8, zIndex: 10 },
  langText: { fontSize: 16, fontWeight: '700' },
  waveLogoWrap: { position: 'absolute', bottom: 10, alignSelf: 'center', width: '100%', alignItems: 'center' },
  waveLogo: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
  logoText: { color: '#16A34A', fontSize: 34, fontWeight: '800' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 8 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  card: { marginBottom: 20 },
  otpInfo: { fontSize: 13, marginBottom: 12 },
  backLink: { marginTop: 12, alignItems: 'center' },
  errorText: { marginTop: 12, fontSize: 13, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1 },
  orText: { marginHorizontal: 12, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  langModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  langModalCard: { width: '100%', maxWidth: 380, borderRadius: 16, padding: 20 },
  langModalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 14, textAlign: 'center' },
  langModalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  langModalBtn: { width: '30%', flexGrow: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1.5, borderRadius: 10 },
});
