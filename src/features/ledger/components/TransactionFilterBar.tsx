import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { Button } from '../../../components/ui/Button';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';

export interface TransactionFilters {
  type?: 'income' | 'expense';
  paymentMode?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface TransactionFilterBarProps {
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
}

const PAYMENT_MODES = ['cash', 'bank', 'upi', 'credit', 'cheque'];

export function TransactionFilterBar({ filters, onApply }: TransactionFilterBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [localFilters, setLocalFilters] = useState<TransactionFilters>(filters);

  const activeCount = Object.values(filters).filter(Boolean).length;

  const handleOpen = () => {
    setLocalFilters(filters);
    setVisible(true);
  };

  const handleApply = () => {
    onApply(localFilters);
    setVisible(false);
  };

  const handleClear = () => {
    onApply({});
    setVisible(false);
  };

  return (
    <>
      <View style={styles.bar}>
        <TouchableOpacity onPress={handleOpen} style={[styles.filterBtn, { borderColor: activeCount > 0 ? colors.primary : colors.border, backgroundColor: activeCount > 0 ? colors.primary + '10' : colors.card }]}>
          <Text style={{ color: activeCount > 0 ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 13 }}>
            {t('filters')} {activeCount > 0 ? `(${activeCount})` : ''}
          </Text>
        </TouchableOpacity>

        {filters.type && (
          <View style={[styles.chip, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{t(filters.type)}</Text>
            <TouchableOpacity onPress={() => onApply({ ...filters, type: undefined })}>
              <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700', marginLeft: 4 }}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        {filters.paymentMode && (
          <View style={[styles.chip, { backgroundColor: colors.info + '15', borderColor: colors.info }]}>
            <Text style={{ color: colors.info, fontSize: 12, fontWeight: '600' }}>{t(filters.paymentMode)}</Text>
            <TouchableOpacity onPress={() => onApply({ ...filters, paymentMode: undefined })}>
              <Text style={{ color: colors.info, fontSize: 14, fontWeight: '700', marginLeft: 4 }}>×</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700', marginBottom: 16 }}>{t('filters')}</Text>

            <Text style={[styles.label, { color: colors.foreground }]}>{t('type')}</Text>
            <View style={styles.chipGrid}>
              {(['income', 'expense'] as const).map((tp) => (
                <TouchableOpacity
                  key={tp}
                  onPress={() => setLocalFilters((f) => ({ ...f, type: f.type === tp ? undefined : tp }))}
                  style={[styles.optionChip, { borderColor: localFilters.type === tp ? colors.primary : colors.border, backgroundColor: localFilters.type === tp ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
                >
                  <Text style={{ color: localFilters.type === tp ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 13 }}>{t(tp)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.foreground }]}>{t('paymentMode')}</Text>
            <View style={styles.chipGrid}>
              {PAYMENT_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setLocalFilters((f) => ({ ...f, paymentMode: f.paymentMode === mode ? undefined : mode }))}
                  style={[styles.optionChip, { borderColor: localFilters.paymentMode === mode ? colors.primary : colors.border, backgroundColor: localFilters.paymentMode === mode ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
                >
                  <Text style={{ color: localFilters.paymentMode === mode ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 13 }}>{t(mode)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <DatePickerInput label={t('from')} value={localFilters.dateFrom || ''} onChange={(v) => setLocalFilters((f) => ({ ...f, dateFrom: v }))} />
            <DatePickerInput label={t('to')} value={localFilters.dateTo || ''} onChange={(v) => setLocalFilters((f) => ({ ...f, dateTo: v }))} />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Button title={t('clearAll')} onPress={handleClear} variant="outline" style={{ flex: 1 }} />
              <Button title={t('apply')} onPress={handleApply} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  filterBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 380, borderRadius: 16, padding: 20, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  optionChip: { borderWidth: 1.5, paddingVertical: 8, paddingHorizontal: 14 },
});
