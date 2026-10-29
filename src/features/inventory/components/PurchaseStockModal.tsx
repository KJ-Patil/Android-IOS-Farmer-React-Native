import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useInventoryStore } from '../../../shared/hooks/useInventoryStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';
import type { PaymentMode } from '../../../shared/types/ledger';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';

interface PurchaseStockModalProps {
  visible: boolean;
  onClose: () => void;
  initialItemId?: string;
}

const PAYMENT_MODES: PaymentMode[] = ['cash', 'upi', 'bank', 'credit', 'cheque'];

export function PurchaseStockModal({ visible, onClose, initialItemId }: PurchaseStockModalProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { items, purchaseStock } = useInventoryStore();
  const isNonEnglish = i18n.language !== 'en';
  const { fmtCurrency, toNative } = useLocalizedFormat();

  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(initialItemId || '');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  React.useEffect(() => {
    if (visible) {
      const targetId = initialItemId || selectedItemId || items[0]?.id || '';
      setSelectedItemId(targetId);
      const itm = items.find((i) => i.id === targetId);
      if (itm && itm.purchaseRate > 0) {
        setRate(itm.purchaseRate.toString());
      }
      if (!supplier) {
        setSupplier(t('defaultSupplierName'));
      }
    }
  }, [visible, initialItemId, items]);

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const total = parseFloat(quantity || '0') * parseFloat(rate || '0');

  const handleSave = async () => {
    if (!selectedItemId) { Alert.alert(t('error'), t('selectItem')); return; }
    if (total <= 0) { Alert.alert(t('error'), t('enterValidQuantityAndRate')); return; }

    setLoading(true);
    try {
      await purchaseStock({
        itemId: selectedItemId,
        itemName: selectedItem?.name || '',
        quantity: parseFloat(quantity),
        rate: parseFloat(rate),
        totalAmount: total,
        supplierName: supplier || undefined,
        paymentMode,
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
          <Text style={[styles.title, { color: colors.foreground }]}>{t('purchaseStock')}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.label, { color: colors.foreground }]}>{t('selectItem')}</Text>
          <View style={styles.chipGrid}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => { setSelectedItemId(item.id); setRate(item.purchaseRate > 0 ? item.purchaseRate.toString() : ''); }}
                style={[styles.chip, { borderColor: selectedItemId === item.id ? colors.primary : colors.border, backgroundColor: selectedItemId === item.id ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
              >
                <Text style={{ color: selectedItemId === item.id ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 12 }}>
                  {isNonEnglish && item.nameMr ? item.nameMr : item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedItem && (
            <Text style={{ color: colors.mutedFg, fontSize: 12, marginBottom: 12 }}>
              {t('currentStock')}: {toNative(selectedItem.currentStock)} {t(selectedItem.unit)}
            </Text>
          )}

          <Input label={`${t('quantity')} (${selectedItem?.unit ? t(selectedItem.unit) : ''})`} value={quantity} onChangeText={(v) => setQuantity(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
          <Input label={`${t('rate')} / ${selectedItem?.unit ? t(selectedItem.unit) : t('unit')}`} value={rate} onChangeText={(v) => setRate(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />

          {total > 0 && (
            <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
              {t('total')}: {fmtCurrency(total)}
            </Text>
          )}

          <Input label={t('supplier')} value={supplier} onChangeText={setSupplier} placeholder={t('optional')} />
          <DatePickerInput label={t('date')} value={date} onChange={setDate} />

          <Text style={[styles.label, { color: colors.foreground }]}>{t('paymentMode')}</Text>
          <View style={styles.chipGrid}>
            {PAYMENT_MODES.map((mode) => (
              <TouchableOpacity
                key={mode}
                onPress={() => setPaymentMode(mode)}
                style={[styles.chip, { borderColor: paymentMode === mode ? colors.primary : colors.border, backgroundColor: paymentMode === mode ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
              >
                <Text style={{ color: paymentMode === mode ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 12 }}>{t(mode)}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
