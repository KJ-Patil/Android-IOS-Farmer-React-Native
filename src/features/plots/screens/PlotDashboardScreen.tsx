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
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Trash2 } from 'lucide-react-native';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { tCategory, tPaymentMode } from '../../../shared/utils/helpers';

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

  const plot = plots.find((p) => p.id === plotId);
  const plotCrops = useMemo(() => crops[plotId] || [], [crops, plotId]);
  const remaining = getPlotRemainingArea(plotId);
  const usedArea = plot ? plot.area - remaining : 0;
  const occupancyPercent = plot && plot.area > 0 ? (usedArea / plot.area) * 100 : 0;

  useEffect(() => {
    fetchCrops(plotId);
    fetchTransactions();
  }, [plotId]);

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
        {/* Top Header with Back button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.8}
          >
            <ArrowLeft color={colors.foreground} size={18} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
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
        </View>

        {/* Plot / Crop Financial KPI Card */}
        <Card style={styles.financialCard} padding={16}>
          <View style={styles.financialHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.financialCardTitle, { color: colors.foreground }]} numberOfLines={1}>
                {selectedCrop ? `${t(selectedCrop.cropType)} ${t('ledger')}` : `${plot.name} ${t('ledger')}`}
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedFg, marginTop: 2 }}>
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
                  fontSize: 11,
                  fontWeight: '700',
                  color: financials.profit >= 0 ? '#16A34A' : '#DC2626',
                }}
              >
                {financials.profit >= 0 ? `+${financials.margin.toFixed(0)}% Margin` : `${financials.margin.toFixed(0)}% Margin`}
              </Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCol}>
              <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('totalRevenue')}</Text>
              <Text style={[styles.kpiValue, { color: '#16A34A' }]} numberOfLines={1}>
                +{fmtCurrency(financials.income)}
              </Text>
            </View>
            <View style={styles.kpiCol}>
              <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('totalExpenses')}</Text>
              <Text style={[styles.kpiValue, { color: colors.destructive }]} numberOfLines={1}>
                -{fmtCurrency(financials.expenses)}
              </Text>
            </View>
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
            style={[
              styles.addCropChipBtn,
              {
                backgroundColor: remaining > 0 ? colors.primary + '15' : colors.muted,
                borderColor: remaining > 0 ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: remaining > 0 ? colors.primary : colors.mutedFg }}>
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
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.foreground }}>
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
                <Text style={{ fontSize: 12, color: colors.mutedFg, marginTop: 4 }}>
                  {toNative(selectedCrop.area)} {t(selectedCrop.areaUnit || 'acre')} • {t(selectedCrop.season.toLowerCase()) || selectedCrop.season} • {fmtDMY(selectedCrop.sowingDate)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('CropDashboard', { plotId, cropId: selectedCrop.id })}
                style={[styles.manageCropBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>{t('details')} ›</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Ledger Transactions Section */}
        <View style={styles.txHeaderRow}>
          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
            {selectedCrop
              ? `${t(selectedCrop.cropType)} ${t('ledger')} (${toNative(displayedTxns.length)})`
              : `${t('allTransactions')} (${toNative(displayedTxns.length)})`}
          </Text>
        </View>

        {displayedTxns.length === 0 ? (
          <Card style={{ padding: 24, alignItems: 'center', marginTop: 4 }}>
            <Text style={{ color: colors.mutedFg, textAlign: 'center', fontSize: 13, fontWeight: '500' }}>
              {t('noData')}
            </Text>
            <Text style={{ color: colors.mutedFg, textAlign: 'center', fontSize: 11, marginTop: 4 }}>
              {t('moneyIn')} / {t('moneyOut')}
            </Text>
          </Card>
        ) : (
          displayedTxns.map((txn, index) => (
            <Card key={txn.id || index} style={{ marginBottom: 8 }} padding={12}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 14 }}>
                      {tCategory(txn.category, t)}
                    </Text>
                    {txn.cropName && (
                      <View style={[styles.miniCropTag, { backgroundColor: colors.primary + '12' }]}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary }}>
                          {t(txn.cropName) || txn.cropName}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 3 }}>
                    {fmtDMY(txn.date)} {txn.partyName ? `• ${txn.partyName}` : ''}{txn.billNumber ? ` • #${txn.billNumber}` : ''}
                  </Text>
                  {txn.notes ? (
                    <Text style={{ color: colors.mutedFg, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                      {txn.notes}
                    </Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      color: txn.type === 'income' ? '#16A34A' : colors.destructive,
                      fontWeight: '800',
                      fontSize: 15,
                    }}
                  >
                    {txn.type === 'income' ? '+' : '-'}{fmtCurrency(txn.amount)}
                  </Text>
                  <Badge text={tPaymentMode(txn.paymentMode, t)} />
                </View>
              </View>
            </Card>
          ))
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
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
              {t('usedArea')}: <Text style={{ fontWeight: '700', color: colors.foreground }}>{toNative(usedArea.toFixed(2))}</Text>
            </Text>
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
              {t('remainingArea')}: <Text style={{ fontWeight: '700', color: colors.primary }}>{toNative(remaining.toFixed(2))}</Text>
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg, fontSize: 13 }}>{t('gatNumber')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{toNative(plot.gatNumber)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg, fontSize: 13 }}>{t('area')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>
              {toNative(plot.area)} {t(plot.areaUnit || 'acre')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg, fontSize: 13 }}>{t('soilType')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>
              {t(plot.soilType) || plot.soilType}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg, fontSize: 13 }}>{t('irrigationType')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>{t(plot.irrigationType) || plot.irrigationType}</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={{ color: colors.mutedFg, fontSize: 13 }}>{t('waterAvailability')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>
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

      <MoneyInModal
        visible={moneyInOpen}
        onClose={() => {
          setMoneyInOpen(false);
          fetchTransactions();
        }}
        plotId={plotId}
        cropId={selectedCropId !== 'all' ? selectedCropId : undefined}
      />

      <MoneyOutModal
        visible={moneyOutOpen}
        onClose={() => {
          setMoneyOutOpen(false);
          fetchTransactions();
        }}
        plotId={plotId}
        cropId={selectedCropId !== 'all' ? selectedCropId : undefined}
      />

      <AddCropModal
        visible={addCropVisible}
        plotId={plotId}
        onClose={() => {
          setAddCropVisible(false);
          fetchCrops(plotId);
        }}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  gatBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  gatText: { fontSize: 13, fontWeight: '700' },

  financialCard: { marginTop: 4, borderRadius: 18 },
  financialHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  financialCardTitle: { fontSize: 17, fontWeight: '800' },
  profitBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },

  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  kpiCol: { flex: 1, alignItems: 'flex-start' },
  kpiLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  kpiValue: { fontSize: 16, fontWeight: '800', marginTop: 4 },

  actionBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  cropSelectorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  sectionLabel: { fontSize: 15, fontWeight: '800' },
  addCropChipBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  cropChipsScroll: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
  cropChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  cropChipText: { fontSize: 13, fontWeight: '700' },

  selectedCropCard: { marginTop: 10, borderRadius: 12 },
  manageCropBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },

  txHeaderRow: { marginTop: 16, marginBottom: 8 },
  miniCropTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  sectionTitle: { fontSize: 15, fontWeight: '700' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 10, marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
  areaStats: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: 1, marginVertical: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
});
