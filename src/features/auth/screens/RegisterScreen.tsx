import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, KeyboardAvoidingView, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useAuthStore } from '../../../shared/hooks/useAuthStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';
import * as Location from 'expo-location';
import { SUPPORTED_LANGUAGES } from '../../../shared/locales/i18n';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WAVE_HEIGHT = 180;

export function RegisterScreen({ navigation, route }: any) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { register, requestOtp, verifyOtp, isLoading, error, clearError } = useAuthStore();

  const passedMobile = route?.params?.mobile || '';
  const [step, setStep] = useState(passedMobile ? 3 : 1);
  const [form, setForm] = useState({
    mobileNumber: passedMobile,
    otp: '',
    fullName: '',
    village: '',
    taluka: '',
    district: '',
    state: 'Maharashtra',
    pincode: '',
    aadhaarNumber: '',
    dateOfBirth: '',
    farmerId: '',
    geoLocation: undefined as { lat: number; lng: number } | undefined,
    language: i18n.language as 'en' | 'hi' | 'mr' | 'te' | 'ta' | 'kn' | 'bn' | 'gu' | 'ml' | 'pa' | 'od',
    membershipType: 'free' as 'free' | 'gold',
  });

  const updateForm = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleCaptureGps = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        updateForm('geoLocation', { lat: loc.coords.latitude, lng: loc.coords.longitude });
      } else {
        updateForm('geoLocation', { lat: 20.005, lng: 73.765 });
      }
    } catch {
      updateForm('geoLocation', { lat: 20.005, lng: 73.765 });
    }
  };

  const handleNext = async () => {
    clearError();
    if (step === 1) {
      if (form.mobileNumber.length === 10) {
        await requestOtp(form.mobileNumber);
        setStep(2);
      }
    } else if (step === 2) {
      const success = await verifyOtp(form.otp);
      if (success) setStep(3);
    } else if (step === 3) {
      if (form.fullName.trim()) setStep(4);
    } else if (step === 4) {
      await register({
        ...form,
        language: form.language,
        membershipType: form.membershipType,
      });
    }
  };

  const stepTitles = [t('mobileVerification'), t('otpVerification'), t('profileDetails'), t('preferences')];

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
        <View style={styles.waveTitleWrap}>
          <Text style={styles.waveTitle}>{t('register')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.stepLabel, { color: colors.mutedFg }]}>
          {t('step')} {step}/4 — {stepTitles[step - 1]}
        </Text>

        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${(step / 4) * 100}%`, backgroundColor: colors.primary }]} />
        </View>

        <Card style={{ marginTop: 20 }}>
          {step === 1 && (
            <Input
              label={t('mobileNumber')}
              placeholder={t('enterMobile')}
              value={form.mobileNumber}
              onChangeText={(v) => updateForm('mobileNumber', v.replace(/[^0-9]/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              maxLength={10}
            />
          )}

          {step === 2 && (
            <Input
              label={t('enterOtp')}
              placeholder="000000"
              value={form.otp}
              onChangeText={(v) => updateForm('otp', v.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />
          )}

          {step === 3 && (
            <>
              <Input label={t('fullName')} value={form.fullName} onChangeText={(v) => updateForm('fullName', v)} />
              <Input label={t('village')} value={form.village} onChangeText={(v) => updateForm('village', v)} />
              <Input label={t('taluka')} value={form.taluka} onChangeText={(v) => updateForm('taluka', v)} />
              <Input label={t('district')} value={form.district} onChangeText={(v) => updateForm('district', v)} />
              <Input label={t('state')} value={form.state} onChangeText={(v) => updateForm('state', v)} />
              <Input label={t('pincode')} value={form.pincode} onChangeText={(v) => updateForm('pincode', v.replace(/[^0-9]/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
              <Input label={t('aadhaarNumber')} value={form.aadhaarNumber} onChangeText={(v) => updateForm('aadhaarNumber', v.replace(/[^0-9]/g, '').slice(0, 12))} keyboardType="number-pad" maxLength={12} placeholder={t('optional')} />
              <DatePickerInput label={t('dateOfBirth')} value={form.dateOfBirth} onChange={(v) => updateForm('dateOfBirth', v)} />
              <Input label={t('farmerId')} value={form.farmerId} onChangeText={(v) => updateForm('farmerId', v)} placeholder={t('optional')} />
              <Button
                title={form.geoLocation ? t('gpsLocationCaptured') : t('captureGps')}
                onPress={handleCaptureGps}
                variant={form.geoLocation ? 'secondary' : 'outline'}
                fullWidth
                style={{ marginBottom: 8 }}
              />
              {form.geoLocation && (
                <Text style={{ color: colors.mutedFg, fontSize: 12, marginBottom: 12 }}>
                  {form.geoLocation.lat.toFixed(4)}, {form.geoLocation.lng.toFixed(4)}
                </Text>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('language')}</Text>
              <View style={styles.languageGrid}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => { updateForm('language', lang.code); i18n.changeLanguage(lang.code); }}
                    style={[
                      styles.langBtn,
                      {
                        borderColor: form.language === lang.code ? colors.primary : colors.border,
                        backgroundColor: form.language === lang.code ? colors.primary + '15' : colors.card,
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <Text style={{ color: form.language === lang.code ? colors.primary : colors.foreground, fontWeight: '600' }}>
                      {lang.nativeLabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 20 }]}>{t('membership')}</Text>
              <View style={styles.optionRow}>
                {(['free', 'gold'] as const).map((tier) => (
                  <TouchableOpacity
                    key={tier}
                    onPress={() => updateForm('membershipType', tier)}
                    style={[
                      styles.optionBtn,
                      {
                        borderColor: form.membershipType === tier ? colors.primary : colors.border,
                        backgroundColor: form.membershipType === tier ? colors.primary + '15' : colors.card,
                        borderRadius: colors.radius,
                      },
                    ]}
                  >
                    <Text style={{ color: form.membershipType === tier ? colors.primary : colors.foreground, fontWeight: '600' }}>
                      {tier === 'free' ? t('free') : t('gold')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {error && (
            <Text style={{ color: colors.destructive, marginTop: 12, fontSize: 13 }}>{error}</Text>
          )}
        </Card>

        <View style={styles.btnRow}>
          {step > 1 && (
            <Button title={t('back')} onPress={() => setStep(step - 1)} variant="outline" style={{ flex: 1, marginRight: 8 }} />
          )}
          <Button
            title={step === 4 ? t('submit') : t('next')}
            onPress={handleNext}
            loading={isLoading}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={{ color: colors.mutedFg }}>{t('alreadyHaveAccount')} </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  waveContainer: { position: 'relative', width: '100%', height: WAVE_HEIGHT },
  waveTitleWrap: { position: 'absolute', top: 52, left: 24 },
  waveTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 8 },
  stepLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  optionRow: { flexDirection: 'row', gap: 12 },
  optionBtn: { flex: 1, borderWidth: 1.5, padding: 16, alignItems: 'center' },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  langBtn: { width: '30%', flexGrow: 1, borderWidth: 1.5, paddingVertical: 12, alignItems: 'center' },
  btnRow: { flexDirection: 'row', marginTop: 20 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
});
