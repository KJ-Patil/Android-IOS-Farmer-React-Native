import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { Input } from '../../../components/ui/Input';
import { X, Check } from 'lucide-react-native';
import { fontSizes } from '../../../shared/utils/typography';

interface CustomLedgersModalProps {
  visible: boolean;
  onClose: () => void;
}

type LedgerFormType = 'income' | 'expense' | 'both';

const TYPE_EMOJI: Record<string, string> = { income: '💰', expense: '💸', both: '🔄' };

export function CustomLedgersModal({ visible, onClose }: CustomLedgersModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { createCustomLedger } = useLedgerStore();
  const [name, setName] = useState('');
  const [nameMr, setNameMr] = useState('');
  const [type, setType] = useState<LedgerFormType>('both');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert(t('error'), t('enterName')); return; }
    setLoading(true);
    try {
      await createCustomLedger({ name: name.trim(), nameMr: nameMr.trim() || undefined, type, description: description.trim() || undefined });
      resetForm();
      onClose();
    } catch (err: any) {
      Alert.alert(t('error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setNameMr('');
    setType('both');
    setDescription('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const types: LedgerFormType[] = ['income', 'expense', 'both'];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ width: 40 }} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t('customLedgers')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.heroRow}>
            <Text style={{ fontSize: fontSizes.xxl }}>📒</Text>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>{t('add')} {t('customLedgers')}</Text>
              <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>
                {t('createNewLedgerDesc') || 'Create a new custom ledger entry'}
              </Text>
            </View>
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: colors.card, shadowColor: '#000' }]}>
            <View style={styles.formInputRow}>
              <Text style={{ fontSize: fontSizes.md }}>🏷️</Text>
              <Text style={[styles.formInputLabel, { color: colors.foreground }]}>{t('name')}</Text>
            </View>
            <Input value={name} onChangeText={setName} placeholder={t('customLedgerPlaceholder')} />

            <View style={styles.formInputRow}>
              <Text style={{ fontSize: fontSizes.md }}>🔤</Text>
              <Text style={[styles.formInputLabel, { color: colors.foreground }]}>{t('name')} (मराठी)</Text>
            </View>
            <Input value={nameMr} onChangeText={setNameMr} placeholder={t('optional')} />

            <Text style={[styles.typeLabel, { color: colors.foreground }]}>{t('type')}</Text>
            <View style={styles.typeGrid}>
              {types.map((tp) => {
                const sel = type === tp;
                return (
                  <TouchableOpacity
                    key={tp}
                    onPress={() => setType(tp)}
                    activeOpacity={0.7}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: sel ? colors.primary + '12' : colors.background,
                        borderColor: sel ? colors.primary : colors.border,
                        borderWidth: sel ? 2 : 1,
                        shadowColor: sel ? colors.primary : '#000',
                        shadowOpacity: sel ? 0.2 : 0.05,
                        shadowRadius: sel ? 8 : 3,
                        shadowOffset: { width: 0, height: sel ? 3 : 1 },
                        elevation: sel ? 4 : 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: fontSizes.xl }}>{TYPE_EMOJI[tp]}</Text>
                    <Text
                      style={{
                        color: sel ? colors.primary : colors.foreground,
                        fontWeight: sel ? '800' : '600',
                        fontSize: fontSizes.sm,
                        marginTop: 4,
                      }}
                    >
                      {t(tp)}
                    </Text>
                    {sel && (
                      <View style={[styles.checkDot, { backgroundColor: colors.primary }]}>
                        <Check size={10} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.formInputRow}>
              <Text style={{ fontSize: fontSizes.md }}>📋</Text>
              <Text style={[styles.formInputLabel, { color: colors.foreground }]}>{t('description')}</Text>
            </View>
            <Input value={description} onChangeText={setDescription} placeholder={t('optional')} />
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleClose}
            activeOpacity={0.7}
            style={[styles.cancelBtn, { backgroundColor: colors.destructive }]}
          >
            <X color="#FFFFFF" size={18} />
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: fontSizes.base }}>{t('cancel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreate}
            activeOpacity={0.7}
            disabled={loading}
            style={[styles.saveBtn, { backgroundColor: '#16A34A', shadowColor: '#16A34A', opacity: loading ? 0.6 : 1 }]}
          >
            <Check color="#FFFFFF" size={20} strokeWidth={3} />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fontSizes.md }}>
              {loading ? '...' : t('save')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: fontSizes.lg, fontWeight: '800' },
  scroll: { padding: 16, paddingBottom: 30 },

  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  heroTitle: { fontSize: fontSizes.lg, fontWeight: '800' },

  formCard: {
    borderRadius: 16,
    padding: 18,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  formInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  formInputLabel: { fontSize: fontSizes.base, fontWeight: '700' },

  typeLabel: { fontSize: fontSizes.base, fontWeight: '700', marginBottom: 10 },
  typeGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 34,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
