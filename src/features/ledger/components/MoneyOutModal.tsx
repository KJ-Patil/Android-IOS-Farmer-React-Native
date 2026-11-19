import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { logger } from '../../../shared/services/logger';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';
import type { PaymentMode, LedgerType } from '../../../shared/types/ledger';
import { ArrowLeft, ChevronDown, Search, Plus, X, Check, Trash2 } from 'lucide-react-native';
import { getFarmExpenseCategories, FARM_CATEGORY_EMOJIS } from '../../../shared/config/farmCategories';
import { fontSizes } from '../../../shared/utils/typography';

interface MoneyOutModalProps {
  visible: boolean;
  onClose: () => void;
  plotId?: string;
  cropId?: string;
  farmId?: string;
  farmName?: string;
  farmType?: string;
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

const PAYMENT_MODES: PaymentMode[] = ['cash', 'upi', 'credit'];

const AGRI_CATEGORIES = ['seeds', 'fertilizers', 'pesticides', 'labor', 'weeding', 'tractor', 'irrigation', 'agriElectricity', 'transport', 'packing', 'marketCost', 'hamali', 'otherAgri'] as const;
const DAIRY_CATEGORIES = ['fodder', 'animalFeed', 'vaccination', 'medicines', 'veterinary', 'animalPurchase', 'breeding', 'animalInsurance', 'shedMaintenance', 'equipment', 'milkCollection', 'dairyElectricity', 'dairyLabor', 'dairyTransport', 'otherDairy'] as const;
const PERSONAL_CATEGORIES = ['homeExpenses', 'groceries', 'medical', 'education', 'travel', 'petrol', 'diesel', 'electricityBill', 'mobileRecharge', 'marriageFunction', 'emergency', 'otherPersonal'] as const;

const CATEGORY_EMOJIS: Record<string, string> = {
  // Agriculture
  seeds: '🌱',
  fertilizers: '🧪',
  pesticides: '🧴',
  labor: '👷',
  weeding: '🌿',
  tractor: '🚜',
  irrigation: '💧',
  agriElectricity: '⚡',
  transport: '🚛',
  packing: '📦',
  marketCost: '🏪',
  hamali: '🏋️',
  otherAgri: '🌾',
  // Dairy / Livestock
  fodder: '🌾',
  animalFeed: '🌽',
  vaccination: '💉',
  medicines: '💊',
  veterinary: '🩺',
  animalPurchase: '🐄',
  breeding: '🧬',
  animalInsurance: '🛡️',
  shedMaintenance: '🏚️',
  equipment: '⚙️',
  milkCollection: '🥛',
  dairyElectricity: '⚡',
  dairyLabor: '👷',
  dairyTransport: '🚛',
  otherDairy: '🐄',
  // Personal
  homeExpenses: '🏠',
  groceries: '🛒',
  medical: '🏥',
  education: '📚',
  travel: '🚌',
  petrol: '⛽',
  diesel: '🛢️',
  electricityBill: '💡',
  mobileRecharge: '📱',
  marriageFunction: '🎉',
  emergency: '🚨',
  otherPersonal: '👤',
};

const STORAGE_KEY_CUSTOM_EXPENSE_CATS = '@farmer_custom_expense_categories';
const STORAGE_KEY_PARTY_NAMES = '@farmer_party_names';

type Section = 'agriculture' | 'dairy' | 'personal';

export function MoneyOutModal({ visible, onClose, initialData, plotId, cropId, farmId, farmName, farmType }: MoneyOutModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { postExpenseTransaction, transactions } = useLedgerStore();
  const { plots, crops } = usePlotStore();

  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<Section | ''>(farmType ? 'dairy' : 'agriculture');
  const [selectedCategory, setSelectedCategory] = useState(farmType ? '' : 'fertilizers');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [partyName, setPartyName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPlotId, setSelectedPlotId] = useState(plotId || '');
  const [selectedCropId, setSelectedCropId] = useState(cropId || '');

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [addCustomModalOpen, setAddCustomModalOpen] = useState(false);
  const [newCustomCategoryName, setNewCustomCategoryName] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  const [savedPartyNames, setSavedPartyNames] = useState<string[]>([]);
  const [partyDropdownOpen, setPartyDropdownOpen] = useState(false);
  const [addPartyModalOpen, setAddPartyModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');

  const loadCustomCategories = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_CUSTOM_EXPENSE_CATS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCustomCategories(parsed);
        }
      }
    } catch {}
  };

  const loadSavedPartyNames = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_PARTY_NAMES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedPartyNames(parsed);
      }
    } catch {}
  };

  const addPartyName = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = [...new Set([trimmed, ...savedPartyNames])];
    setSavedPartyNames(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PARTY_NAMES, JSON.stringify(updated));
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

  const resetFormFields = useCallback(() => {
    setLoading(false);
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('cash');
    setPartyName('');
    setBillNumber('');
    setNotes('');
    setSelectedPlotId(plotId || '');
    setSelectedCropId(cropId || '');
    setSection(farmType ? 'dairy' : 'agriculture');
    setSelectedCategory(farmType ? '' : 'fertilizers');
    setCategoryDropdownOpen(false);
    setAddCustomModalOpen(false);
    setPartyDropdownOpen(false);
    setAddPartyModalOpen(false);
    setNewCustomCategoryName('');
    setCategorySearchQuery('');
    setNewPartyName('');
  }, [plotId, cropId, farmType]);

  useEffect(() => {
    if (!visible) return;
    Promise.resolve().then(() => {
      resetFormFields();

      if (initialData) {
        if (initialData.amount) setAmount(String(initialData.amount));
        if (initialData.partyName) setPartyName(initialData.partyName);
        if (initialData.billNumber) setBillNumber(initialData.billNumber);
        if (initialData.date) setDate(initialData.date);
        if (initialData.category) setSelectedCategory(initialData.category);
        if (initialData.notes) setNotes(initialData.notes);
        if (initialData.paymentMode) setPaymentMode(initialData.paymentMode);
        setSection(farmType ? 'dairy' : 'agriculture');
      } else if (farmType) {
        setSection('dairy');
        setSelectedCategory('');
      }

      loadCustomCategories();
      loadSavedPartyNames();
    });
  }, [visible, initialData, farmType, resetFormFields]);

  const selectedPlot = plots.find((p) => p.id === selectedPlotId);
  const plotCrops = selectedPlotId ? (crops[selectedPlotId] || []) : [];
  const selectedCrop = plotCrops.find((c) => c.id === selectedCropId);

  const farmExpenseCategories = farmType ? getFarmExpenseCategories(farmType) : DAIRY_CATEGORIES;
  const categoryList = section === 'agriculture' ? AGRI_CATEGORIES : section === 'dairy' ? farmExpenseCategories : PERSONAL_CATEGORIES;
  const ledgerType: LedgerType = section === 'agriculture' ? 'agriculture' : section === 'dairy' ? 'dairy' : 'personal';

  const fullCategoryList = useMemo(() => {
    return [...customCategories, ...categoryList];
  }, [customCategories, categoryList]);

  const filteredCategoryList = useMemo(() => {
    if (!categorySearchQuery.trim()) return fullCategoryList;
    const q = categorySearchQuery.toLowerCase().trim();
    return fullCategoryList.filter((cat) => {
      const translated = (t(cat) !== cat ? t(cat) : cat).toLowerCase();
      const raw = cat.toLowerCase();
      return translated.includes(q) || raw.includes(q);
    });
  }, [fullCategoryList, categorySearchQuery, t]);

  const handleAddCustomCategory = async () => {
    const trimmed = newCustomCategoryName.trim();
    if (!trimmed) {
      Alert.alert(t('error'), t('enterName') || 'Please enter category name');
      return;
    }
    const allCurrent = [...categoryList, ...customCategories];
    if (allCurrent.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert(t('error'), 'This category already exists');
      return;
    }
    const updated = [trimmed, ...customCategories];
    setCustomCategories(updated);
    setSelectedCategory(trimmed);
    setNewCustomCategoryName('');
    setAddCustomModalOpen(false);
    setCategoryDropdownOpen(false);

    try {
      await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_EXPENSE_CATS, JSON.stringify(updated));
    } catch {}
  };

  const handleDeleteCustomCategory = async (catToDelete: string) => {
    const updated = customCategories.filter((c) => c !== catToDelete);
    setCustomCategories(updated);
    if (selectedCategory === catToDelete) {
      setSelectedCategory('fertilizers');
    }
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_EXPENSE_CATS, JSON.stringify(updated));
    } catch {}
  };

  const handleSave = async () => {
    if (!selectedCategory) { Alert.alert(t('error'), t('selectCategory')); return; }
    const amt = parseFloat(amount || '0');
    if (amt <= 0) { Alert.alert(t('error'), t('enterValidAmount')); return; }

    setLoading(true);
    try {
      if (partyName.trim()) addPartyName(partyName.trim());
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
        ...(farmId ? { farmId } : {}),
        ...(farmName ? { farmName } : {}),
      });
      onClose();
    } catch (err: any) {
      logger.error('MoneyOutModal save error:', err);
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
          style={[styles.chip, { borderColor: selected === opt ? colors.destructive : colors.border, backgroundColor: selected === opt ? colors.destructive + '15' : colors.card, borderRadius: 8 }]}
        >
          <Text style={{ color: selected === opt ? colors.destructive : colors.foreground, fontWeight: '600', fontSize: fontSizes.sm }}>{t(opt)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const allSections: { key: Section; label: string; count: number }[] = [
    { key: 'agriculture', label: t('agricultureExpenses'), count: AGRI_CATEGORIES.length },
    { key: 'dairy', label: t('dairyExpenses'), count: DAIRY_CATEGORIES.length },
    { key: 'personal', label: t('personalExpenses'), count: PERSONAL_CATEGORIES.length },
  ];
  const sections = plotId
    ? allSections.filter((s) => s.key !== 'dairy')
    : farmType
      ? allSections.filter((s) => s.key !== 'agriculture')
      : allSections;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ width: 40 }} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>💸 {t('moneyOut')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {!section ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('expenseSection')}</Text>
              {sections.map((sec) => (
                <TouchableOpacity key={sec.key} onPress={() => setSection(sec.key)}>
                  <Card style={{ marginBottom: 10, borderLeftWidth: 4, borderLeftColor: colors.destructive }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: fontSizes.md }}>{sec.label}</Text>
                    <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{sec.count} {t('categoriesCount')}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </>
          ) : (
            <>
              {!farmType && (
                <TouchableOpacity
                  onPress={() => { setSection(''); setSelectedCategory(''); }}
                  activeOpacity={0.7}
                  style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                >
                  <ArrowLeft size={16} color={colors.foreground} />
                  <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.base, marginLeft: 6 }}>{t('back')}</Text>
                </TouchableOpacity>
              )}

              {farmType ? (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t('expense')}</Text>
                  <Input label={t('expense')} value={selectedCategory} onChangeText={setSelectedCategory} placeholder={t('enterName')} autoFocus />
                </>
              ) : (
                <>
                  {/* Category Header Row with + Add Button */}
                  <View style={styles.categoryHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>
                      {t('category')}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setAddCustomModalOpen(true)}
                      activeOpacity={0.75}
                      style={styles.addCategoryHeaderBtn}
                    >
                      <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.addCategoryHeaderBtnText}>
                        {t('add')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Category Dropdown Trigger */}
                  <TouchableOpacity
                    onPress={() => {
                      setCategorySearchQuery('');
                      setCategoryDropdownOpen(true);
                    }}
                    activeOpacity={0.7}
                    style={[
                      styles.dropdownTrigger,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.dropdownLeft}>
                      <Text style={{ fontSize: fontSizes.xl }}>
                        {CATEGORY_EMOJIS[selectedCategory] || FARM_CATEGORY_EMOJIS[selectedCategory] || '🏷️'}
                      </Text>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.dropdownSelectedText, { color: colors.foreground }]} numberOfLines={1}>
                          {t(selectedCategory) !== selectedCategory ? t(selectedCategory) : selectedCategory}
                        </Text>
                        <Text style={[styles.dropdownSubtext, { color: colors.mutedFg }]}>
                          {customCategories.includes(selectedCategory)
                            ? `★ ${t('custom') || 'Custom'}`
                            : t('expenseCategory')}
                        </Text>
                      </View>
                    </View>
                    <ChevronDown size={18} color={colors.mutedFg} />
                  </TouchableOpacity>
                </>
              )}

              {section === 'agriculture' && (
                <>
                  {plotId ? (
                    <>
                      <Text style={[styles.label, { color: colors.foreground }]}>{t('plot')}</Text>
                      <View style={[styles.chip, { borderColor: colors.primary, backgroundColor: colors.primary + '15', borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 }]}>
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSizes.sm }}>{selectedPlot?.name}</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.label, { color: colors.foreground }]}>{t('linkToPlotCropOptional')}</Text>
                      <View style={styles.chipGrid}>
                        {plots.map((p) => (
                          <TouchableOpacity
                            key={p.id}
                            onPress={() => { setSelectedPlotId(p.id); setSelectedCropId(''); }}
                            style={[styles.chip, { borderColor: selectedPlotId === p.id ? colors.primary : colors.border, backgroundColor: selectedPlotId === p.id ? colors.primary + '15' : colors.card, borderRadius: 8 }]}
                          >
                            <Text style={{ color: selectedPlotId === p.id ? colors.primary : colors.foreground, fontWeight: '600', fontSize: fontSizes.sm }}>{p.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  {selectedPlotId && plotCrops.length > 0 && (
                    <>
                      <Text style={[styles.label, { color: colors.foreground }]}>{t('crop')}</Text>
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
                </>
              )}

              <Input label={t('amount')} value={amount} onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" placeholder="₹0" />
              <DatePickerInput label={t('date')} value={date} onChange={setDate} />

              <Text style={[styles.label, { color: colors.foreground }]}>{t('paymentMode')}</Text>
              {renderChips(PAYMENT_MODES, paymentMode, (v) => setPaymentMode(v as PaymentMode))}


              <Text style={[styles.label, { color: colors.foreground }]}>{t('partyName')}</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    onPress={() => { setPartyDropdownOpen(!partyDropdownOpen); }}
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
                            style={[styles.partyDropdownItem, { borderBottomColor: colors.border }]}
                          >
                            <Text style={{ color: colors.foreground, fontSize: fontSizes.base }}>{name}</Text>
                          </TouchableOpacity>
                        ))}
                        {filteredPartyNames.length === 0 && partyName.trim() ? (
                          <TouchableOpacity
                            onPress={() => { addPartyName(partyName.trim()); setPartyDropdownOpen(false); }}
                            style={[styles.partyDropdownItem, { borderBottomColor: colors.border }]}
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

              {/* Add Party Name Modal */}
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
                            addPartyName(newPartyName.trim());
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

        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={[styles.cancelBtn, { backgroundColor: colors.destructive }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: fontSizes.base }}>✕ {t('cancel')}</Text>
          </TouchableOpacity>
          {section && (
            <TouchableOpacity onPress={handleSave} activeOpacity={0.7} disabled={loading} style={[styles.saveBtn, { backgroundColor: '#16A34A', shadowColor: '#16A34A', opacity: loading ? 0.6 : 1 }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fontSizes.md }}>{loading ? '...' : `✓ ${t('save')}`}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Dropdown Modal */}
        <Modal
          visible={categoryDropdownOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setCategoryDropdownOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.dropdownModalCard, { backgroundColor: colors.card }]}>
              {/* Modal Header */}
              <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitleText, { color: colors.foreground }]}>
                    {t('selectCategory') || 'Select Category'}
                  </Text>
                  <Text style={{ fontSize: fontSizes.sm, color: colors.mutedFg, marginTop: 2 }}>
                    {fullCategoryList.length} {t('categoriesCount')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setCategoryDropdownOpen(false)}
                  style={[styles.closeModalBtn, { backgroundColor: colors.muted + '20' }]}
                >
                  <X size={18} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              {/* Search Bar & + Add Button Row */}
              <View style={styles.searchAndAddRow}>
                <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Search size={16} color={colors.mutedFg} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.foreground }]}
                    placeholder={t('search') || 'Search categories...'}
                    placeholderTextColor={colors.mutedFg}
                    value={categorySearchQuery}
                    onChangeText={setCategorySearchQuery}
                    autoCapitalize="none"
                  />
                  {categorySearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setCategorySearchQuery('')}>
                      <X size={14} color={colors.mutedFg} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => {
                    setCategoryDropdownOpen(false);
                    setAddCustomModalOpen(true);
                  }}
                  activeOpacity={0.7}
                  style={[styles.addCustomInlineBtn, { backgroundColor: colors.primary }]}
                >
                  <Plus size={16} color="#FFFFFF" />
                  <Text style={styles.addCustomInlineBtnText}>{t('add')}</Text>
                </TouchableOpacity>
              </View>

              {/* Categories List */}
              <FlatList
                data={filteredCategoryList}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 360 }}
                contentContainerStyle={{ paddingVertical: 4 }}
                renderItem={({ item }) => {
                  const isSelected = selectedCategory === item;
                  const isCustom = customCategories.includes(item);
                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => {
                        setSelectedCategory(item);
                        setCategoryDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                      style={[
                        styles.categoryListItem,
                        {
                          backgroundColor: isSelected ? colors.primary + '12' : 'transparent',
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: fontSizes.lg, marginRight: 12 }}>
                        {CATEGORY_EMOJIS[item] || FARM_CATEGORY_EMOJIS[item] || '🏷️'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.categoryItemTitle,
                            {
                              color: isSelected ? colors.primary : colors.foreground,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}
                        >
                          {t(item) !== item ? t(item) : item}
                        </Text>
                        {isCustom && (
                          <Text style={{ fontSize: fontSizes.xs, color: colors.primary, fontWeight: '700', marginTop: 1 }}>
                            ★ {t('custom') || 'Custom'}
                          </Text>
                        )}
                      </View>

                      {isCustom && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomCategory(item);
                          }}
                          style={{ padding: 6, marginRight: 6 }}
                        >
                          <Trash2 size={15} color={colors.destructive} />
                        </TouchableOpacity>
                      )}

                      {isSelected && <Check size={18} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyListNotice}>
                    <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>
                      {t('noResultsFound') || 'No categories found'}
                    </Text>
                    {categorySearchQuery.trim().length > 0 && (
                      <TouchableOpacity
                        onPress={() => {
                          setNewCustomCategoryName(categorySearchQuery.trim());
                          setCategoryDropdownOpen(false);
                          setAddCustomModalOpen(true);
                        }}
                        style={[styles.addAsCustomBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                      >
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fontSizes.sm }}>
                          {`+ Add "${categorySearchQuery.trim()}"`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                }
              />
            </View>
          </View>
        </Modal>

        {/* Add Custom Category Dialog */}
        <Modal
          visible={addCustomModalOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setAddCustomModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.addCustomCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.addCustomHeader}>
                <Text style={[styles.addCustomTitle, { color: colors.foreground }]}>
                  🏷️ {t('addCustomCategory')}
                </Text>
                <TouchableOpacity onPress={() => setAddCustomModalOpen(false)}>
                  <X size={18} color={colors.mutedFg} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: fontSizes.sm, color: colors.mutedFg, marginBottom: 12, lineHeight: 17 }}>
                {t('enterCustomCategoryPrompt')}
              </Text>

              <TextInput
                style={[
                  styles.customCategoryInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="e.g. Bio Fertilizer, Machine Rent"
                placeholderTextColor={colors.mutedFg}
                value={newCustomCategoryName}
                onChangeText={setNewCustomCategoryName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddCustomCategory}
              />

              <View style={styles.addCustomActions}>
                <TouchableOpacity
                  onPress={() => {
                    setNewCustomCategoryName('');
                    setAddCustomModalOpen(false);
                  }}
                  style={[styles.customActionBtn, { backgroundColor: colors.destructive, borderColor: colors.destructive }]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAddCustomCategory}
                  style={[styles.customActionBtn, { backgroundColor: '#16A34A', borderColor: '#16A34A' }]}
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
  footer: { flexDirection: 'row', padding: 16, paddingBottom: 34, gap: 12, borderTopWidth: 1 },
  cancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  saveBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCategoryHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addCategoryHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    marginBottom: 16,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownSelectedText: {
    fontSize: fontSizes.base,
    fontWeight: '700',
  },
  dropdownSubtext: {
    fontSize: fontSizes.xs,
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownModalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitleText: {
    fontSize: fontSizes.md,
    fontWeight: '800',
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAndAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 48,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.base,
    paddingVertical: 6,
  },
  addCustomInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 12,
    gap: 4,
  },
  addCustomInlineBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: fontSizes.sm,
  },
  categoryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryItemTitle: {
    fontSize: fontSizes.base,
  },
  emptyListNotice: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  addAsCustomBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addCustomCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  addCustomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCustomTitle: {
    fontSize: fontSizes.md,
    fontWeight: '800',
  },
  customCategoryInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: fontSizes.md,
    minHeight: 48,
    marginBottom: 16,
  },
  addCustomActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  customActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  partyDropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48 },
  partyDropdownList: { borderWidth: 1, borderRadius: 12, marginTop: 4, marginBottom: 12, overflow: 'hidden' },
  partySearchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  partyDropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' },
  addPartyBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  addPartyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  addPartyCard: { width: '100%', maxWidth: 380, borderRadius: 20, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 8 },
  addPartyInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: fontSizes.md, minHeight: 48 },
  addPartyActionBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
});
