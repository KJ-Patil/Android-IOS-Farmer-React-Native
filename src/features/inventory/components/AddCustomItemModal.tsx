import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useInventoryStore } from '../../../shared/hooks/useInventoryStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import type { InventoryItemType } from '../../../shared/types/inventory';

interface AddCustomItemModalProps {
  visible: boolean;
  onClose: () => void;
}

const ITEM_TYPES: InventoryItemType[] = ['fertilizer', 'seed', 'pesticide', 'other'];
const UNITS = ['kg', 'litre', 'bag', 'packet', 'bottle', 'unit'];

export function AddCustomItemModal({ visible, onClose }: AddCustomItemModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { createItem } = useInventoryStore();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [nameMr, setNameMr] = useState('');
  const [type, setType] = useState<InventoryItemType>('fertilizer');
  const [unit, setUnit] = useState('kg');
  const [rate, setRate] = useState('');

  const resetForm = () => {
    setName('');
    setNameMr('');
    setType('fertilizer');
    setUnit('kg');
    setRate('');
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t('error'), t('enterItemName')); return; }
    setLoading(true);
    try {
      await createItem({
        name: name.trim(),
        nameMr: nameMr.trim() || undefined,
        type,
        unit,
        purchaseRate: parseFloat(rate) || 0,
        currentStock: 0,
      });
      resetForm();
      onClose();
    } catch (err: any) {
      Alert.alert(t('error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{t('cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('addItem')}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Input label={t('name')} value={name} onChangeText={setName} placeholder={t('itemNamePlaceholder')} />
          <Input label={t('itemNameMr')} value={nameMr} onChangeText={setNameMr} placeholder={t('optional')} />

          <Text style={[styles.label, { color: colors.foreground }]}>{t('type')}</Text>
          <View style={styles.chipGrid}>
            {ITEM_TYPES.map((tp) => (
              <TouchableOpacity
                key={tp}
                onPress={() => setType(tp)}
                style={[styles.chip, { borderColor: type === tp ? colors.primary : colors.border, backgroundColor: type === tp ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
              >
                <Text style={{ color: type === tp ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 12 }}>{t(tp)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>{t('unit')}</Text>
          <View style={styles.chipGrid}>
            {UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                onPress={() => setUnit(u)}
                style={[styles.chip, { borderColor: unit === u ? colors.primary : colors.border, backgroundColor: unit === u ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
              >
                <Text style={{ color: unit === u ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 12 }}>{t(u)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input label={t('defaultRate')} value={rate} onChangeText={(v) => setRate(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder={t('ratePerUnitPlaceholder')} />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button title={t('save')} onPress={handleSave} loading={loading} fullWidth />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1.5, paddingVertical: 8, paddingHorizontal: 12 },
  footer: { padding: 16, borderTopWidth: 1 },
});
