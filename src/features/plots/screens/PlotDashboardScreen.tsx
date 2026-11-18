import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { ScreenLayout } from '../../../components/layout/ScreenLayout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { AddCropModal } from '../../crops/components/AddCropModal';
import { MoneyInModal } from '../../ledger/components/MoneyInModal';
import { MoneyOutModal } from '../../ledger/components/MoneyOutModal';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Trash2, Wallet, TrendingUp } from 'lucide-react-native';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { tCategory, tPaymentMode } from '../../../shared/utils/helpers';
import { fontSizes } from '../../../shared/utils/typography';

type LedgerTab = 'income' | 'pnl';

const DIRECT_COST_CATEGORIES = [
  'seeds', 'fertilizers', 'pesticides', 'labor', 'weeding', 'tractor',
  'irrigation', 'transport', 'packing', 'market_cost', 'hamali',
  'harvesting_cost', 'dairy_fodder', 'dairy_medicines', 'veterinary_doctor',
  'milk_collection', 'dairy_labor',
];

export function PlotDashboardScreen({ route, navigation }: any) {
  const { plotId, cropId } = route.params || {};
  const { t } = useTranslation();
  const { colors } = useTheme();

  const { plots, crops, fetchCrops, getPlotRemainingArea, deletePlot } = usePlotStore();
  const { transactions, fetchTransactions } = useLedgerStore();
  const { fmtCurrency, fmtDMY, toNative } = useLocalizedFormat();

  const [selectedCropId, setSelectedCropId] = useState<string>(cropId || 'all');
  const [prevCropId, setPrevCropId] = useState(cropId);
  if (cropId !== prevCropId) {
    setPrevCropId(cropId);
    setSelectedCropId(cropId || 'all');
  }
  const [addCropVisible, setAddCropVisible] = useState(false);
  const [moneyInOpen, setMoneyInOpen] = useState(false);
  const [moneyOutOpen, setMoneyOutOpen] = useState(false);
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>('income');

  const plot = plots.find((p) => p.id === plotId);
  const plotCrops = useMemo(() => crops[plotId] || [], [crops, plotId]);
  const remaining = getPlotRemainingArea(plotId);
  const usedArea = plot ? plot.area - remaining : 0;
  const occupancyPercent = plot && plot.area > 0 ? (usedArea / plot.area) * 100 : 0;

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      fetchCrops(plotId);
      fetchTransactions();
    });
    return () => cancelAnimationFrame(id);
  }, [plotId, fetchCrops, fetchTransactions]);

  const selectedCrop = selectedCropId !== 'all'
    ? plotCrops.find((c) => c.id === selectedCropId) || null
    : null;

  // Filtered transactions for the selected crop or all plot crops
  const displayedTxns = useMemo(() => {
    const pName = plot?.name;
    const pTxns = transactions.filter(
      (tx) => tx.plotId === plotId || (pName && tx.plotName === pName)
    );
    if (selectedCropId === 'all') {
      return pTxns;
    }
    const crop = plotCrops.find((c) => c.id === selectedCropId);
    if (!crop) return [];
    return pTxns.filter((tx) =>
      tx.cropId === crop.id ||
      (tx.cropName && tx.cropName.toLowerCase() === crop.cropType.toLowerCase()) ||
      (tx.category && tx.category.toLowerCase() === crop.cropType.toLowerCase())
    );
  }, [transactions, plotId, plot, selectedCropId, plotCrops]);

  // Financials for the active selection
  const financials = useMemo(() => {
    const income = displayedTxns
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const expenses = displayedTxns
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const profit = income - expenses;
    const margin = income > 0 ? (profit / income) * 100 : 0;
    return { income, expenses, profit, margin };
  }, [displayedTxns]);

  const incomeTxns = useMemo(() => {
    return displayedTxns.filter((tx) => tx.type === 'income');
  }, [displayedTxns]);

  const expenseTxns = useMemo(() => {
    return displayedTxns.filter((tx) => tx.type === 'expense');
  }, [displayedTxns]);

  const pnl = useMemo(() => {
    const cropSales = incomeTxns
      .filter((tx) => tx.incomeCategory === 'crop_sale' || tx.cropName || tx.category === 'crop_sale')
      .reduce((s, tx) => s + (tx.amount || 0), 0);
    const dairyIncome = incomeTxns
      .filter((tx) => tx.incomeCategory === 'dairy' || (tx.category && tx.category.toLowerCase().includes('dairy')))
      .reduce((s, tx) => s + (tx.amount || 0), 0);
    const otherIncome = incomeTxns
      .filter((tx) => tx.incomeCategory === 'other' || (!tx.incomeCategory && tx.category !== 'crop_sale' && !tx.category?.toLowerCase().includes('dairy')))
      .reduce((s, tx) => s + (tx.amount || 0), 0);
    const totalRevenue = cropSales + dairyIncome + otherIncome;

    const categoryCostMap: Record<string, number> = {};
    let directCosts = 0;
    let indirectCosts = 0;
    expenseTxns.forEach((tx) => {
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
    const costBreakdown = Object.entries(categoryCostMap).sort((a, b) => b[1] - a[1]);

    return { cropSales, dairyIncome, otherIncome, totalRevenue, directCosts, grossProfit, grossMargin, indirectCosts, netProfit, netMargin, costBreakdown };
  }, [incomeTxns, expenseTxns]);

  if (!plot) return null;

  const handleDeletePlot = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('deletePlotConfirm'))) {
        await deletePlot(plotId);
        navigation.goBack();
      }
    } else {
      Alert.alert(
        t('deletePlot'),
        t('deletePlotConfirm'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('delete'),
            style: 'destructive',
            onPress: async () => {
              await deletePlot(plotId);
              navigation.goBack();
            },
          },
        ],
      );
    }
  };

  return (
    <ScreenLayout>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Back button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.8}
          >
            <ArrowLeft color={colors.foreground} size={16} />
            <Text style={[styles.backBtnText, { color: colors.foreground }]}>{t('back')}</Text>
          </TouchableOpacity>
        </View>

        {/* Plot Info */}
        <View style={styles.plotInfoSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={[styles.title, { color: colors.foreground }]}>{plot.name}</Text>
            <View style={[styles.gatBadge, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
              <Text style={[styles.gatText, { color: colors.primary }]}>{t('gatNumber')} #{toNative(plot.gatNumber)}</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedFg }]}>
            {toNative(plot.area)} {t(plot.areaUnit || 'acre')} • {t(plot.soilType)} {t('soil')}
          </Text>
        </View>

        {/* Plot / Crop Financial KPI Card */}
        <Card style={styles.financialCard} padding={16}>
          <View style={styles.financialHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.financialCardTitle, { color: colors.foreground }]} numberOfLines={1}>
                {selectedCrop ? `${t(selectedCrop.cropType)} ${t('ledger')}` : `${plot.name} ${t('ledger')}`}
              </Text>
              <Text style={{ fontSize: fontSizes.sm, color: colors.mutedFg, marginTop: 2 }}>
                {selectedCrop ? `${t('crop')} ${t('profitLoss')}` : `${t('plot')} ${t('profitLoss')}`}
              </Text>
            </View>
            <View
              style={[
                styles.profitBadge,
                {
                  backgroundColor: financials.profit >= 0 ? '#DCFCE7' : '#FEE2E2',
                  borderColor: financials.profit >= 0 ? '#16A34A' : '#DC2626',
                },
              ]}
            >
              <Text
                style={{
                  fontSize: fontSizes.xs,
                  fontWeight: '700',
                  color: financials.profit >= 0 ? '#16A34A' : '#DC2626',
                }}
              >
                {financials.profit >= 0 ? `+ ${fmtCurrency(financials.profit)} ${t('profit')}` : `- ${fmtCurrency(Math.abs(financials.profit))} ${t('loss')}`}
              </Text>
            </View>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.kpiCol}>
              <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('income')}</Text>
              <Text style={[styles.kpiValue, { color: '#16A34A' }]} numberOfLines={1}>
                +{fmtCurrency(financials.income)}
              </Text>
            </View>
            <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
            <View style={styles.kpiCol}>
              <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('expense')}</Text>
              <Text style={[styles.kpiValue, { color: colors.destructive }]} numberOfLines={1}>
                -{fmtCurrency(financials.expenses)}
              </Text>
            </View>
            <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
            <View style={styles.kpiCol}>
              <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('netProfit')}</Text>
              <Text
                style={[
                  styles.kpiValue,
                  { color: financials.profit >= 0 ? '#16A34A' : colors.destructive },
                ]}
                numberOfLines={1}
              >
                {financials.profit >= 0 ? '+' : ''}{fmtCurrency(financials.profit)}
              </Text>
            </View>
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              onPress={() => setMoneyInOpen(true)}
              style={[styles.actionBtn, { backgroundColor: '#16A34A' }]}
              activeOpacity={0.8}
            >
              <ArrowDownLeft size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>+ {t('moneyIn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMoneyOutOpen(true)}
              style={[styles.actionBtn, { backgroundColor: colors.destructive }]}
              activeOpacity={0.8}
            >
              <ArrowUpRight size={16} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>- {t('moneyOut')}</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Crop Selection Bar */}
        <View style={styles.cropSelectorHeader}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            {t('crops')} ({toNative(plotCrops.length)})
          </Text>
          <TouchableOpacity
            onPress={() => setAddCropVisible(true)}
            disabled={remaining <= 0}
            activeOpacity={0.7}
            style={[
              styles.addCropChipBtn,
              {
                backgroundColor: remaining > 0 ? colors.primary : colors.muted,
                borderColor: remaining > 0 ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={{ fontSize: fontSizes.sm, fontWeight: '700', color: remaining > 0 ? '#FFFFFF' : colors.mutedFg }}>
              + {t('addCrop')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cropChipsScroll}
        >
          {/* All Crops Pill */}
          <TouchableOpacity
            onPress={() => setSelectedCropId('all')}
            activeOpacity={0.7}
            style={[
              styles.cropChip,
              {
                backgroundColor: selectedCropId === 'all' ? colors.primary : colors.card,
                borderColor: selectedCropId === 'all' ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.cropChipText,
                { color: selectedCropId === 'all' ? '#FFFFFF' : colors.foreground },
              ]}
            >
              🌱 {t('allCrops')} ({toNative(plotCrops.length)})
            </Text>
          </TouchableOpacity>

          {/* Each Individual Crop in this Plot */}
          {plotCrops.map((c) => {
            const isSelected = selectedCropId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedCropId(c.id)}
                activeOpacity={0.7}
                style={[
                  styles.cropChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.cropChipText,
                    { color: isSelected ? '#FFFFFF' : colors.foreground },
                  ]}
                >
                  🌾 {t(c.cropType) || c.cropType} {c.variety ? `(${c.variety})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Crop Lifecycle Card */}
        {selectedCrop && (
          <Card style={styles.selectedCropCard} padding={12}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: fontSizes.base, fontWeight: '700', color: colors.foreground }}>
                    {t(selectedCrop.cropType)} {selectedCrop.variety ? `— ${selectedCrop.variety}` : ''}
                  </Text>
                  <Badge
                    text={t(selectedCrop.status) || selectedCrop.status}
                    variant={
                      selectedCrop.status === 'harvested' || selectedCrop.status === 'completed'
                        ? 'success'
                        : selectedCrop.status === 'flowering'
                        ? 'warning'
                        : 'info'
                    }
                  />
                </View>
                <Text style={{ fontSize: fontSizes.sm, color: colors.mutedFg, marginTop: 4 }}>
                  {toNative(selectedCrop.area)} {t(selectedCrop.areaUnit || 'acre')} • {t(selectedCrop.season.toLowerCase()) || selectedCrop.season} • {fmtDMY(selectedCrop.sowingDate)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('CropDashboard', { plotId, cropId: selectedCrop.id })}
                style={[styles.manageCropBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: fontSizes.sm, fontWeight: '700', color: colors.primary }}>{t('details')} ›</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Mini-Ledger Tabs */}
        <View style={styles.ledgerTabBar}>
          {([
            { key: 'income' as LedgerTab, label: t('incomeRegister'), Icon: Wallet },
            { key: 'pnl' as LedgerTab, label: t('profitLoss'), Icon: TrendingUp },
          ]).map((tab) => {
            const isActive = ledgerTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setLedgerTab(tab.key)}
                activeOpacity={0.7}
                style={[
                  styles.ledgerTabPill,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <tab.Icon size={14} color={isActive ? '#FFFFFF' : colors.mutedFg} />
                <Text style={{ fontSize: fontSizes.sm, fontWeight: '700', color: isActive ? '#FFFFFF' : colors.mutedFg, marginLeft: 4 }} numberOfLines={1}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Income Tab — Income Transactions Only */}
        {ledgerTab === 'income' && (
          <View>
            <View style={styles.txHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
                {t('incomeRegister')} ({toNative(incomeTxns.length)})
              </Text>
            </View>

            {incomeTxns.length === 0 ? (
              <Card style={{ padding: 24, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: colors.mutedFg, textAlign: 'center', fontSize: fontSizes.sm, fontWeight: '500' }}>
                  {t('noData')}
                </Text>
              </Card>
            ) : (
              incomeTxns.map((txn, index) => (
                <Card key={txn.id || index} style={{ marginBottom: 8 }} padding={12}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.base }}>
                          {tCategory(txn.category, t)}
                        </Text>
                        {txn.incomeCategory && (
                          <Badge text={t(txn.incomeCategory)} variant="success" />
                        )}
                      </View>
                      <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm, marginTop: 3 }}>
                        {fmtDMY(txn.date)} {txn.partyName ? `• ${txn.partyName}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#16A34A', fontWeight: '800', fontSize: fontSizes.base }}>
                        +{fmtCurrency(txn.amount)}
                      </Text>
                      <Badge text={tPaymentMode(txn.paymentMode, t)} />
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* P&L Tab — Profit & Loss Breakdown */}
        {ledgerTab === 'pnl' && (
          <View>
            {/* Net Profit Hero */}
            <View style={[styles.pnlHeroCard, { backgroundColor: colors.card }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm, fontWeight: '700', textTransform: 'uppercase' }}>
                  {t('netProfit')}
                </Text>
                <Badge
                  text={`${pnl.netMargin >= 0 ? '+' : ''}${toNative(pnl.netMargin.toFixed(1))}% ${t('margin')}`}
                  variant={pnl.netProfit >= 0 ? 'success' : 'destructive'}
                />
              </View>
              <Text style={{ color: pnl.netProfit >= 0 ? '#16A34A' : '#DC2626', fontSize: fontSizes.xxl, fontWeight: '900', marginTop: 6 }}>
                {pnl.netProfit < 0 ? '-' : ''}{fmtCurrency(Math.abs(pnl.netProfit))}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
                <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>
                  {t('revenue')}: <Text style={{ color: '#16A34A', fontWeight: '700' }}>{fmtCurrency(pnl.totalRevenue)}</Text>
                </Text>
                <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>
                  {t('expenses')}: <Text style={{ color: '#DC2626', fontWeight: '700' }}>{fmtCurrency(pnl.directCosts + pnl.indirectCosts)}</Text>
                </Text>
              </View>
            </View>

            {/* Revenue Breakdown */}
            <Card style={{ marginBottom: 10 }} padding={14}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: colors.primary, fontSize: fontSizes.sm, fontWeight: '700' }}>A. {t('totalFarmRevenue')}</Text>
                <Text style={{ color: colors.primary, fontSize: fontSizes.base, fontWeight: '800' }}>{fmtCurrency(pnl.totalRevenue)}</Text>
              </View>
              <View style={styles.pnlDataRow}>
                <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{t('cropSales')}</Text>
                <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.sm }}>{fmtCurrency(pnl.cropSales)}</Text>
              </View>
              <View style={styles.pnlDataRow}>
                <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{t('dairyIncome')}</Text>
                <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.sm }}>{fmtCurrency(pnl.dairyIncome)}</Text>
              </View>
              <View style={styles.pnlDataRow}>
                <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{t('otherSubsidies')}</Text>
                <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.sm }}>{fmtCurrency(pnl.otherIncome)}</Text>
              </View>
            </Card>

            {/* Direct Costs */}
            <Card style={{ marginBottom: 10 }} padding={14}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ color: colors.destructive, fontSize: fontSizes.sm, fontWeight: '700' }}>B. {t('directCosts')}</Text>
                <Text style={{ color: colors.destructive, fontSize: fontSizes.base, fontWeight: '800' }}>{fmtCurrency(pnl.directCosts)}</Text>
              </View>
              {pnl.costBreakdown.length > 0 ? (
                pnl.costBreakdown.slice(0, 8).map(([cat, amt]) => (
                  <View key={cat} style={styles.pnlDataRow}>
                    <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{t(cat)}</Text>
                    <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: fontSizes.sm }}>{fmtCurrency(amt)}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm, fontStyle: 'italic', paddingVertical: 4 }}>
                  {t('noData')}
                </Text>
              )}
            </Card>

            {/* Gross Profit */}
            <View style={[styles.pnlHeroCard, { backgroundColor: colors.card, marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: '#2563EB', fontSize: fontSizes.sm, fontWeight: '700' }}>C. {t('grossProfit')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: pnl.grossProfit >= 0 ? '#16A34A' : '#DC2626', fontSize: fontSizes.md, fontWeight: '800' }}>
                    {fmtCurrency(pnl.grossProfit)}
                  </Text>
                  <Text style={{ color: '#2563EB', fontSize: fontSizes.sm, fontWeight: '700' }}>
                    {toNative(pnl.grossMargin.toFixed(1))}% {t('margin')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Indirect Costs */}
            <Card style={{ marginBottom: 10 }} padding={14}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#D97706', fontSize: fontSizes.sm, fontWeight: '700' }}>D. {t('indirectCosts')}</Text>
                <Text style={{ color: '#D97706', fontSize: fontSizes.base, fontWeight: '800' }}>{fmtCurrency(pnl.indirectCosts)}</Text>
              </View>
            </Card>
          </View>
        )}

        {/* Plot Specifications & Area Occupancy */}
        <Card style={{ marginTop: 16 }} padding={14}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t('areaOccupancy')}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(occupancyPercent, 100)}%`,
                  backgroundColor: occupancyPercent > 100 ? colors.destructive : colors.primary,
                },
              ]}
            />
          </View>
          <View style={styles.areaStats}>
            <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>
              {t('usedArea')}: <Text style={{ fontWeight: '700', color: colors.foreground }}>{toNative(usedArea.toFixed(2))}</Text>
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>
              {t('remainingArea')}: <Text style={{ fontWeight: '700', color: colors.primary }}>{toNative(remaining.toFixed(2))}</Text>
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{t('gatNumber')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.sm }}>{toNative(plot.gatNumber)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{t('area')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.sm }}>
              {toNative(plot.area)} {t(plot.areaUnit || 'acre')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{t('soilType')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.sm }}>
              {t(plot.soilType) || plot.soilType}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{t('irrigationType')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.sm }}>{t(plot.irrigationType) || plot.irrigationType}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={{ color: colors.mutedFg, fontSize: fontSizes.sm }}>{t('waterAvailability')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: fontSizes.sm }}>
              {t(plot.waterAvailability) || plot.waterAvailability}
            </Text>
          </View>
        </Card>

        {/* Delete Plot Button */}
        <Button
          title={t('deletePlot')}
          onPress={handleDeletePlot}
          variant="destructive"
          fullWidth
          icon={<Trash2 size={16} color="#FFFFFF" />}
          style={{ marginTop: 20 }}
        />
      </ScrollView>

      {moneyInOpen && (
        <MoneyInModal
          visible
          onClose={() => {
            setMoneyInOpen(false);
            fetchTransactions();
          }}
          plotId={plotId}
          cropId={selectedCropId !== 'all' ? selectedCropId : undefined}
        />
      )}

      {moneyOutOpen && (
        <MoneyOutModal
          visible
          onClose={() => {
            setMoneyOutOpen(false);
            fetchTransactions();
          }}
          plotId={plotId}
          cropId={selectedCropId !== 'all' ? selectedCropId : undefined}
        />
      )}

      {addCropVisible && (
        <AddCropModal
          visible
          plotId={plotId}
          onClose={() => {
            setAddCropVisible(false);
            fetchCrops(plotId);
          }}
        />
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  plotInfoSection: { marginBottom: 12, paddingHorizontal: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  backBtnText: { fontSize: fontSizes.base, fontWeight: '600' },
  title: { fontSize: fontSizes.lg, fontWeight: '700' },
  subtitle: { fontSize: fontSizes.sm, marginTop: 2 },
  gatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  gatText: { fontSize: fontSizes.sm, fontWeight: '700' },

  financialCard: { marginTop: 4, borderRadius: 18 },
  financialHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  financialCardTitle: { fontSize: fontSizes.md, fontWeight: '800' },
  profitBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },

  kpiCard: { flexDirection: 'row', marginTop: 14, borderRadius: 12, borderWidth: 1, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  kpiCol: { flex: 1, alignItems: 'center' },
  kpiDivider: { width: 1, alignSelf: 'stretch', marginVertical: 2 },
  kpiLabel: { fontSize: fontSizes.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiValue: { fontSize: fontSizes.md, fontWeight: '800', marginTop: 4 },

  actionBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: '#FFFFFF', fontSize: fontSizes.sm, fontWeight: '700' },

  cropSelectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  sectionLabel: { fontSize: fontSizes.base, fontWeight: '800' },
  addCropChipBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  cropChipsScroll: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
  cropChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  cropChipText: { fontSize: fontSizes.sm, fontWeight: '700' },

  selectedCropCard: { marginTop: 10, borderRadius: 12 },
  manageCropBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },

  ledgerTabBar: { flexDirection: 'row', marginTop: 16, marginBottom: 8, gap: 8 },
  ledgerTabPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  txHeaderRow: { marginTop: 8, marginBottom: 8 },
  miniCropTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  pnlHeroCard: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  pnlDataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },

  sectionTitle: { fontSize: fontSizes.base, fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10, marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  areaStats: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: 1, marginVertical: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
});
