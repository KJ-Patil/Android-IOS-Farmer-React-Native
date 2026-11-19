import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useNotebookFarmStore, FarmType } from '../../../shared/hooks/useNotebookFarmStore';
import { Input } from '../../../components/ui/Input';
import { Minus, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSizes } from '../../../shared/utils/typography';

interface AddFarmModalProps {
  visible: boolean;
  onClose: () => void;
}

const FARM_OPTIONS: { type: FarmType; emoji: string }[] = [
  { type: 'dairy', emoji: '🐄' },
  { type: 'goat', emoji: '🐐' },
  { type: 'poultry', emoji: '🐔' },
  { type: 'fishery', emoji: '🐟' },
  { type: 'piggery', emoji: '🐷' },
  { type: 'sericulture', emoji: '🪱' },
  { type: 'apiary', emoji: '🐝' },
  { type: 'other', emoji: '🌾' },
];

const ANIMAL_LABEL: Record<FarmType, string> = {
  dairy: 'cows',
  goat: 'goats',
  poultry: 'birds',
  fishery: 'fish',
  piggery: 'pigs',
  sericulture: 'trays',
  apiary: 'hives',
  other: 'animals',
};

export function AddFarmModal({ visible, onClose }: AddFarmModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { createFarm } = useNotebookFarmStore();
  const [selectedType, setSelectedType] = useState<FarmType | null>(null);
  const [name, setName] = useState('');
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setSelectedType(null);
    setName('');
    setCount(0);
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSelectType = (type: FarmType) => {
    setSelectedType(type);
    setName('');
    setCount(0);
    setError('');
  };

  const handleSave = async () => {
    if (!selectedType) return;
    const farmName = name.trim() || t(selectedType);
    setError('');
    setLoading(true);
    try {
      await createFarm({ name: farmName, type: selectedType, animalCount: count > 0 ? count : undefined });
      reset();
      onClose();
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error('AddFarmModal save error:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ width: 40 }} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>🐄 {t('addFarm')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!selectedType ? (
            <View style={styles.grid}>
              {FARM_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  onPress={() => handleSelectType(opt.type)}
                  activeOpacity={0.7}
                  style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Text style={styles.emoji}>{opt.emoji}</Text>
                  <Text style={[styles.tileLabel, { color: colors.foreground }]}>{t(opt.type)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.confirmView}>
              <View style={[styles.selectedCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                <Text style={styles.selectedEmoji}>
                  {FARM_OPTIONS.find((o) => o.type === selectedType)?.emoji}
                </Text>
                <Text style={[styles.selectedLabel, { color: colors.foreground }]}>{t(selectedType)}</Text>
              </View>

              <Input
                label={t('farmName')}
                value={name}
                onChangeText={setName}
                placeholder={t(selectedType)}
              />

              <Text style={[styles.inputLabel, { color: colors.mutedFg, marginTop: 16 }]}>
                {t('howMany')} {t(ANIMAL_LABEL[selectedType])}?
              </Text>
              <View style={styles.counter}>
                <TouchableOpacity
                  onPress={() => setCount((c) => Math.max(0, c - 1))}
                  activeOpacity={0.7}
                  style={[styles.counterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <Minus size={20} color={colors.foreground} />
                </TouchableOpacity>
                <View style={[styles.counterValue, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.counterText, { color: colors.foreground }]}>{count}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCount((c) => c + 1)}
                  activeOpacity={0.7}
                  style={[styles.counterBtn, { backgroundColor: colors.primary }]}
                >
                  <Plus size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={[styles.cancelBtn, { backgroundColor: colors.destructive }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: fontSizes.base }}>✕ {t('cancel')}</Text>
          </TouchableOpacity>
          {selectedType && (
            <TouchableOpacity onPress={handleSave} activeOpacity={0.7} disabled={loading} style={[styles.saveBtn, { backgroundColor: '#16A34A', shadowColor: '#16A34A', opacity: loading ? 0.6 : 1 }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fontSizes.md }}>{loading ? '...' : `✓ ${t('save')}`}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1 },
  title: { fontSize: fontSizes.lg, fontWeight: '800' },
  scroll: { padding: 16, paddingBottom: 40 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '22.5%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  emoji: { fontSize: fontSizes.xxl },
  tileLabel: { fontSize: fontSizes.xs, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  confirmView: { },
  selectedCard: {
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 18,
  },
  selectedEmoji: { fontSize: fontSizes.xxxl },
  selectedLabel: { fontSize: fontSizes.md, fontWeight: '700', marginTop: 6 },
  inputLabel: { fontSize: fontSizes.sm, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSizes.base,
    fontWeight: '500',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
  },
  error: { color: '#DC2626', fontSize: fontSizes.sm, marginTop: 8 },
  footer: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  saveBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
});
