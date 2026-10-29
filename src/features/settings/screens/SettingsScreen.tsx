import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Image,
  Modal,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useAuthStore } from '../../../shared/hooks/useAuthStore';
import { useThemeStore } from '../../../shared/hooks/useThemeStore';
import { ScreenLayout } from '../../../components/layout/ScreenLayout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Sparkles, Edit3, X, Check, Globe, Moon, Sun, Crown, Star, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SUPPORTED_LANGUAGES } from '../../../shared/locales/i18n';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { user, signOut, updateProfile, isLoading } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { fmtCurrency, toNative, fmtDMY } = useLocalizedFormat();
  // Profile Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [village, setVillage] = useState(user?.village || '');
  const [taluka, setTaluka] = useState(user?.taluka || '');
  const [district, setDistrict] = useState(user?.district || '');
  const [state, setState] = useState(user?.state || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [alternateMobile, setAlternateMobile] = useState(user?.alternateMobile || '');
  const [saving, setSaving] = useState(false);

  const handleSignOut = () => {
    Alert.alert(t('signOut'), t('confirmSignOut'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        village: village.trim(),
        taluka: taluka.trim(),
        district: district.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        alternateMobile: alternateMobile.trim(),
      });
      setEditOpen(false);
      Alert.alert(t('success'), t('profileUpdatedSuccessfully'));
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('failedToUpdateProfile'));
    } finally {
      setSaving(false);
    }
  };

  const userInitial = user?.fullName?.charAt(0)?.toUpperCase() || 'F';
  const rawDob = user?.dateOfBirth || (user as any)?.dob || '';
  const dobValue = rawDob ? toNative(rawDob) : '—';

  return (
    <ScreenLayout noPadding noTopInset>
      {/* Profile Gradient Header */}
      <LinearGradient
        colors={['#64748B', '#334155']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileHeader}
      >
        <View style={[styles.profileHeaderContent, { paddingTop: (StatusBar.currentHeight || 44) + 16 }]}>
          <View style={styles.profileTopRow}>
            <Text style={styles.headerTitle}>{t('settings')}</Text>
            <TouchableOpacity
              onPress={() => {
                setFullName(user?.fullName || '');
                setVillage(user?.village || '');
                setTaluka(user?.taluka || '');
                setDistrict(user?.district || '');
                setState(user?.state || '');
                setPincode(user?.pincode || '');
                setAlternateMobile(user?.alternateMobile || '');
                setEditOpen(true);
              }}
              activeOpacity={0.7}
              style={styles.editBtn}
            >
              <Edit3 color="#FFFFFF" size={14} />
              <Text style={styles.editBtnText}>{t('edit')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.profileRow}>
            {user?.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.profileName}>
                {user?.fullName || t('farmer')}
              </Text>
              <Text style={styles.profileInfo}>
                +{toNative('91')} {toNative(user?.mobileNumber || '')}
              </Text>
              {user?.emailId ? (
                <Text style={styles.profileInfo}>
                  {user.emailId}
                </Text>
              ) : null}
              <View style={styles.membershipBadge}>
                <Sparkles color="#FDE047" size={12} />
                <Text style={styles.membershipText}>
                  {user?.membershipType === 'gold' ? t('gold') : user?.membershipType === 'premium' ? t('premium') : t('free')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 16 }}>

        {/* Personal Details Card */}
        <Card style={{ marginTop: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t('personalDetails')}
          </Text>
          {[
            { label: t('fullName'), value: user?.fullName },
            { label: t('alternateMobile'), value: user?.alternateMobile ? toNative(user.alternateMobile) : '—' },
            { label: t('dateOfBirth'), value: dobValue },
            { label: t('aadhaarNumber'), value: user?.aadhaarNumber ? toNative(user.aadhaarNumber) : '—' },
            { label: t('farmerId'), value: user?.farmerId ? toNative(user.farmerId) : '—' },
          ].map((item, i) => (
            <View key={i} style={styles.detailRow}>
              <Text style={{ color: colors.mutedFg, flex: 1 }}>{item.label}</Text>
              <Text style={{ color: colors.foreground, fontWeight: '600', flex: 1, textAlign: 'right' }}>
                {item.value}
              </Text>
            </View>
          ))}
        </Card>

        {/* Address Card */}
        <Card style={{ marginTop: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('address')}</Text>
          {[
            { label: t('village'), value: user?.village },
            { label: t('taluka'), value: user?.taluka },
            { label: t('district'), value: user?.district },
            { label: t('state'), value: user?.state },
            { label: t('pincode'), value: user?.pincode ? toNative(user.pincode) : undefined },
          ].map((item, i) => (
            <View key={i} style={styles.detailRow}>
              <Text style={{ color: colors.mutedFg, flex: 1 }}>{item.label}</Text>
              <Text style={{ color: colors.foreground, fontWeight: '600', flex: 1, textAlign: 'right' }}>
                {item.value || '—'}
              </Text>
            </View>
          ))}
          {user?.geoLocation && (
            <Text style={{ color: colors.primary, fontSize: 13, marginTop: 6 }}>
              📍 GPS: {toNative((user.geoLocation as any).latitude || user.geoLocation.lat)},{' '}
              {toNative((user.geoLocation as any).longitude || user.geoLocation.lng)}
            </Text>
          )}
        </Card>

        {/* Language Selection */}
        <Card style={{ marginTop: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('language')}</Text>
          <View style={styles.languageGrid}>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => i18n.changeLanguage(lang.code)}
                style={[
                  styles.langBtn,
                  {
                    borderColor: i18n.language === lang.code ? colors.primary : colors.border,
                    backgroundColor: i18n.language === lang.code ? colors.primary + '15' : colors.card,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={{
                    color: i18n.language === lang.code ? colors.primary : colors.foreground,
                    fontWeight: '700',
                    fontSize: 14,
                  }}
                >
                  {lang.nativeLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Theme Selection */}
        <Card style={{ marginTop: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('theme')}</Text>
          <View style={styles.optionRow}>
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setTheme(mode)}
                style={[
                  styles.optionBtn,
                  {
                    borderColor: theme === mode ? colors.primary : colors.border,
                    backgroundColor: theme === mode ? colors.primary + '15' : colors.card,
                    borderRadius: colors.radius,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme === mode ? colors.primary : colors.foreground,
                    fontWeight: '600',
                    fontSize: 13,
                    textTransform: 'capitalize',
                  }}
                >
                  {t(`${mode}Mode`) || mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Subscription Plans */}
        <Card style={{ marginTop: 12 }} padding={16}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t('subscriptionPlan') || 'Subscription Plan'}
          </Text>
          <Text style={{ color: colors.mutedFg, fontSize: 13, marginBottom: 14 }}>
            {t('choosePlanDesc') || 'Choose a plan that suits your farming needs'}
          </Text>

          {/* Free Tier */}
          <TouchableOpacity
            onPress={() => {
              updateProfile({ membershipType: 'free' });
              Alert.alert(t('success'), t('planUpdated') || 'Plan updated successfully');
            }}
            style={[
              styles.planCard,
              {
                borderColor: user?.membershipType === 'free' || !user?.membershipType ? colors.primary : colors.border,
                backgroundColor: user?.membershipType === 'free' || !user?.membershipType ? colors.primary + '08' : colors.card,
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={[styles.planIcon, { backgroundColor: '#F1F5F9' }]}>
              <Star color="#64748B" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>
                {t('free')}
              </Text>
              <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>
                {t('freeFeatures') || 'Basic features, limited reports'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '800' }}>
                {t('free') || 'Free'}
              </Text>
              {(user?.membershipType === 'free' || !user?.membershipType) && (
                <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                  <Check color="#FFF" size={10} />
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700', marginLeft: 2 }}>{t('active') || 'Active'}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Gold Tier */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                t('upgradePlan') || 'Upgrade Plan',
                (t('confirmUpgrade') || 'Upgrade to Gold for') + ` ${fmtCurrency(50)}/` + (t('month') || 'month') + '?',
                [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('upgrade') || 'Upgrade', onPress: () => {
                    updateProfile({ membershipType: 'gold' });
                    Alert.alert(t('success'), t('planUpdated') || 'Plan updated to Gold!');
                  }},
                ]
              );
            }}
            style={[
              styles.planCard,
              {
                borderColor: user?.membershipType === 'gold' ? '#D97706' : colors.border,
                backgroundColor: user?.membershipType === 'gold' ? '#FEF3C7' : colors.card,
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={[styles.planIcon, { backgroundColor: '#FEF3C7' }]}>
              <Crown color="#D97706" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>
                {t('gold')}
              </Text>
              <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>
                {t('goldFeatures') || 'Full reports, WhatsApp share, party ledger'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#D97706', fontSize: 16, fontWeight: '800' }}>{fmtCurrency(50)}</Text>
              <Text style={{ color: colors.mutedFg, fontSize: 12 }}>/{t('month') || 'month'}</Text>
              {user?.membershipType === 'gold' && (
                <View style={[styles.activeBadge, { backgroundColor: '#D97706' }]}>
                  <Check color="#FFF" size={10} />
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700', marginLeft: 2 }}>{t('active') || 'Active'}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Premium Tier */}
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                t('upgradePlan') || 'Upgrade Plan',
                (t('confirmUpgrade') || 'Upgrade to Premium for') + ` ${fmtCurrency(90)}/` + (t('month') || 'month') + '?',
                [
                  { text: t('cancel'), style: 'cancel' },
                  { text: t('upgrade') || 'Upgrade', onPress: () => {
                    updateProfile({ membershipType: 'premium' });
                    Alert.alert(t('success'), t('planUpdated') || 'Plan updated to Premium!');
                  }},
                ]
              );
            }}
            style={[
              styles.planCard,
              {
                borderColor: user?.membershipType === 'premium' ? '#7C3AED' : colors.border,
                backgroundColor: user?.membershipType === 'premium' ? '#EDE9FE' : colors.card,
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={[styles.planIcon, { backgroundColor: '#EDE9FE' }]}>
              <Zap color="#7C3AED" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>
                {t('premium')}
              </Text>
              <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>
                {t('premiumFeatures') || 'AI insights, priority support, all features'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#7C3AED', fontSize: 16, fontWeight: '800' }}>{fmtCurrency(90)}</Text>
              <Text style={{ color: colors.mutedFg, fontSize: 12 }}>/{t('month') || 'month'}</Text>
              {user?.membershipType === 'premium' && (
                <View style={[styles.activeBadge, { backgroundColor: '#7C3AED' }]}>
                  <Check color="#FFF" size={10} />
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700', marginLeft: 2 }}>{t('active') || 'Active'}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Card>

        {/* Sign Out Button */}
        <Button
          title={t('signOut')}
          onPress={handleSignOut}
          variant="destructive"
          loading={isLoading}
          fullWidth
          style={{ marginTop: 20 }}
        />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard} padding={20}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>{t('editProfile')}</Text>
              <TouchableOpacity onPress={() => setEditOpen(false)}>
                <X color={colors.mutedFg} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Input label={t('fullName')} value={fullName} onChangeText={setFullName} />
              <Input label={t('village')} value={village} onChangeText={setVillage} />
              <Input label={t('taluka')} value={taluka} onChangeText={setTaluka} />
              <Input label={t('district')} value={district} onChangeText={setDistrict} />
              <Input label={t('state')} value={state} onChangeText={setState} />
              <Input label={t('pincode')} value={pincode} onChangeText={setPincode} keyboardType="number-pad" />
              <Input label={t('alternateMobile')} value={alternateMobile} onChangeText={setAlternateMobile} keyboardType="phone-pad" />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title={t('cancel')}
                variant="outline"
                onPress={() => setEditOpen(false)}
                disabled={saving}
                style={{ flex: 1 }}
              />
              <Button
                title={t('save')}
                onPress={handleSaveProfile}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  profileHeader: { width: '100%', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
  profileHeaderContent: { paddingHorizontal: 20, paddingBottom: 20 },
  profileTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.3 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  editBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatarImg: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  profileName: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  profileInfo: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  membershipBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 6 },
  membershipText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: '#FDE047' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  langBtn: { width: '30%', flexGrow: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  planCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 10, gap: 12 },
  planIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
});
