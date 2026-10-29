import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  Calendar,
  Percent,
  Sprout,
  Milk,
} from 'lucide-react-native';

const DIRECT_COST_CATEGORIES = [
  'seeds',
  'fertilizers',
  'pesticides',
  'labor',
  'weeding',
  'tractor',
  'irrigation',
  'transport',
  'packing',
  'market_cost',
  'hamali',
  'harvesting_cost',
  'dairy_fodder',
  'dairy_medicines',
  'veterinary_doctor',
  'milk_collection',
  'dairy_labor',
];

type PeriodTab = 'daily' | 'monthly' | 'yearly' | 'fy' | 'plotWise' | 'cropWise' | 'dairy' | 'overall';

export function ProfitLossView() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { transactions } = useLedgerStore();
  const { plots, crops } = usePlotStore();
  const { fmtCurrency, toNative } = useLocalizedFormat();

  const [period, setPeriod] = useState<PeriodTab>('monthly');
  const [selectedPlotId, setSelectedPlotId] = useState<string>('all');
  const [selectedCropId, setSelectedCropId] = useState<string>('all');

  // Dates & Financial Year
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthPrefix = todayStr.substring(0, 7);
  const currentYearPrefix = todayStr.substring(0, 4);

  const currentMonthNum = now.getMonth() + 1;
  const currentYearNum = now.getFullYear();
  const fyStartYear = currentMonthNum >= 4 ? currentYearNum : currentYearNum - 1;
  const fyEndYear = fyStartYear + 1;
  const fyStartDate = `${fyStartYear}-04-01`;
  const fyEndDate = `${fyEndYear}-03-31`;

  const periods: { key: PeriodTab; label: string }[] = [
    { key: 'monthly', label: t('monthlyPeriod') },
    { key: 'daily', label: t('daily') },
    { key: 'yearly', label: t('yearlyPeriod') },
    { key: 'fy', label: `${t('financialYear')} (${toNative(fyStartYear)}-${toNative(String(fyEndYear).slice(-2))})` },
    { key: 'plotWise', label: t('plotWise') },
    { key: 'cropWise', label: t('cropWise') },
    { key: 'dairy', label: t('dairy') },
    { key: 'overall', label: t('overall') },
  ];

  // All unique crops across all plots
  const allCropsList = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    Object.values(crops).forEach((plotCrops) => {
      plotCrops.forEach((c) => {
        if (!list.find((item) => item.id === c.id)) {
          list.push({ id: c.id, name: `${t(c.cropType)} (${c.variety || ''})` });
        }
      });
    });
    return list;
  }, [crops]);

  // Filtered transactions by period
  const filteredTxns = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = tx.date || '';

      switch (period) {
        case 'daily':
          return txDate.startsWith(todayStr);
        case 'monthly':
          return txDate.startsWith(currentMonthPrefix);
        case 'yearly':
          return txDate.startsWith(currentYearPrefix);
        case 'fy':
          return txDate >= fyStartDate && txDate <= fyEndDate;
        case 'plotWise':
          if (selectedPlotId === 'all') return !!tx.plotId;
          return tx.plotId === selectedPlotId;
        case 'cropWise':
          if (selectedCropId === 'all') return !!tx.cropId;
          return tx.cropId === selectedCropId;
        case 'dairy':
          return (
            tx.ledgerType === 'dairy' ||
            tx.incomeCategory === 'dairy' ||
            (tx.category && (tx.category.startsWith('dairy_') || tx.category.includes('दूध')))
          );
        case 'overall':
        default:
          return true;
      }
    });
  }, [
    transactions,
    period,
    todayStr,
    currentMonthPrefix,
    currentYearPrefix,
    fyStartDate,
    fyEndDate,
    selectedPlotId,
    selectedCropId,
  ]);

  // P&L Calculations
  const pnl = useMemo(() => {
    const income = filteredTxns.filter((tx) => tx.type === 'income');
    const expenses = filteredTxns.filter((tx) => tx.type === 'expense');

    const cropSales = income
      .filter((tx) => tx.incomeCategory === 'crop_sale' || tx.cropName || tx.category === 'crop_sale')
      .reduce((s, tx) => s + (tx.amount || 0), 0);

    const dairyIncome = income
      .filter(
        (tx) =>
          tx.incomeCategory === 'dairy' ||
          (tx.category && (tx.category.includes('दूध') || tx.category.toLowerCase().includes('dairy')))
      )
      .reduce((s, tx) => s + (tx.amount || 0), 0);

    const otherIncome = income
      .filter(
        (tx) =>
          tx.incomeCategory === 'other' ||
          (!tx.incomeCategory && tx.category !== 'crop_sale' && !tx.category?.includes('दूध'))
      )
      .reduce((s, tx) => s + (tx.amount || 0), 0);

    const totalRevenue = cropSales + dairyIncome + otherIncome;

    // Direct operating costs breakdown
    const categoryCostMap: Record<string, number> = {};
    let directCosts = 0;
    let indirectCosts = 0;

    expenses.forEach((tx) => {
      const amt = tx.amount || 0;
      const catLower = (tx.category || '').toLowerCase();
      const isDirect = DIRECT_COST_CATEGORIES.some((c) => catLower.includes(c));

      if (isDirect) {
        directCosts += amt;
        const key = tx.category || 'Direct';
        categoryCostMap[key] = (categoryCostMap[key] || 0) + amt;
      } else {
        indirectCosts += amt;
      }
    });

    const grossProfit = totalRevenue - directCosts;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const netProfit = grossProfit - indirectCosts;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const sortedCostBreakdown = Object.entries(categoryCostMap).sort((a, b) => b[1] - a[1]);

    return {
      cropSales,
      dairyIncome,
      otherIncome,
      totalRevenue,
      directCosts,
      grossProfit,
      grossMargin,
      indirectCosts,
      netProfit,
      netMargin,
      costBreakdown: sortedCostBreakdown,
      txCount: filteredTxns.length,
    };
  }, [filteredTxns]);

  const fmt = (v: number) => fmtCurrency(Math.round(v));

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {/* Period Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[
              styles.periodChip,
              {
                backgroundColor: period === p.key ? colors.primary + '15' : colors.card,
                borderColor: period === p.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: period === p.key ? colors.primary : colors.foreground,
                fontWeight: '700',
                fontSize: 12,
              }}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Plot Selector when Plot-wise is active */}
      {period === 'plotWise' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setSelectedPlotId('all')}
            style={[
              styles.subFilterChip,
              {
                backgroundColor: selectedPlotId === 'all' ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={{ color: selectedPlotId === 'all' ? '#FFF' : colors.foreground, fontSize: 13, fontWeight: '700' }}>
              {t('allPlots')}
            </Text>
          </TouchableOpacity>
          {plots.map((pl) => (
            <TouchableOpacity
              key={pl.id}
              onPress={() => setSelectedPlotId(pl.id)}
              style={[
                styles.subFilterChip,
                {
                  backgroundColor: selectedPlotId === pl.id ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={{ color: selectedPlotId === pl.id ? '#FFF' : colors.foreground, fontSize: 13, fontWeight: '700' }}>
                {pl.name} (Gat #{toNative(pl.gatNumber)})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Crop Selector when Crop-wise is active */}
      {period === 'cropWise' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setSelectedCropId('all')}
            style={[
              styles.subFilterChip,
              {
                backgroundColor: selectedCropId === 'all' ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={{ color: selectedCropId === 'all' ? '#FFF' : colors.foreground, fontSize: 13, fontWeight: '700' }}>
              {t('allCrops')}
            </Text>
          </TouchableOpacity>
          {allCropsList.map((cr) => (
            <TouchableOpacity
              key={cr.id}
              onPress={() => setSelectedCropId(cr.id)}
              style={[
                styles.subFilterChip,
                {
                  backgroundColor: selectedCropId === cr.id ? colors.primary : colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={{ color: selectedCropId === cr.id ? '#FFF' : colors.foreground, fontSize: 13, fontWeight: '700' }}>
                {cr.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Primary KPI Hero Card: Net Farm Profit & Margin */}
      <View
        style={{
          borderRadius: 24,
          backgroundColor: colors.card,
          marginBottom: 12,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.mutedFg, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' }}>
            {t('netFarmProfit')}
          </Text>
          <Badge
            text={`${pnl.netMargin >= 0 ? '+' : ''}${toNative(pnl.netMargin.toFixed(1))}% ${t('margin')}`}
            variant={pnl.netProfit >= 0 ? 'success' : 'destructive'}
          />
        </View>

        <Text
          style={{
            color: pnl.netProfit >= 0 ? '#16A34A' : '#DC2626',
            fontSize: 28,
            fontWeight: '900',
            marginTop: 6,
          }}
        >
          {pnl.netProfit < 0 ? '-' : ''}{fmt(Math.abs(pnl.netProfit))}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
          <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
            {t('revenue')}: <Text style={{ color: '#16A34A', fontWeight: '700' }}>{fmt(pnl.totalRevenue)}</Text>
          </Text>
          <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
            {t('expenses')}: <Text style={{ color: '#DC2626', fontWeight: '700' }}>{fmt(pnl.directCosts + pnl.indirectCosts)}</Text>
          </Text>
        </View>
      </View>

      {/* A. Revenue Card */}
      <Card style={{ marginBottom: 10 }} padding={14}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={[styles.sectionHeading, { color: colors.primary }]}>
            A. {t('totalFarmRevenue')}
          </Text>
          <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '800' }}>
            {fmt(pnl.totalRevenue)}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
            {t('cropSales')}
          </Text>
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>
            {fmt(pnl.cropSales)}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
            {t('dairyIncome')}
          </Text>
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>
            {fmt(pnl.dairyIncome)}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
            {t('otherSubsidies')}
          </Text>
          <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>
            {fmt(pnl.otherIncome)}
          </Text>
        </View>
      </Card>

      {/* B. Direct Operating Costs */}
      <Card style={{ marginBottom: 10 }} padding={14}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={[styles.sectionHeading, { color: colors.destructive }]}>
            B. {t('directCosts')}
          </Text>
          <Text style={{ color: colors.destructive, fontSize: 15, fontWeight: '800' }}>
            {fmt(pnl.directCosts)}
          </Text>
        </View>

        {pnl.costBreakdown.length > 0 ? (
          pnl.costBreakdown.slice(0, 8).map(([cat, amt]) => (
            <View key={cat} style={styles.dataRow}>
              <Text style={{ color: colors.mutedFg, fontSize: 13 }}>{t(cat)}</Text>
              <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 13 }}>
                {fmt(amt)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={{ color: colors.mutedFg, fontSize: 12, fontStyle: 'italic', paddingVertical: 4 }}>
            {t('noDirectExpenseEntries')}
          </Text>
        )}
      </Card>

      {/* C. Gross Margin Card */}
      <View
        style={{
          marginBottom: 10,
          borderRadius: 24,
          backgroundColor: colors.card,
          padding: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: '#2563EB', fontSize: 13, fontWeight: '700' }}>
              C. {t('grossProfit')}
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>
              {t('revenueLessDirectCosts')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                color: pnl.grossProfit >= 0 ? '#16A34A' : '#DC2626',
                fontSize: 16,
                fontWeight: '800',
              }}
            >
              {fmt(pnl.grossProfit)}
            </Text>
            <Text style={{ color: '#2563EB', fontSize: 13, fontWeight: '700' }}>
              {toNative(pnl.grossMargin.toFixed(1))}% {t('margin')}
            </Text>
          </View>
        </View>
      </View>

      {/* D. Indirect Costs */}
      <Card style={{ marginBottom: 10 }} padding={14}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[styles.sectionHeading, { color: colors.warning }]}>
              D. {t('indirectCosts')}
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>
              {t('indirectCostsDesc')}
            </Text>
          </View>
          <Text style={{ color: colors.warning, fontSize: 15, fontWeight: '800' }}>
            {fmt(pnl.indirectCosts)}
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  periodChip: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, borderRadius: 10 },
  subFilterChip: { borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, borderRadius: 8 },
  sectionHeading: { fontSize: 13, fontWeight: '700' },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
});
