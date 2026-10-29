import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useInventoryStore } from '../../../shared/hooks/useInventoryStore';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';

interface IssueToCropModalProps {
  visible: boolean;
  onClose: () => void;
  initialItemId?: string;
}

export function IssueToCropModal({ visible, onClose, initialItemId }: IssueToCropModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { items, issueStockToCrop } = useInventoryStore();
  const { plots, crops } = usePlotStore();
  const isNonEnglish = i18n.language !== 'en';
  const { fmtCurrency, toNative } = useLocalizedFormat();

  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(initialItemId || '');
  const [quantity, setQuantity] = useState('');
  const [selectedPlotId, setSelectedPlotId] = useState('');
  const [selectedCropId, setSelectedCropId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  React.useEffect(() => {
    if (visible) {
      const targetId = initialItemId || selectedItemId || items.find((i) => i.currentStock > 0)?.id || items[0]?.id || '';
      setSelectedItemId(targetId);
      if (!selectedPlotId && plots.length > 0) {
        setSelectedPlotId(plots[0].id);
      }
    }
  }, [visible, initialItemId, items, plots]);

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const plotCrops = selectedPlotId ? (crops[selectedPlotId] || []).filter((c) => !c.isLocked) : [];
  const selectedPlot = plots.find((p) => p.id === selectedPlotId);
  const selectedCrop = plotCrops.find((c) => c.id === selectedCropId);

  const handleSave = async () => {
    if (!selectedItemId) { Alert.alert(t('error'), t('selectItem')); return; }
    if (!selectedPlotId || !selectedCropId) { Alert.alert(t('error'), t('selectPlotAndCrop')); return; }
    const qty = parseFloat(quantity || '0');
    if (qty <= 0) { Alert.alert(t('error'), t('enterValidQuantity')); return; }
    if (selectedItem && qty > selectedItem.currentStock) {
      Alert.alert(t('error'), t('insufficientStock'));
      return;
    }

    setLoading(true);
    try {
      await issueStockToCrop({
        itemId: selectedItemId,
        itemName: selectedItem?.name || '',
        quantity: qty,
        plotId: selectedPlotId,
        plotName: selectedPlot?.name || '',
        cropId: selectedCropId,
        cropName: selectedCrop?.cropType || '',
        date,
      });
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
          <Text style={[styles.title, { color: colors.foreground }]}>{t('issueToCrop')}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.foreground }]}>{t('selectItem')}</Text>
          <View style={styles.chipGrid}>
            {items.filter((i) => i.currentStock > 0).map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedItemId(item.id)}
                style={[styles.chip, { borderColor: selectedItemId === item.id ? colors.primary : colors.border, backgroundColor: selectedItemId === item.id ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
              >
                <Text style={{ color: selectedItemId === item.id ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 12 }}>
                  {isNonEnglish && item.nameMr ? item.nameMr : item.name} ({toNative(item.currentStock)})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedItem && (
            <Text style={{ color: colors.mutedFg, fontSize: 12, marginBottom: 12 }}>
              {t('available')}: {toNative(selectedItem.currentStock)} {t(selectedItem.unit)} @ {fmtCurrency(selectedItem.purchaseRate)}/{t(selectedItem.unit)}
            </Text>
          )}

          <Input label={`${t('quantity')} (max: ${toNative(selectedItem?.currentStock || 0)})`} value={quantity} onChangeText={(v) => setQuantity(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />

          <Text style={[styles.label, { color: colors.foreground }]}>{t('plots')}</Text>
          <View style={styles.chipGrid}>
            {plots.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => { setSelectedPlotId(p.id); setSelectedCropId(''); }}
                style={[styles.chip, { borderColor: selectedPlotId === p.id ? colors.primary : colors.border, backgroundColor: selectedPlotId === p.id ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
              >
                <Text style={{ color: selectedPlotId === p.id ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 12 }}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedPlotId && plotCrops.length > 0 && (
            <>
              <Text style={[styles.label, { color: colors.foreground }]}>{t('cropActiveOnly')}</Text>
              <View style={styles.chipGrid}>
                {plotCrops.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setSelectedCropId(c.id)}
                    style={[styles.chip, { borderColor: selectedCropId === c.id ? colors.primary : colors.border, backgroundColor: selectedCropId === c.id ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
                  >
                    <Text style={{ color: selectedCropId === c.id ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 12 }}>{t(c.cropType)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {selectedPlotId && plotCrops.length === 0 && (
            <Text style={{ color: colors.warning, fontSize: 12, marginBottom: 12 }}>{t('noActiveCropsInPlot')}</Text>
          )}

          <DatePickerInput label={t('date')} value={date} onChange={setDate} />
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
