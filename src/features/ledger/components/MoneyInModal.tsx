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
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import type { IncomeCategory, PaymentMode } from '../../../shared/types/ledger';

interface MoneyInModalProps {
  visible: boolean;
  onClose: () => void;
  plotId?: string;
  cropId?: string;
}

const PAYMENT_MODES: PaymentMode[] = ['cash', 'upi', 'bank', 'credit', 'cheque'];
const DAIRY_PRODUCTS = ['milk', 'ghee', 'paneer', 'curd', 'buttermilk', 'khava', 'animalSale', 'dung', 'other'] as const;
const LOAN_TYPES = ['cropLoan', 'termLoan', 'tractorLoan', 'goldLoan', 'personalLoan'] as const;
const OTHER_SUBTYPES = ['subsidy', 'insuranceClaim', 'tractorRent', 'implementsRent', 'waterSale', 'saplingsSale', 'seedsSale', 'organicManureSale', 'wages', 'interest', 'commission', 'custom'] as const;
const QUANTITY_UNITS = ['Bags', 'Quintal', 'Kg', 'Ton', 'Crates'];

export function MoneyInModal({ visible, onClose, plotId, cropId }: MoneyInModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { postIncomeTransaction } = useLedgerStore();
  const { plots, crops } = usePlotStore();
  const { fmtCurrency } = useLocalizedFormat();

  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<IncomeCategory | ''>(cropId ? 'crop_sale' : '');

  // Common fields
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [partyName, setPartyName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Crop Sale
  const [selectedPlotId, setSelectedPlotId] = useState(plotId || '');
  const [selectedCropId, setSelectedCropId] = useState(cropId || '');

  React.useEffect(() => {
    if (visible) {
      if (plotId) setSelectedPlotId(plotId);
      if (cropId) {
        setSelectedCropId(cropId);
        setCategory('crop_sale');
      }
    }
  }, [visible, plotId, cropId]);

  const [buyerName, setBuyerName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [quantityUnit, setQuantityUnit] = useState('Quintal');
  const [ratePerUnit, setRatePerUnit] = useState('');
  const [hamali, setHamali] = useState('');
  const [transportDed, setTransportDed] = useState('');
  const [otherDed, setOtherDed] = useState('');

  // Dairy
  const [dairyProduct, setDairyProduct] = useState('');
  const [dairyQty, setDairyQty] = useState('');
  const [dairyUnit, setDairyUnit] = useState('Ltr');
  const [dairyRate, setDairyRate] = useState('');

  // Loan
  const [loanType, setLoanType] = useState('');
  const [sanctionAmount, setSanctionAmount] = useState('');
  const [processingFee, setProcessingFee] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [emiFrequency, setEmiFrequency] = useState('monthly');
  const [firstInstallment, setFirstInstallment] = useState('');
  const [loanDueDate, setLoanDueDate] = useState('');

  // Other
  const [otherSubtype, setOtherSubtype] = useState('');
  const [otherAmount, setOtherAmount] = useState('');

  const selectedPlot = plots.find((p) => p.id === selectedPlotId);
  const plotCrops = selectedPlotId ? (crops[selectedPlotId] || []).filter((c) => !c.isLocked) : [];
  const selectedCrop = plotCrops.find((c) => c.id === selectedCropId);

  const grossAmount = parseFloat(quantity || '0') * parseFloat(ratePerUnit || '0');
  const totalDeductions = parseFloat(hamali || '0') + parseFloat(transportDed || '0') + parseFloat(otherDed || '0');
  const netAmount = grossAmount - totalDeductions;

  const dairyTotal = parseFloat(dairyQty || '0') * parseFloat(dairyRate || '0');
  const loanNet = parseFloat(sanctionAmount || '0') - parseFloat(processingFee || '0');

  const handleSave = async () => {
    if (!category) { Alert.alert(t('error'), t('selectCategory')); return; }
    setLoading(true);
    try {
      if (category === 'crop_sale') {
        if (!selectedPlotId || !selectedCropId || !buyerName || netAmount <= 0) {
          Alert.alert(t('error'), t('fillRequiredCropSaleFields')); setLoading(false); return;
        }
        await postIncomeTransaction({
          incomeCategory: 'crop_sale',
          ledgerType: 'agriculture',
          category: 'cropSale',
          amount: netAmount,
          date,
          paymentMode,
          partyName: buyerName,
          plotId: selectedPlotId,
          plotName: selectedPlot?.name,
          cropId: selectedCropId,
          cropName: selectedCrop?.cropType,
          cropSeason: selectedCrop?.season,
          billNumber, notes,
          grossAmount,
          totalDeductions,
          cropSaleDetails: {
            plotId: selectedPlotId,
            plotName: selectedPlot?.name || '',
            cropId: selectedCropId,
            cropName: selectedCrop?.cropType || '',
            buyerName,
            quantity: parseFloat(quantity),
            quantityUnit,
            ratePerUnit: parseFloat(ratePerUnit),
            grossAmount,
            hamaliDeduction: parseFloat(hamali || '0'),
            transportDeduction: parseFloat(transportDed || '0'),
            otherDeduction: parseFloat(otherDed || '0'),
            totalDeductions,
            netAmount,
          },
        });
      } else if (category === 'dairy') {
        if (!dairyProduct || dairyTotal <= 0) {
          Alert.alert(t('error'), t('fillDairyIncomeDetails')); setLoading(false); return;
        }
        await postIncomeTransaction({
          incomeCategory: 'dairy',
          ledgerType: 'dairy',
          category: 'dairyIncome',
          amount: dairyTotal,
          date, paymentMode, partyName, billNumber, notes,
          dairyDetails: {
            productType: dairyProduct as any,
            quantity: parseFloat(dairyQty),
            unit: dairyUnit,
            ratePerUnit: parseFloat(dairyRate),
          },
        });
      } else if (category === 'loan') {
        if (!loanType || loanNet <= 0) {
          Alert.alert(t('error'), t('fillLoanDetails')); setLoading(false); return;
        }
        await postIncomeTransaction({
          incomeCategory: 'loan',
          ledgerType: 'personal',
          category: 'loanReceived',
          amount: loanNet,
          date, paymentMode: 'bank', partyName, billNumber, notes,
          loanDetails: {
            loanType: loanType as any,
            sanctionAmount: parseFloat(sanctionAmount),
            processingFee: parseFloat(processingFee || '0'),
            interestRate: parseFloat(interestRate || '0'),
            tenureMonths: parseFloat(tenure || '0'),
            emiFrequency: emiFrequency as any,
            firstInstallmentDate: firstInstallment,
            dueDate: loanDueDate,
            netReceived: loanNet,
          },
        });
      } else if (category === 'other') {
        const amt = parseFloat(otherAmount || '0');
        if (!otherSubtype || amt <= 0) {
          Alert.alert(t('error'), t('fillOtherIncomeDetails')); setLoading(false); return;
        }
        await postIncomeTransaction({
          incomeCategory: 'other',
          ledgerType: 'personal',
          category: otherSubtype,
          amount: amt,
          date, paymentMode, partyName, billNumber, notes,
          otherIncomeDetails: { subtype: otherSubtype as any },
        });
      }
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
          style={[styles.chip, { borderColor: selected === opt ? colors.primary : colors.border, backgroundColor: selected === opt ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
        >
          <Text style={{ color: selected === opt ? colors.primary : colors.foreground, fontWeight: '600', fontSize: 12 }}>{t(opt)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const categories: { key: IncomeCategory; label: string; color: string }[] = [
    { key: 'crop_sale', label: t('cropSale'), color: colors.primary },
    { key: 'dairy', label: t('dairyIncome'), color: colors.info },
    { key: 'loan', label: t('loanReceived'), color: colors.warning },
    { key: 'other', label: t('otherIncome'), color: '#8B5CF6' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{t('cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.primary }]}>{t('moneyIn')}</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!category ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('category')}</Text>
              {categories.map((cat) => (
                <TouchableOpacity key={cat.key} onPress={() => setCategory(cat.key)}>
                  <Card style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: cat.color }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16 }}>{cat.label}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setCategory('')} style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>&larr; {t('back')}</Text>
              </TouchableOpacity>

              {category === 'crop_sale' && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('cropSale')}</Text>
                  <Text style={[styles.label, { color: colors.foreground }]}>{t('plots')}</Text>
                  {renderChips(plots.map((p) => p.name), selectedPlot?.name || '', (v) => { const p = plots.find((pl) => pl.name === v); if (p) { setSelectedPlotId(p.id); setSelectedCropId(''); } })}

                  {selectedPlotId && (
                    <>
                      <Text style={[styles.label, { color: colors.foreground }]}>{t('cropType')}</Text>
                      {renderChips(plotCrops.map((c) => c.cropType), selectedCrop?.cropType || '', (v) => { const c = plotCrops.find((cr) => cr.cropType === v); if (c) setSelectedCropId(c.id); })}
                    </>
                  )}

                  <Input label={t('buyer')} value={buyerName} onChangeText={setBuyerName} />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 2 }}><Input label={t('quantity')} value={quantity} onChangeText={(v) => setQuantity(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: colors.foreground }]}>{t('unit')}</Text>
                      {renderChips(QUANTITY_UNITS, quantityUnit, setQuantityUnit)}
                    </View>
                  </View>
                  <Input label={t('ratePerUnit')} value={ratePerUnit} onChangeText={(v) => setRatePerUnit(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />

                  <Card style={{ marginVertical: 10 }} padding={12}>
                    <Text style={{ color: colors.foreground, fontWeight: '600' }}>{t('grossAmount')}: {fmtCurrency(grossAmount)}</Text>
                  </Card>

                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('deductions')}</Text>
                  <Input label={t('hamali')} value={hamali} onChangeText={(v) => setHamali(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
                  <Input label={t('transport')} value={transportDed} onChangeText={(v) => setTransportDed(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
                  <Input label={t('otherDeduction')} value={otherDed} onChangeText={(v) => setOtherDed(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />

                  <Card style={{ marginVertical: 10, borderLeftWidth: 4, borderLeftColor: colors.primary }} padding={12}>
                    <Text style={{ color: colors.mutedFg, fontSize: 12 }}>{t('deductions')}: {fmtCurrency(totalDeductions)}</Text>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 18 }}>{t('netAmount')}: {fmtCurrency(netAmount)}</Text>
                  </Card>
                </>
              )}

              {category === 'dairy' && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('dairyIncome')}</Text>
                  {renderChips(DAIRY_PRODUCTS, dairyProduct, setDairyProduct)}
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}><Input label={t('quantity')} value={dairyQty} onChangeText={(v) => setDairyQty(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" /></View>
                    <View style={{ flex: 1 }}><Input label={t('unit')} value={dairyUnit} onChangeText={setDairyUnit} /></View>
                    <View style={{ flex: 1 }}><Input label={t('rate')} value={dairyRate} onChangeText={(v) => setDairyRate(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" /></View>
                  </View>
                  <Card style={{ marginVertical: 10 }} padding={12}>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 18 }}>{t('amount')}: {fmtCurrency(dairyTotal)}</Text>
                  </Card>
                </>
              )}

              {category === 'loan' && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('loanReceived')}</Text>
                  {renderChips(LOAN_TYPES, loanType, setLoanType)}
                  <Input label={t('sanctionAmount')} value={sanctionAmount} onChangeText={(v) => setSanctionAmount(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
                  <Input label={t('processingFee')} value={processingFee} onChangeText={(v) => setProcessingFee(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
                  <Input label={`${t('interestRate')} (%)`} value={interestRate} onChangeText={(v) => setInterestRate(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
                  <Input label={t('tenure')} value={tenure} onChangeText={(v) => setTenure(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                  <Text style={[styles.label, { color: colors.foreground }]}>{t('emiFrequency')}</Text>
                  {renderChips(['monthly', 'yearly', 'halfYearly'], emiFrequency, setEmiFrequency)}
                  <DatePickerInput label={t('firstInstallmentDate')} value={firstInstallment} onChange={setFirstInstallment} />
                  <DatePickerInput label={t('dueDate')} value={loanDueDate} onChange={setLoanDueDate} />
                  <Card style={{ marginVertical: 10, borderLeftWidth: 4, borderLeftColor: colors.warning }} padding={12}>
                    <Text style={{ color: colors.warning, fontWeight: '700', fontSize: 18 }}>{t('netReceived')}: {fmtCurrency(loanNet)}</Text>
                  </Card>
                </>
              )}

              {category === 'other' && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('otherIncome')}</Text>
                  {renderChips(OTHER_SUBTYPES, otherSubtype, setOtherSubtype)}
                  <Input label={t('amount')} value={otherAmount} onChangeText={(v) => setOtherAmount(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
                </>
              )}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('commonDetails')}</Text>
              <DatePickerInput label={t('date')} value={date} onChange={setDate} />
              <Text style={[styles.label, { color: colors.foreground }]}>{t('paymentMode')}</Text>
              {renderChips(PAYMENT_MODES, paymentMode, (v) => setPaymentMode(v as PaymentMode))}
              <Input label={t('partyName')} value={partyName} onChangeText={setPartyName} placeholder={t('optional')} />
              <Input label={t('billNumber')} value={billNumber} onChangeText={setBillNumber} placeholder={t('optional')} />
              <Input label={t('notes')} value={notes} onChangeText={setNotes} placeholder={t('optional')} multiline />
            </>
          )}
        </ScrollView>

        {category && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Button title={t('save')} onPress={handleSave} loading={loading} fullWidth />
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
  divider: { height: 1, marginVertical: 20 },
  footer: { padding: 16, borderTopWidth: 1 },
});
