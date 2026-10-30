import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useNotebookFarmStore, FarmType } from '../../../shared/hooks/useNotebookFarmStore';
import { X, Minus, Plus } from 'lucide-react-native';

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
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('addFarm')}</Text>
            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <X size={18} color={colors.mutedFg} />
            </TouchableOpacity>
          </View>

          {!selectedType ? (
            <View style={styles.grid}>
              {FARM_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.type}
                  onPress={() => handleSelectType(opt.type)}
                  activeOpacity={0.7}
                  style={[styles.tile, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <Text style={styles.emoji}>{opt.emoji}</Text>
                  <Text style={[styles.tileLabel, { color: colors.foreground }]}>{t(opt.type)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.confirmView}>
              <View style={[styles.selectedCard, { backgroundColor: colors.background, borderColor: colors.primary }]}>
                <Text style={styles.selectedEmoji}>
                  {FARM_OPTIONS.find((o) => o.type === selectedType)?.emoji}
                </Text>
                <Text style={[styles.selectedLabel, { color: colors.foreground }]}>{t(selectedType)}</Text>
              </View>

              <Text style={[styles.inputLabel, { color: colors.mutedFg }]}>{t('farmName')}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t(selectedType)}
                placeholderTextColor={colors.mutedFg}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
              />

              <Text style={[styles.inputLabel, { color: colors.mutedFg, marginTop: 16 }]}>
                {t('howMany')} {t(ANIMAL_LABEL[selectedType])}?
              </Text>
              <View style={styles.counter}>
                <TouchableOpacity
                  onPress={() => setCount((c) => Math.max(0, c - 1))}
                  activeOpacity={0.7}
                  style={[styles.counterBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <Minus size={20} color={colors.foreground} />
                </TouchableOpacity>
                <View style={[styles.counterValue, { backgroundColor: colors.background, borderColor: colors.border }]}>
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

              <View style={styles.btnRow}>
                <TouchableOpacity
                  onPress={() => setSelectedType(null)}
                  style={[styles.backBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.mutedFg, fontWeight: '600', fontSize: 15 }}>{t('back')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={loading}
                  activeOpacity={0.8}
                  style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>
                    {loading ? '...' : `✓ ${t('save')}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '800' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
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
  emoji: { fontSize: 28 },
  tileLabel: { fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  confirmView: { paddingHorizontal: 20 },
  selectedCard: {
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 18,
  },
  selectedEmoji: { fontSize: 40 },
  selectedLabel: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
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
    fontSize: 20,
    fontWeight: '800',
  },
  error: { color: '#DC2626', fontSize: 13, marginTop: 8 },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});
