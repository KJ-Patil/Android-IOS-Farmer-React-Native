import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';
import type { PaymentMode, LedgerType } from '../../../shared/types/ledger';

interface MoneyOutModalProps {
  visible: boolean;
  onClose: () => void;
  plotId?: string;
  cropId?: string;
  initialData?: {
    amount?: number;
    partyName?: string;
    billNumber?: string;
    date?: string;
    category?: string;
    notes?: string;
    paymentMode?: PaymentMode;
  };
}

const PAYMENT_MODES: PaymentMode[] = ['cash', 'upi', 'bank', 'credit', 'cheque'];

const AGRI_CATEGORIES = ['seeds', 'fertilizers', 'pesticides', 'labor', 'weeding', 'tractor', 'irrigation', 'agriElectricity', 'transport', 'packing', 'marketCost', 'hamali', 'otherAgri'] as const;
const DAIRY_CATEGORIES = ['fodder', 'medicines', 'veterinary', 'milkCollection', 'dairyElectricity', 'dairyLabor', 'otherDairy'] as const;
const PERSONAL_CATEGORIES = ['homeExpenses', 'groceries', 'medical', 'education', 'travel', 'petrol', 'diesel', 'electricityBill', 'mobileRecharge', 'marriageFunction', 'emergency', 'otherPersonal'] as const;

type Section = 'agriculture' | 'dairy' | 'personal';

export function MoneyOutModal({ visible, onClose, initialData, plotId, cropId }: MoneyOutModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { postExpenseTransaction } = useLedgerStore();
  const { plots, crops } = usePlotStore();

  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<Section | ''>('agriculture');
  const [selectedCategory, setSelectedCategory] = useState('fertilizers');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [partyName, setPartyName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPlotId, setSelectedPlotId] = useState(plotId || '');
  const [selectedCropId, setSelectedCropId] = useState(cropId || '');

  React.useEffect(() => {
    if (visible) {
      if (plotId) setSelectedPlotId(plotId);
      if (cropId) setSelectedCropId(cropId);
      if (initialData) {
        if (initialData.amount) setAmount(String(initialData.amount));
        if (initialData.partyName) setPartyName(initialData.partyName);
        if (initialData.billNumber) setBillNumber(initialData.billNumber);
        if (initialData.date) setDate(initialData.date);
        if (initialData.category) setSelectedCategory(initialData.category);
        if (initialData.notes) setNotes(initialData.notes);
        if (initialData.paymentMode) setPaymentMode(initialData.paymentMode);
        setSection('agriculture');
      }
    }
  }, [visible, initialData, plotId, cropId]);

  const selectedPlot = plots.find((p) => p.id === selectedPlotId);
  const plotCrops = selectedPlotId ? (crops[selectedPlotId] || []).filter((c) => !c.isLocked) : [];
  const selectedCrop = plotCrops.find((c) => c.id === selectedCropId);

  const categoryList = section === 'agriculture' ? AGRI_CATEGORIES : section === 'dairy' ? DAIRY_CATEGORIES : PERSONAL_CATEGORIES;
  const ledgerType: LedgerType = section === 'agriculture' ? 'agriculture' : section === 'dairy' ? 'dairy' : 'personal';

  const handleSave = async () => {
    if (!selectedCategory) { Alert.alert(t('error'), t('selectCategory')); return; }
    const amt = parseFloat(amount || '0');
    if (amt <= 0) { Alert.alert(t('error'), t('enterValidAmount')); return; }

    setLoading(true);
    try {
      await postExpenseTransaction({
        ledgerType,
        category: selectedCategory,
        amount: amt,
        date,
        paymentMode,
        partyName: partyName || undefined,
        plotId: selectedPlotId || undefined,
        plotName: selectedPlot?.name,
        cropId: selectedCropId || undefined,
        cropName: selectedCrop?.cropType,
        cropSeason: selectedCrop?.season,
        billNumber: billNumber || undefined,
        notes: notes || undefined,
        pendingAmount: paymentMode === 'credit' ? amt : undefined,
      });
      onClose();
    } catch (err: any) {
      Alert.alert(t('error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderChips = (options: readonly string[], selected: string, onSelect: (v: string) => void) => (
    <View style={styles.chipGrid}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onSelect(opt)}
          style={[styles.chip, { borderColor: selected === opt ? colors.destructive : colors.border, backgroundColor: selected === opt ? colors.destructive + '15' : colors.card, borderRadius: 8 }]}
        >
          <Text style={{ color: selected === opt ? colors.destructive : colors.foreground, fontWeight: '600', fontSize: 12 }}>{t(opt)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const sections: { key: Section; label: string; count: number }[] = [
    { key: 'agriculture', label: t('agricultureExpenses'), count: 13 },
    { key: 'dairy', label: t('dairyExpenses'), count: 7 },
    { key: 'personal', label: t('personalExpenses'), count: 12 },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.destructive, fontSize: 16, fontWeight: '600' }}>{t('cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.destructive }]}>{t('moneyOut')}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!section ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('expenseSection')}</Text>
              {sections.map((sec) => (
                <TouchableOpacity key={sec.key} onPress={() => setSection(sec.key)}>
                  <Card style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: colors.destructive }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16 }}>{sec.label}</Text>
                    <Text style={{ color: colors.mutedFg, fontSize: 12 }}>{sec.count} {t('categoriesCount')}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => { setSection(''); setSelectedCategory(''); }} style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.destructive, fontWeight: '600' }}>&larr; {t('back')}</Text>
              </TouchableOpacity>

              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('category')}</Text>
              {renderChips(categoryList, selectedCategory, setSelectedCategory)}

              {section === 'agriculture' && (
                <>
                  <Text style={[styles.label, { color: colors.foreground }]}>{t('linkToPlotCropOptional')}</Text>
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
                  )}
                </>
              )}

              <Input label={t('amount')} value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="₹0" />
              <DatePickerInput label={t('date')} value={date} onChange={setDate} />

              <Text style={[styles.label, { color: colors.foreground }]}>{t('paymentMode')}</Text>
              {renderChips(PAYMENT_MODES, paymentMode, (v) => setPaymentMode(v as PaymentMode))}


              <Input label={t('partyName')} value={partyName} onChangeText={setPartyName} placeholder={t('optional')} />
              <Input label={t('billNumber')} value={billNumber} onChangeText={setBillNumber} placeholder={t('optional')} />
              <Input label={t('notes')} value={notes} onChangeText={setNotes} placeholder={t('optional')} multiline />
            </>
          )}
        </ScrollView>

        {section && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button title={t('save')} onPress={handleSave} loading={loading} fullWidth variant="destructive" />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 60 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1.5, paddingVertical: 8, paddingHorizontal: 12 },
  footer: { padding: 16, borderTopWidth: 1 },
});
