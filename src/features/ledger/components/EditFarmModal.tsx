import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useNotebookFarmStore, FarmType, NotebookFarm } from '../../../shared/hooks/useNotebookFarmStore';
import { X, Minus, Plus, Trash2 } from 'lucide-react-native';

interface EditFarmModalProps {
  farm: NotebookFarm | null;
  onClose: () => void;
}

const FARM_EMOJI: Record<FarmType, string> = {
  dairy: '🐄',
  goat: '🐐',
  poultry: '🐔',
  fishery: '🐟',
  piggery: '🐷',
  sericulture: '🪱',
  apiary: '🐝',
  other: '🌾',
};

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

export function EditFarmModal({ farm, onClose }: EditFarmModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { updateFarm, deleteFarm } = useNotebookFarmStore();
  const [name, setName] = useState('');
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (farm) {
      setName(farm.name);
      setCount(farm.animalCount || 0);
      setError('');
      setLoading(false);
    }
  }, [farm]);

  if (!farm) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('enterFarmName'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await updateFarm(farm.id, { name: trimmed, animalCount: count > 0 ? count : undefined });
      onClose();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('deleteFarmConfirm'))) {
        deleteFarm(farm.id);
        onClose();
      }
    } else {
      Alert.alert(t('deleteFarm'), t('deleteFarmConfirm'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => { deleteFarm(farm.id); onClose(); } },
      ]);
    }
  };

  const emoji = FARM_EMOJI[farm.type] || '🌾';

  return (
    <Modal visible={true} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('editFarm')}</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <X size={18} color={colors.mutedFg} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Farm type display */}
            <View style={[styles.farmTypeCard, { backgroundColor: colors.background, borderColor: colors.primary }]}>
              <Text style={styles.farmEmoji}>{emoji}</Text>
              <Text style={[styles.farmTypeLabel, { color: colors.foreground }]}>{t(farm.type)}</Text>
            </View>

            {/* Farm name */}
            <Text style={[styles.inputLabel, { color: colors.mutedFg }]}>{t('farmName')}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t(farm.type)}
              placeholderTextColor={colors.mutedFg}
              style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
            />

            {/* Animal count */}
            <Text style={[styles.inputLabel, { color: colors.mutedFg, marginTop: 16 }]}>
              {t('howMany')} {t(ANIMAL_LABEL[farm.type])}?
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

            {/* Action buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity onPress={handleDelete} style={[styles.deleteBtn, { borderColor: '#DC2626' }]}>
                <Trash2 size={16} color="#DC2626" />
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
  content: { paddingHorizontal: 20 },
  farmTypeCard: {
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 18,
  },
  farmEmoji: { fontSize: 40 },
  farmTypeLabel: { fontSize: 16, fontWeight: '700', marginTop: 6 },
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
    marginTop: 20,
  },
  deleteBtn: {
    width: 50,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});
