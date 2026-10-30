import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { useNotebookFarmStore, FarmType } from '../../../shared/hooks/useNotebookFarmStore';
import { AddFarmModal } from './AddFarmModal';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { tCategory, tPaymentMode } from '../../../shared/utils/helpers';
import { ArrowDownLeft, ArrowUpRight, ScanLine, BookOpen, Plus } from 'lucide-react-native';
import type { Transaction } from '../../../shared/types/ledger';

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

function isDairyTransaction(tx: Transaction): boolean {
  return (
    tx.ledgerType === 'dairy' ||
    tx.incomeCategory === 'dairy' ||
    !!(tx.category && (tx.category.startsWith('dairy_') || tx.category.includes('dairy') || tx.category.includes('Dairy')))
  );
}

interface NotebookLedgerViewProps {
  onMoneyIn: () => void;
  onMoneyOut: () => void;
  onScanBill: () => void;
  onCustomLedgers: () => void;
}

export function NotebookLedgerView({ onMoneyIn, onMoneyOut, onScanBill, onCustomLedgers }: NotebookLedgerViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { transactions } = useLedgerStore();
  const { plots, fetchPlots } = usePlotStore();
  const { farms, fetchFarms, deleteFarm } = useNotebookFarmStore();
  const { fmtCurrency, toNative, fmtDMY } = useLocalizedFormat();

  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [addFarmVisible, setAddFarmVisible] = useState(false);

  useEffect(() => { fetchPlots(); fetchFarms(); }, []);

  const handleDeleteFarm = (farmId: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('deleteFarmConfirm'))) {
        deleteFarm(farmId);
      }
    } else {
      Alert.alert(t('deleteFarm'), t('deleteFarmConfirm'), [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteFarm(farmId) },
      ]);
    }
  };

  const summaries = useMemo(() => {
    let allIncome = 0;
    let allExpense = 0;
    const plotMap: Record<string, { income: number; expense: number }> = {};
    let dairyIncome = 0;
    let dairyExpense = 0;
    let hasDairy = false;

    for (const plot of plots) {
      plotMap[plot.id] = { income: 0, expense: 0 };
    }

    for (const tx of transactions) {
      const amt = tx.amount || 0;
      if (tx.type === 'income') allIncome += amt;
      else allExpense += amt;

      if (tx.plotId && plotMap[tx.plotId]) {
        if (tx.type === 'income') plotMap[tx.plotId].income += amt;
        else plotMap[tx.plotId].expense += amt;
      }

      if (isDairyTransaction(tx)) {
        hasDairy = true;
        if (tx.type === 'income') dairyIncome += amt;
        else dairyExpense += amt;
      }
    }

    const plotStats = plots.map((p) => ({
      id: p.id,
      name: p.name,
      gatNumber: p.gatNumber,
      income: plotMap[p.id]?.income || 0,
      expense: plotMap[p.id]?.expense || 0,
    }));

    const farmStats = farms.map((f) => {
      const farmTxns = transactions.filter((tx) => tx.farmId === f.id);
      const income = farmTxns.filter((tx) => tx.type === 'income').reduce((s, tx) => s + (tx.amount || 0), 0);
      const expense = farmTxns.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + (tx.amount || 0), 0);
      return { id: f.id, name: f.name, type: f.type, animalCount: f.animalCount, income, expense };
    });

    return { allIncome, allExpense, plotStats, farmStats, dairyIncome, dairyExpense, hasDairy };
  }, [transactions, plots, farms]);

  const filteredTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (!selectedFilter || selectedFilter === 'overall') return sorted;
    if (selectedFilter === 'dairy') return sorted.filter(isDairyTransaction);
    if (selectedFilter.startsWith('plot_')) {
      const plotId = selectedFilter.replace('plot_', '');
      return sorted.filter((tx) => tx.plotId === plotId);
    }
    if (selectedFilter.startsWith('farm_')) {
      const farmId = selectedFilter.replace('farm_', '');
      return sorted.filter((tx) => tx.farmId === farmId);
    }
    return sorted;
  }, [transactions, selectedFilter]);

  const fmt = (v: number) => fmtCurrency(Math.round(v));

  const toggleFilter = (key: string) => {
    setSelectedFilter((prev) => (prev === key ? null : key));
  };

  return (
    <>
    <FlatList
      data={filteredTransactions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      ListHeaderComponent={
        <View style={{ paddingTop: 8 }}>
          {/* Hero Summary */}
          <Card style={{ borderRadius: 20 }} padding={16}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: '800' }}>
                {t('notebook')}
              </Text>
              <TouchableOpacity
                onPress={() => setAddFarmVisible(true)}
                activeOpacity={0.7}
                style={[styles.addBtn, { backgroundColor: colors.primary }]}
              >
                <Plus size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: colors.mutedFg, fontSize: 11 }}>{t('overallIncome')}</Text>
                <Text style={{ color: '#16A34A', fontSize: 18, fontWeight: '800' }}>{fmt(summaries.allIncome)}</Text>
              </View>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: colors.mutedFg, fontSize: 11 }}>{t('overallExpense')}</Text>
                <Text style={{ color: '#DC2626', fontSize: 18, fontWeight: '800' }}>{fmt(summaries.allExpense)}</Text>
              </View>
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ color: colors.mutedFg, fontSize: 11 }}>{t('netBalance')}</Text>
                <Text style={{
                  color: summaries.allIncome - summaries.allExpense >= 0 ? '#16A34A' : '#DC2626',
                  fontSize: 18,
                  fontWeight: '800',
                }}>
                  {fmt(Math.abs(summaries.allIncome - summaries.allExpense))}
                </Text>
              </View>
            </View>
          </Card>

          {/* Quick Actions */}
          <View style={styles.actionGrid}>
            <TouchableOpacity onPress={onMoneyIn} style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}><ArrowDownLeft color="#16A34A" size={20} /></View>
              <Text style={[styles.actionLabel, { color: colors.foreground }]} numberOfLines={2}>{t('moneyIn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onMoneyOut} style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}><ArrowUpRight color="#DC2626" size={20} /></View>
              <Text style={[styles.actionLabel, { color: colors.foreground }]} numberOfLines={2}>{t('moneyOut')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onScanBill} style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}><ScanLine color="#2563EB" size={20} /></View>
              <Text style={[styles.actionLabel, { color: colors.foreground }]} numberOfLines={2}>{t('scanBill')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onCustomLedgers} style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}><BookOpen color="#D97706" size={20} /></View>
              <Text style={[styles.actionLabel, { color: colors.foreground }]} numberOfLines={2}>{t('customLedgers')}</Text>
            </TouchableOpacity>
          </View>

          {/* My Farms — emoji KPI cards */}
          {summaries.farmStats.length > 0 && (
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>{t('myFarms')}</Text>
          )}
          <View style={styles.kpiGrid}>
            {summaries.farmStats.map((fs) => {
              const isActive = selectedFilter === `farm_${fs.id}`;
              return (
                <TouchableOpacity
                  key={fs.id}
                  onPress={() => toggleFilter(`farm_${fs.id}`)}
                  onLongPress={() => handleDeleteFarm(fs.id)}
                  activeOpacity={0.7}
                  style={[
                    styles.kpiCard,
                    { backgroundColor: colors.card, borderColor: isActive ? '#7C3AED' : colors.border },
                    isActive && { backgroundColor: '#F5F3FF', borderColor: '#7C3AED' },
                  ]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.kpiEmoji}>{FARM_EMOJI[fs.type] || '🌾'}</Text>
                    {fs.animalCount ? (
                      <View style={[styles.countBadge, { backgroundColor: '#7C3AED' + '18' }]}>
                        <Text style={{ color: '#7C3AED', fontSize: 12, fontWeight: '800' }}>{fs.animalCount}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.kpiName, { color: colors.foreground }]} numberOfLines={1}>
                    {fs.name}
                  </Text>
                  <View style={styles.kpiAmounts}>
                    <Text style={styles.kpiIncome}>+{fmt(fs.income)}</Text>
                    <Text style={styles.kpiExpense}>-{fmt(fs.expense)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* My Plots */}
          {summaries.plotStats.length > 0 && (
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>{t('plots')}</Text>
          )}
          <View style={styles.kpiGrid}>
            {summaries.plotStats.map((ps) => {
              const isActive = selectedFilter === `plot_${ps.id}`;
              return (
                <TouchableOpacity
                  key={ps.id}
                  onPress={() => toggleFilter(`plot_${ps.id}`)}
                  activeOpacity={0.7}
                  style={[
                    styles.kpiCard,
                    { backgroundColor: colors.card, borderColor: isActive ? colors.primary : colors.border },
                    isActive && { backgroundColor: '#F0FDF4', borderColor: colors.primary },
                  ]}
                >
                  <Text style={styles.kpiEmoji}>🌱</Text>
                  <Text style={[styles.kpiName, { color: colors.foreground }]} numberOfLines={1}>
                    {ps.name}
                  </Text>
                  <Text style={{ color: colors.mutedFg, fontSize: 11 }}>{ps.gatNumber}</Text>
                  <View style={styles.kpiAmounts}>
                    <Text style={styles.kpiIncome}>+{fmt(ps.income)}</Text>
                    <Text style={styles.kpiExpense}>-{fmt(ps.expense)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {summaries.hasDairy && (
              <TouchableOpacity
                onPress={() => toggleFilter('dairy')}
                activeOpacity={0.7}
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.card, borderColor: selectedFilter === 'dairy' ? '#D97706' : colors.border },
                  selectedFilter === 'dairy' && { backgroundColor: '#FFFBEB', borderColor: '#D97706' },
                ]}
              >
                <Text style={styles.kpiEmoji}>🥛</Text>
                <Text style={[styles.kpiName, { color: colors.foreground }]}>
                  {t('dairyFarming')}
                </Text>
                <View style={styles.kpiAmounts}>
                  <Text style={styles.kpiIncome}>+{fmt(summaries.dairyIncome)}</Text>
                  <Text style={styles.kpiExpense}>-{fmt(summaries.dairyExpense)}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* All / Overall card */}
            <TouchableOpacity
              onPress={() => toggleFilter('overall')}
              activeOpacity={0.7}
              style={[
                styles.kpiCard,
                { backgroundColor: colors.card, borderColor: selectedFilter === 'overall' ? '#2563EB' : colors.border },
                selectedFilter === 'overall' && { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
              ]}
            >
              <Text style={styles.kpiEmoji}>📊</Text>
              <Text style={[styles.kpiName, { color: colors.foreground }]}>
                {t('all')}
              </Text>
              <View style={styles.kpiAmounts}>
                <Text style={styles.kpiIncome}>+{fmt(summaries.allIncome)}</Text>
                <Text style={styles.kpiExpense}>-{fmt(summaries.allExpense)}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Transaction list header */}
          <Text style={[styles.sectionLabel, { color: colors.foreground, marginBottom: 6 }]}>
            {t('allTransactions')} ({toNative(filteredTransactions.length)})
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ color: colors.mutedFg, fontSize: 13, fontWeight: '600' }}>{t('noData')}</Text>
        </View>
      }
      renderItem={({ item: txn }) => (
        <Card style={{ marginTop: 8 }} padding={12}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 14 }}>{tCategory(txn.category, t)}</Text>
                {txn.isAutoGenerated && <Badge text={t('autoGenerated')} variant="warning" />}
              </View>
              <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>
                {fmtDMY(txn.date)} {txn.partyName ? `• ${txn.partyName}` : ''}{txn.plotName ? ` • ${txn.plotName}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: txn.type === 'income' ? colors.primary : colors.destructive, fontWeight: '700', fontSize: 15 }}>
                {txn.type === 'income' ? '+' : '-'}{fmtCurrency(txn.amount)}
              </Text>
              <Badge text={tPaymentMode(txn.paymentMode, t)} />
            </View>
          </View>
        </Card>
      )}
    />
    <AddFarmModal visible={addFarmVisible} onClose={() => { setAddFarmVisible(false); fetchFarms(); }} />
    </>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  kpiEmoji: {
    fontSize: 26,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  kpiName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  kpiAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  kpiIncome: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '700',
  },
  kpiExpense: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
});
