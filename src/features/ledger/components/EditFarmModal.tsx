import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useNotebookFarmStore, FarmType, NotebookFarm } from '../../../shared/hooks/useNotebookFarmStore';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { fontSizes } from '../../../shared/utils/typography';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { tCategory, tPaymentMode } from '../../../shared/utils/helpers';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { MoneyInModal } from './MoneyInModal';
import { MoneyOutModal } from './MoneyOutModal';
import { X, Minus, Plus, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';

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
  const { updateFarm, deleteFarm, fetchFarms } = useNotebookFarmStore();
  const { transactions, fetchTransactions } = useLedgerStore();
  const { fmtCurrency, fmtDMY, toNative } = useLocalizedFormat();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [count, setCount] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [displayCount, setDisplayCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [moneyInVisible, setMoneyInVisible] = useState(false);
  const [moneyOutVisible, setMoneyOutVisible] = useState(false);

  const [prevFarmId, setPrevFarmId] = useState<string | null>(null);
  if (farm && farm.id !== prevFarmId) {
    setPrevFarmId(farm.id);
    setName(farm.name);
    setCount(farm.animalCount || 0);
    setDisplayName(farm.name);
    setDisplayCount(farm.animalCount || 0);
    setError('');
    setLoading(false);
    setEditing(false);
  }
  if (!farm && prevFarmId) {
    setPrevFarmId(null);
  }

  const farmTransactions = useMemo(() => {
    if (!farm) return [];
    return [...transactions]
      .filter((tx) => tx.farmId === farm.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions, farm]);

  const farmIncome = useMemo(
    () => farmTransactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + (tx.amount || 0), 0),
    [farmTransactions],
  );
  const farmExpense = useMemo(
    () => farmTransactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + (tx.amount || 0), 0),
    [farmTransactions],
  );

  if (!farm) return null;

  const emoji = FARM_EMOJI[farm.type] || '🌾';
  const fmt = (v: number) => fmtCurrency(Math.round(v));

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError(t('enterFarmName')); return; }
    setError('');
    setLoading(true);
    try {
      await updateFarm(farm.id, { name: trimmed, animalCount: count > 0 ? count : undefined });
      setDisplayName(trimmed);
      setDisplayCount(count);
      setEditing(false);
      fetchFarms();
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('deleteFarmConfirm'))) { deleteFarm(farm.id); onClose(); }
    } else {
      Alert.alert(t('deleteFarm'), t('deleteFarmConfirm'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => { deleteFarm(farm.id); onClose(); } },
      ]);
    }
  };

  const handleMoneyInClose = () => {
    setMoneyInVisible(false);
    fetchTransactions();
  };

  const handleMoneyOutClose = () => {
    setMoneyOutVisible(false);
    fetchTransactions();
  };

  return (
    <>
      <Modal visible={true} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header bar */}
          <View style={[styles.headerBar, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={onClose} style={[styles.headerIconBtn, { backgroundColor: colors.muted }]}>
              <X size={18} color={colors.mutedFg} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={() => setEditing(!editing)} style={[styles.editBtn, { backgroundColor: editing ? colors.primary : colors.muted }]}>
              <Text style={{ color: editing ? '#FFFFFF' : colors.mutedFg, fontWeight: '700', fontSize: fontSizes.sm }}>{t('edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={[styles.headerIconBtn, { backgroundColor: '#FEE2E2', marginLeft: 10 }]}>
              <Trash2 size={16} color="#DC2626" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={farmTransactions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ListHeaderComponent={
              <View>
                {/* Hero: Emoji + Name + Animal Count */}
                <Card style={{ marginTop: 12, borderRadius: 20 }} padding={20}>
                  <View style={styles.heroCenter}>
                    <Text style={{ fontSize: fontSizes.xxxl }}>{emoji}</Text>
                    <Text style={[styles.heroName, { color: colors.foreground }]}>{displayName}</Text>
                    <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{t(farm.type)}</Text>

                    {displayCount > 0 ? (
                      <View style={styles.animalBadge}>
                        <Text style={styles.animalBigCount}>{displayCount}</Text>
                        <Text style={styles.animalBigLabel}>{t(ANIMAL_LABEL[farm.type])}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Inline edit (toggled by edit button) */}
                  {editing && (
                    <View style={[styles.editSection, { borderTopColor: colors.border }]}>
                      <Text style={[styles.editSectionTitle, { color: colors.foreground }]}>{t('editFarm')}</Text>
                      <Input
                        label={t('farmName')}
                        value={name}
                        onChangeText={setName}
                        placeholder={t(farm.type)}
                      />
                      <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm, marginTop: 10, marginBottom: 4 }}>
                        {t('howMany')} {t(ANIMAL_LABEL[farm.type])}?
                      </Text>
                      <View style={styles.counterRow}>
                        <TouchableOpacity
                          onPress={() => setCount((c) => Math.max(0, c - 1))}
                          style={[styles.counterBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                        >
                          <Minus size={16} color={colors.foreground} />
                        </TouchableOpacity>
                        <View style={[styles.counterDisplay, { backgroundColor: colors.background, borderColor: colors.border }]}>
                          <Text style={{ color: colors.foreground, fontWeight: '900', fontSize: fontSizes.lg }}>{count}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setCount((c) => c + 1)}
                          style={[styles.counterBtn, { backgroundColor: colors.primary }]}
                        >
                          <Plus size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                      {error ? <Text style={{ color: '#DC2626', fontSize: fontSizes.sm, marginTop: 4 }}>{error}</Text> : null}
                      <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8} style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}>
                        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: fontSizes.base }}>{loading ? '...' : `✓ ${t('save')}`}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Income / Expense summary */}
                  <View style={[styles.summaryRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ color: colors.mutedFg, fontSize: fontSizes.xs }}>{t('income')}</Text>
                      <Text style={{ color: '#16A34A', fontSize: fontSizes.md, fontWeight: '800' }}>{fmt(farmIncome)}</Text>
                    </View>
                    <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ color: colors.mutedFg, fontSize: fontSizes.xs }}>{t('expense')}</Text>
                      <Text style={{ color: '#DC2626', fontSize: fontSizes.md, fontWeight: '800' }}>{fmt(farmExpense)}</Text>
                    </View>
                    <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />
                    <View style={{ alignItems: 'center', flex: 1 }}>
                      <Text style={{ color: colors.mutedFg, fontSize: fontSizes.xs }}>{t('netBalance')}</Text>
                      <Text style={{ color: farmIncome - farmExpense >= 0 ? '#16A34A' : '#DC2626', fontSize: fontSizes.md, fontWeight: '800' }}>
                        {fmt(Math.abs(farmIncome - farmExpense))}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Quick Actions: Money In / Money Out */}
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    onPress={() => setMoneyInVisible(true)}
                    activeOpacity={0.7}
                    style={[styles.quickBtn, { backgroundColor: '#DCFCE7' }]}
                  >
                    <ArrowDownLeft color="#16A34A" size={20} />
                    <Text style={{ color: '#16A34A', fontWeight: '700', fontSize: fontSizes.base, marginLeft: 8 }}>{t('moneyIn')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setMoneyOutVisible(true)}
                    activeOpacity={0.7}
                    style={[styles.quickBtn, { backgroundColor: '#FEE2E2' }]}
                  >
                    <ArrowUpRight color="#DC2626" size={20} />
                    <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: fontSizes.base, marginLeft: 8 }}>{t('moneyOut')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Transactions header */}
                <Text style={[styles.txnHeader, { color: colors.foreground }]}>
                  {t('allTransactions')} ({toNative(farmTransactions.length)})
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: fontSizes.xxxl, marginBottom: 8 }}>📝</Text>
                <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm, fontWeight: '600' }}>{t('noData')}</Text>
              </View>
            }
            renderItem={({ item: txn }) => (
              <Card style={{ marginTop: 8 }} padding={12}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: fontSizes.base }}>
                      {tCategory(txn.category, t)}
                    </Text>
                    <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm, marginTop: 2 }}>
                      {fmtDMY(txn.date)}{txn.partyName ? ` • ${txn.partyName}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: txn.type === 'income' ? '#16A34A' : '#DC2626', fontWeight: '700', fontSize: fontSizes.base }}>
                      {txn.type === 'income' ? '+' : '-'}{fmtCurrency(txn.amount)}
                    </Text>
                    <Badge text={tPaymentMode(txn.paymentMode, t)} />
                  </View>
                </View>
              </Card>
            )}
          />
        </View>
      </Modal>

      <MoneyInModal
        visible={moneyInVisible}
        onClose={handleMoneyInClose}
        farmId={farm.id}
        farmName={farm.name}
        farmType={farm.type}
      />
      <MoneyOutModal
        visible={moneyOutVisible}
        onClose={handleMoneyOutClose}
        farmId={farm.id}
        farmName={farm.name}
        farmType={farm.type}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  editBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  heroCenter: {
    alignItems: 'center',
  },
  heroName: {
    fontSize: fontSizes.xl,
    fontWeight: '900',
    marginTop: 6,
  },
  animalBadge: {
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#7C3AED14',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  animalBigCount: {
    color: '#7C3AED',
    fontSize: fontSizes.xxxl,
    fontWeight: '900',
  },
  animalBigLabel: {
    color: '#7C3AED',
    fontSize: fontSizes.base,
    fontWeight: '700',
    marginTop: 2,
  },
  editSection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  editSectionTitle: {
    fontSize: fontSizes.base,
    fontWeight: '800',
    marginBottom: 10,
  },
  editInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSizes.base,
    fontWeight: '500',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterDisplay: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  txnHeader: {
    fontSize: fontSizes.base,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 6,
  },
});
