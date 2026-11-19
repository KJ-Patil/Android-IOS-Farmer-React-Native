import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { logger } from '../../../shared/services/logger';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { ArrowLeft, ChevronDown, Search, Plus, X } from 'lucide-react-native';
import type { IncomeCategory, PaymentMode } from '../../../shared/types/ledger';
import { getFarmIncomeCategories } from '../../../shared/config/farmCategories';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontSizes } from '../../../shared/utils/typography';

const STORAGE_KEY_PARTY_NAMES = '@farmer_party_names';
const STORAGE_KEY_CUSTOM_INCOME_CATS = '@farmer_custom_income_categories';

interface MoneyInModalProps {
  visible: boolean;
  onClose: () => void;
  plotId?: string;
  cropId?: string;
  farmId?: string;
  farmName?: string;
  farmType?: string;
}

const PAYMENT_MODES: PaymentMode[] = ['cash', 'upi', 'credit'];
const DAIRY_PRODUCTS = ['milk', 'ghee', 'paneer', 'curd', 'buttermilk', 'khava', 'animalSale', 'dung', 'other'] as const;
const LOAN_TYPES = ['cropLoan', 'termLoan', 'tractorLoan', 'goldLoan', 'personalLoan'] as const;
const OTHER_SUBTYPES = ['subsidy', 'insuranceClaim', 'tractorRent', 'implementsRent', 'waterSale', 'saplingsSale', 'seedsSale', 'organicManureSale', 'wages', 'interest', 'commission', 'custom'] as const;
const QUANTITY_UNITS = ['Bags', 'Quintal', 'Kg', 'Ton', 'Crates'];

export function MoneyInModal({ visible, onClose, plotId, cropId, farmId, farmName, farmType }: MoneyInModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { postIncomeTransaction, transactions } = useLedgerStore();
  const { plots, crops } = usePlotStore();
  const { fmtCurrency } = useLocalizedFormat();

  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<IncomeCategory | ''>(cropId ? 'crop_sale' : farmType ? 'dairy' : '');

  // Common fields
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [partyName, setPartyName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Custom income categories
  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>([]);
  const [addCustomIncomeCatOpen, setAddCustomIncomeCatOpen] = useState(false);
  const [newCustomIncomeCatName, setNewCustomIncomeCatName] = useState('');

  // Party name
  const [savedPartyNames, setSavedPartyNames] = useState<string[]>([]);
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const [addPartyModalOpen, setAddPartyModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');

  const addPartyNameToStorage = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = [...new Set([trimmed, ...savedPartyNames])];
    setSavedPartyNames(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PARTY_NAMES, JSON.stringify(updated));
    } catch {}
  };

  const handleAddCustomIncomeCat = async () => {
    const trimmed = newCustomIncomeCatName.trim();
    if (!trimmed) {
      Alert.alert(t('error'), t('enterName') || 'Please enter category name');
      return;
    }
    if (customIncomeCategories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert(t('error'), 'This category already exists');
      return;
    }
    const updated = [trimmed, ...customIncomeCategories];
    setCustomIncomeCategories(updated);
    setDairyProduct(trimmed);
    setNewCustomIncomeCatName('');
    setAddCustomIncomeCatOpen(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_INCOME_CATS, JSON.stringify(updated));
    } catch {}
  };

  const allPartyNames = useMemo(() => {
    const fromTxns = transactions
      .map((tx) => tx.partyName?.trim())
      .filter((n): n is string => !!n);
    return [...new Set([...savedPartyNames, ...fromTxns])].sort();
  }, [savedPartyNames, transactions]);

  const filteredPartyNames = useMemo(() => {
    if (!partyName.trim()) return allPartyNames;
    const q = partyName.toLowerCase();
    return allPartyNames.filter((n) => n.toLowerCase().includes(q));
  }, [allPartyNames, partyName]);

  // Crop Sale
  const [selectedPlotId, setSelectedPlotId] = useState(plotId || '');
  const [selectedCropId, setSelectedCropId] = useState(cropId || '');
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
  const [dairyUnit, setDairyUnit] = useState('');
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

  const resetFormFields = useCallback(() => {
    setCategory(cropId ? 'crop_sale' : farmType ? 'dairy' : '');
    setPaymentMode('cash');
    setPartyName('');
    setBillNumber('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedPlotId(plotId || '');
    setSelectedCropId(cropId || '');
    setBuyerName('');
    setQuantity('');
    setQuantityUnit('Quintal');
    setRatePerUnit('');
    setHamali('');
    setTransportDed('');
    setOtherDed('');
    setDairyProduct('');
    setDairyQty('');
    setDairyUnit('');
    setDairyRate('');
    setLoanType('');
    setSanctionAmount('');
    setProcessingFee('');
    setInterestRate('');
    setTenure('');
    setEmiFrequency('monthly');
    setFirstInstallment('');
    setLoanDueDate('');
    setOtherSubtype('');
    setOtherAmount('');
    setPartyDropdownOpen(false);
    setAddPartyModalOpen(false);
    setAddCustomIncomeCatOpen(false);
    setNewCustomIncomeCatName('');
    setNewPartyName('');
    setLoading(false);
  }, [cropId, plotId, farmType]);

  useEffect(() => {
    if (!visible) return;
    const reset = () => {
      resetFormFields();
    };
    Promise.resolve().then(reset);

    AsyncStorage.getItem(STORAGE_KEY_CUSTOM_INCOME_CATS)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setCustomIncomeCategories(parsed);
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(STORAGE_KEY_PARTY_NAMES)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setSavedPartyNames(parsed);
        }
      })
      .catch(() => {});
  }, [visible, resetFormFields]);

  const selectedPlot = plots.find((p) => p.id === selectedPlotId);
  const plotCrops = selectedPlotId ? (crops[selectedPlotId] || []) : [];
  const selectedCrop = plotCrops.find((c) => c.id === selectedCropId);

  const grossAmount = parseFloat(quantity || '0') * parseFloat(ratePerUnit || '0');
  const totalDeductions = parseFloat(hamali || '0') + parseFloat(transportDed || '0') + parseFloat(otherDed || '0');
  const netAmount = grossAmount - totalDeductions;

  const dairyTotal = parseFloat(dairyQty || '0') * parseFloat(dairyRate || '0');
  const loanNet = parseFloat(sanctionAmount || '0') - parseFloat(processingFee || '0');

  const handleSave = async () => {
    if (!category) { Alert.alert(t('error'), t('selectCategory')); return; }
    setLoading(true);
    if (partyName.trim()) addPartyNameToStorage(partyName.trim());
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
          ...(farmId ? { farmId } : {}),
          ...(farmName ? { farmName } : {}),
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
        if (farmType) {
          const farmAmt = parseFloat(otherAmount || '0');
          if (!dairyProduct || farmAmt <= 0) {
            Alert.alert(t('error'), t('fillDairyIncomeDetails')); setLoading(false); return;
          }
          await postIncomeTransaction({
            incomeCategory: 'dairy',
            ledgerType: 'dairy',
            category: dairyProduct,
            amount: farmAmt,
            date, paymentMode, partyName, billNumber, notes,
            ...(farmId ? { farmId } : {}),
            ...(farmName ? { farmName } : {}),
          });
        } else {
          if (!dairyProduct || dairyTotal <= 0) {
            Alert.alert(t('error'), t('fillDairyIncomeDetails')); setLoading(false); return;
          }
          await postIncomeTransaction({
            incomeCategory: 'dairy',
            ledgerType: 'dairy',
            category: 'dairyIncome',
            amount: dairyTotal,
            date, paymentMode, partyName, billNumber, notes,
            ...(farmId ? { farmId } : {}),
            ...(farmName ? { farmName } : {}),
            dairyDetails: {
              productType: dairyProduct as any,
              quantity: parseFloat(dairyQty),
              unit: dairyUnit,
              ratePerUnit: parseFloat(dairyRate),
            },
          });
        }
      } else if (category === 'loan') {
        if (!loanType || loanNet <= 0) {
          Alert.alert(t('error'), t('fillLoanDetails')); setLoading(false); return;
        }
        await postIncomeTransaction({
          incomeCategory: 'loan',
          ledgerType: 'personal',
          category: 'loanReceived',
          amount: loanNet,
          date, paymentMode: 'upi', partyName, billNumber, notes,
          ...(farmId ? { farmId } : {}),
          ...(farmName ? { farmName } : {}),
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
          ...(farmId ? { farmId } : {}),
          ...(farmName ? { farmName } : {}),
          otherIncomeDetails: { subtype: otherSubtype as any },
        });
      }
      onClose();
    } catch (err: any) {
      logger.error('MoneyInModal save error:', err);
      Alert.alert(t('error'), t('somethingWentWrong'));
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
          <Text style={{ color: selected === opt ? colors.primary : colors.foreground, fontWeight: '600', fontSize: fontSizes.sm }}>{t(opt)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const farmIncomeLabel = farmType && farmType !== 'dairy' ? `${t(farmType)} ${t('farmIncome')}` : t('dairyIncome');
  const allCategories: { key: IncomeCategory; label: string; color: string }[] = [
    { key: 'crop_sale', label: t('cropSale'), color: colors.primary },
    { key: 'dairy', label: farmIncomeLabel, color: colors.info },
    { key: 'loan', label: t('loanReceived'), color: colors.warning },
    { key: 'other', label: t('otherIncome'), color: '#8B5CF6' },
  ];
  const categories = plotId
    ? allCategories.filter((c) => c.key !== 'dairy' && c.key !== 'loan')
    : farmType
      ? allCategories.filter((c) => c.key !== 'crop_sale' && c.key !== 'loan')
      : allCategories;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ width: 40 }} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>💰 {t('moneyIn')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!category ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('category')}</Text>
              {categories.map((cat) => (
                <TouchableOpacity key={cat.key} onPress={() => setCategory(cat.key)}>
                  <Card style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: cat.color }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: fontSizes.md }}>{cat.label}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              {!farmType && (
                <TouchableOpacity
                  onPress={() => setCategory('')}
                  activeOpacity={0.7}
                  style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <ArrowLeft size={16} color={colors.foreground} />
                  <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.base, marginLeft: 6 }}>{t('back')}</Text>
                </TouchableOpacity>
              )}

              {category === 'crop_sale' && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('cropSale')}</Text>
                  {plotId ? (
                    <>
                      <Text style={[styles.label, { color: colors.foreground }]}>{t('plot')}</Text>
                      <View style={[styles.chip, { borderColor: colors.primary, backgroundColor: colors.primary + '15', borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 }]}>
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSizes.sm }}>{selectedPlot?.name}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.label, { color: colors.foreground }]}>{t('plots')}</Text>
                      {renderChips(plots.map((p) => p.name), selectedPlot?.name || '', (v) => { const p = plots.find((pl) => pl.name === v); if (p) { setSelectedPlotId(p.id); setSelectedCropId(''); } })}
                    </>
                  )}

                  {selectedPlotId && (
                    <>
                      <Text style={[styles.label, { color: colors.foreground }]}>{t('cropType')}</Text>
                      <View style={styles.chipGrid}>
                        {plotCrops.map((c) => {
                          const isDone = c.status === 'harvested' || c.status === 'completed';
                          const isSelected = selectedCropId === c.id;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              onPress={() => setSelectedCropId(c.id)}
                              style={[styles.chip, {
                                borderColor: isSelected ? colors.primary : colors.border,
                                backgroundColor: isSelected ? colors.primary + '15' : isDone ? colors.muted : colors.card,
                                borderRadius: 8,
                                opacity: isDone ? 0.55 : 1,
                              }]}
                            >
                              <Text style={{ color: isSelected ? colors.primary : isDone ? colors.mutedFg : colors.foreground, fontWeight: '600', fontSize: fontSizes.sm }}>
                                {t(c.cropType)} {isDone ? `(${t(c.status)})` : ''}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  <Input label={t('buyer')} value={buyerName} onChangeText={setBuyerName} />
                  <Input label={t('quantity')} value={quantity} onChangeText={(v) => setQuantity(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
                  <Text style={[styles.label, { color: colors.foreground }]}>{t('unit')}</Text>
                  {renderChips(QUANTITY_UNITS, quantityUnit, setQuantityUnit)}
                  <Input label={t('ratePerUnit')} value={ratePerUnit} onChangeText={(v) => setRatePerUnit(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />

                  <Card style={{ marginVertical: 10 }} padding={12}>
                    <Text style={{ color: colors.foreground, fontWeight: '600' }}>{t('grossAmount')}: {fmtCurrency(grossAmount)}</Text>
                  </Card>

                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('deductions')}</Text>
                  <Input label={t('hamali')} value={hamali} onChangeText={(v) => setHamali(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
                  <Input label={t('transport')} value={transportDed} onChangeText={(v) => setTransportDed(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />
                  <Input label={t('otherDeduction')} value={otherDed} onChangeText={(v) => setOtherDed(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />

                  <Card style={{ marginVertical: 10, borderLeftWidth: 4, borderLeftColor: colors.primary }} padding={12}>
                    <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{t('deductions')}: {fmtCurrency(totalDeductions)}</Text>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSizes.lg }}>{t('netAmount')}: {fmtCurrency(netAmount)}</Text>
                  </Card>
                </>
              )}

              {category === 'dairy' && (
                <>
                  {farmType ? (
                    <>
                      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('income')}</Text>
                      <Input label={t('income')} value={dairyProduct} onChangeText={setDairyProduct} placeholder={t('enterName')} autoFocus />
                      <Input label={t('amount')} value={otherAmount} onChangeText={(v) => setOtherAmount(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="₹0" />
                    </>
                  ) : (
                    <>
                      <View style={styles.incomeCatHeaderRow}>
                        <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                          {t('dairyIncome')}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setAddCustomIncomeCatOpen(true)}
                          activeOpacity={0.75}
                          style={styles.addIncomeCatBtn}
                        >
                          <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                          <Text style={styles.addIncomeCatBtnText}>{t('add')}</Text>
                        </TouchableOpacity>
                      </View>
                      {renderChips([...customIncomeCategories, ...DAIRY_PRODUCTS], dairyProduct, setDairyProduct)}
                      <Input label={t('quantity')} value={dairyQty} onChangeText={(v) => setDairyQty(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
                      <Input label={t('unit')} value={dairyUnit} onChangeText={setDairyUnit} />
                      <Input label={t('rate')} value={dairyRate} onChangeText={(v) => setDairyRate(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
                      <Card style={{ marginVertical: 10 }} padding={12}>
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSizes.lg }}>{t('amount')}: {fmtCurrency(dairyTotal)}</Text>
                      </Card>
                    </>
                  )}
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
                    <Text style={{ color: colors.warning, fontWeight: '700', fontSize: fontSizes.lg }}>{t('netReceived')}: {fmtCurrency(loanNet)}</Text>
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
              <Text style={[styles.label, { color: colors.foreground }]}>{t('partyName')}</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    onPress={() => setPartyDropdownOpen(!partyDropdownOpen)}
                    style={[styles.partyDropdown, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: partyName ? colors.foreground : colors.mutedFg, fontSize: fontSizes.base, flex: 1 }} numberOfLines={1}>
                      {partyName || t('optional')}
                    </Text>
                    <ChevronDown size={16} color={colors.mutedFg} />
                  </TouchableOpacity>
                  {partyDropdownOpen && (
                    <View style={[styles.partyDropdownList, { borderColor: colors.border, backgroundColor: colors.card }]}>
                      <View style={[styles.partySearchRow, { borderBottomColor: colors.border }]}>
                        <Search size={14} color={colors.mutedFg} />
                        <TextInput
                          value={partyName}
                          onChangeText={setPartyName}
                          placeholder={t('searchOrType')}
                          placeholderTextColor={colors.mutedFg}
                          style={{ flex: 1, color: colors.foreground, fontSize: fontSizes.base, padding: 0, marginLeft: 8 }}
                          autoFocus
                        />
                        {partyName ? (
                          <TouchableOpacity onPress={() => setPartyName('')}>
                            <X size={14} color={colors.mutedFg} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <ScrollView style={{ maxHeight: 150 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                        {filteredPartyNames.map((name) => (
                          <TouchableOpacity
                            key={name}
                            onPress={() => { setPartyName(name); setPartyDropdownOpen(false); }}
                            style={[styles.partyItem, { borderBottomColor: colors.border }]}
                          >
                            <Text style={{ color: colors.foreground, fontSize: fontSizes.base }}>{name}</Text>
                          </TouchableOpacity>
                        ))}
                        {filteredPartyNames.length === 0 && partyName.trim() ? (
                          <TouchableOpacity
                            onPress={() => { addPartyNameToStorage(partyName.trim()); setPartyDropdownOpen(false); }}
                            style={[styles.partyItem, { borderBottomColor: colors.border }]}
                          >
                            <Plus size={14} color={colors.primary} />
                            <Text style={{ color: colors.primary, fontSize: fontSizes.base, fontWeight: '600', marginLeft: 6 }}>
                              {t('add')} {`"${partyName.trim()}"`}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => { setNewPartyName(''); setAddPartyModalOpen(true); }}
                  style={[styles.addPartyBtn, { backgroundColor: colors.primary, borderRadius: colors.radius }]}
                  activeOpacity={0.7}
                >
                  <Plus color="#FFFFFF" size={18} />
                </TouchableOpacity>
              </View>

              <Modal visible={addPartyModalOpen} transparent animationType="fade">
                <View style={styles.addPartyOverlay}>
                  <View style={[styles.addPartyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={{ color: colors.foreground, fontSize: fontSizes.md, fontWeight: '700', marginBottom: 12 }}>
                      {t('addPartyName')}
                    </Text>
                    <TextInput
                      value={newPartyName}
                      onChangeText={setNewPartyName}
                      placeholder={t('enterPartyName')}
                      placeholderTextColor={colors.mutedFg}
                      style={[styles.addPartyInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                      autoFocus
                    />
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                      <TouchableOpacity
                        onPress={() => setAddPartyModalOpen(false)}
                        style={[styles.addPartyActionBtn, { backgroundColor: colors.muted }]}
                      >
                        <Text style={{ color: colors.foreground, fontWeight: '600' }}>{t('cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          if (newPartyName.trim()) {
                            addPartyNameToStorage(newPartyName.trim());
                            setPartyName(newPartyName.trim());
                          }
                          setAddPartyModalOpen(false);
                        }}
                        style={[styles.addPartyActionBtn, { backgroundColor: colors.primary }]}
                      >
                        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{t('save')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
              <Input label={t('billNumber')} value={billNumber} onChangeText={setBillNumber} placeholder={t('optional')} />
              <Input label={t('notes')} value={notes} onChangeText={setNotes} placeholder={t('optional')} multiline />
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={[styles.cancelBtn, { borderColor: colors.destructive }]}>
            <Text style={{ color: colors.destructive, fontWeight: '700', fontSize: fontSizes.base }}>✕ {t('cancel')}</Text>
          </TouchableOpacity>
          {category && (
            <TouchableOpacity onPress={handleSave} activeOpacity={0.7} disabled={loading} style={[styles.saveBtn, { backgroundColor: colors.success, shadowColor: colors.success, opacity: loading ? 0.6 : 1 }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fontSizes.md }}>{loading ? '...' : `✓ ${t('save')}`}</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Add Custom Income Category Dialog */}
        <Modal
          visible={addCustomIncomeCatOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setAddCustomIncomeCatOpen(false)}
        >
          <View style={styles.customCatBackdrop}>
            <View style={[styles.customCatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.customCatHeader}>
                <Text style={[styles.customCatTitle, { color: colors.foreground }]}>
                  🏷️ {t('addCustomCategory')}
                </Text>
                <TouchableOpacity onPress={() => setAddCustomIncomeCatOpen(false)}>
                  <X size={18} color={colors.mutedFg} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.customCatInput,
                  { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border },
                ]}
                placeholder={t('enterName') || 'Enter category name'}
                placeholderTextColor={colors.mutedFg}
                value={newCustomIncomeCatName}
                onChangeText={setNewCustomIncomeCatName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddCustomIncomeCat}
              />

              <View style={styles.customCatActions}>
                <TouchableOpacity
                  onPress={() => { setNewCustomIncomeCatName(''); setAddCustomIncomeCatOpen(false); }}
                  style={[styles.customCatActionBtn, { backgroundColor: colors.destructive }]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddCustomIncomeCat}
                  style={[styles.customCatActionBtn, { backgroundColor: '#16A34A' }]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>+ {t('add')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1 },
  title: { fontSize: fontSizes.lg, fontWeight: '800' },
  scroll: { padding: 16, paddingBottom: 60 },
  sectionTitle: { fontSize: fontSizes.md, fontWeight: '600', marginBottom: 12 },
  label: { fontSize: fontSizes.base, fontWeight: '500', marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1.5, paddingVertical: 8, paddingHorizontal: 12 },
  divider: { height: 1, marginVertical: 20 },
  footer: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  saveBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  partyDropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  partyDropdownList: { borderWidth: 1, borderRadius: 12, marginTop: 4, marginBottom: 12, overflow: 'hidden' },
  partySearchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  partyItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' },
  addPartyBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  addPartyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  addPartyCard: { width: '100%', maxWidth: 380, borderRadius: 20, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  addPartyInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: fontSizes.md, minHeight: 48 },
  addPartyActionBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  incomeCatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addIncomeCatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#16A34A', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  addIncomeCatBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: fontSizes.sm },
  customCatBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  customCatCard: { width: '100%', maxWidth: 380, borderRadius: 20, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  customCatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  customCatTitle: { fontSize: fontSizes.md, fontWeight: '700' },
  customCatInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: fontSizes.md, minHeight: 48, marginBottom: 14 },
  customCatActions: { flexDirection: 'row', gap: 10 },
  customCatActionBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
});
