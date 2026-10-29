import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { usePlotStore } from '../../../shared/hooks/usePlotStore';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { ScreenLayout } from '../../../components/layout/ScreenLayout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';
import { MoneyInModal } from '../../ledger/components/MoneyInModal';
import { MoneyOutModal } from '../../ledger/components/MoneyOutModal';
import { ArrowLeft, Sprout, TrendingUp, TrendingDown, DollarSign } from 'lucide-react-native';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';

const STATUS_ORDER = ['sown', 'vegetative', 'flowering', 'harvested'] as const;

export function CropDashboardScreen({ route, navigation }: any) {
  const { plotId, cropId } = route.params;
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { crops, updateCrop } = usePlotStore();
  const { transactions } = useLedgerStore();
  const { fmtCurrency, fmtDMY, toNative } = useLocalizedFormat();

  const [moneyInOpen, setMoneyInOpen] = useState(false);
  const [moneyOutOpen, setMoneyOutOpen] = useState(false);

  const plotCrops = crops[plotId] || [];
  const crop = plotCrops.find((c) => c.id === cropId);

  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0]);
  const [actualYield, setActualYield] = useState('');
  const [yieldUnit, setYieldUnit] = useState<'quintal' | 'kg' | 'ton'>('quintal');
  const [advancing, setAdvancing] = useState(false);

  // Crop-specific financial calculations
  const cropFinancials = useMemo(() => {
    const cropTxns = transactions.filter(
      (tx) => tx.cropId === cropId || (tx.category && tx.category.toLowerCase() === (crop?.cropType || '').toLowerCase())
    );
    const income = cropTxns
      .filter((tx) => tx.type === 'income')
      .reduce((s, tx) => s + (tx.amount || 0), 0);
    const expenses = cropTxns
      .filter((tx) => tx.type === 'expense')
      .reduce((s, tx) => s + (tx.amount || 0), 0);
    return { income, expenses, profit: income - expenses, count: cropTxns.length };
  }, [transactions, cropId, crop?.cropType]);

  if (!crop) {
    return (
      <ScreenLayout>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color={colors.foreground} size={18} />
          </TouchableOpacity>
        </View>
        <Text style={{ color: colors.mutedFg, textAlign: 'center', marginTop: 40 }}>
          {t('noData')}
        </Text>
      </ScreenLayout>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(crop.status as any);
  const isLocked = crop.isLocked || crop.status === 'harvested' || crop.status === 'completed';
  const harvestOverdue =
    crop.expectedHarvestDate &&
    new Date(crop.expectedHarvestDate) < new Date() &&
    crop.status !== 'harvested' &&
    crop.status !== 'completed';

  const advanceStatus = async () => {
    if (isLocked || currentIdx >= STATUS_ORDER.length - 1) return;
    const nextStatus = STATUS_ORDER[currentIdx + 1];

    if (nextStatus === 'harvested') {
      if (!actualYield || isNaN(Number(actualYield)) || Number(actualYield) <= 0) {
        Alert.alert(t('required'), t('enterValidActualYield'));
        return;
      }
      setAdvancing(true);
      try {
        await updateCrop(plotId, cropId, {
          status: 'harvested',
          actualHarvestDate: harvestDate,
          actualYield: parseFloat(actualYield),
          actualYieldUnit: yieldUnit,
        });
      } catch (err: any) {
        Alert.alert(t('error'), err.message);
      } finally {
        setAdvancing(false);
      }
    } else {
      setAdvancing(true);
      try {
        await updateCrop(plotId, cropId, { status: nextStatus });
      } catch (err: any) {
        Alert.alert(t('error'), err.message);
      } finally {
        setAdvancing(false);
      }
    }
  };

  return (
    <ScreenLayout>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Top Bar with Back Button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.8}
          >
            <ArrowLeft color={colors.foreground} size={18} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>{t(crop.cropType)}</Text>
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
              {crop.variety} • {toNative(crop.area)} {crop.areaUnit ? t(crop.areaUnit) : t('acre')}
            </Text>
          </View>
          <Badge
            text={t(crop.status) || crop.status}
            variant={crop.status === 'harvested' ? 'success' : 'info'}
          />
        </View>

        {isLocked && (
          <View style={[styles.banner, { backgroundColor: colors.warning + '20' }]}>
            <Text style={{ color: colors.warning, fontWeight: '700' }}>🔒 {t('cropLocked')}</Text>
          </View>
        )}

        {harvestOverdue && !isLocked && (
          <View style={[styles.banner, { backgroundColor: colors.destructive + '20' }]}>
            <Text style={{ color: colors.destructive, fontWeight: '700' }}>{t('harvestReminder')}</Text>
          </View>
        )}

        {/* Financial KPI Summary for this Crop */}
        <View style={{ marginTop: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 8, paddingHorizontal: 4 }]}>
            {t('cropFinancialSummary')}
          </Text>
          <View style={styles.finGrid}>
            <View style={[styles.finItem, styles.finCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.finLabel, { color: colors.mutedFg }]}>{t('revenue')}</Text>
              <Text style={[styles.finValue, { color: '#16A34A' }]}>
                {fmtCurrency(cropFinancials.income)}
              </Text>
            </View>
            <View style={[styles.finItem, styles.finCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.finLabel, { color: colors.mutedFg }]}>{t('expenses')}</Text>
              <Text style={[styles.finValue, { color: '#DC2626' }]}>
                {fmtCurrency(cropFinancials.expenses)}
              </Text>
            </View>
            <View style={[styles.finItem, styles.finCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.finLabel, { color: colors.mutedFg }]}>{t('netMargin')}</Text>
              <Text
                style={[styles.finValue, { color: cropFinancials.profit >= 0 ? '#16A34A' : '#DC2626' }]}
              >
                {fmtCurrency(cropFinancials.profit)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <Button
              title={t('recordIncome')}
              onPress={() => setMoneyInOpen(true)}
              size="sm"
              style={{ flex: 1 }}
            />
            <Button
              title={t('recordExpense')}
              onPress={() => setMoneyOutOpen(true)}
              variant="outline"
              size="sm"
              style={{ flex: 1 }}
            />
          </View>
        </View>

        {/* Crop Cycle Parameters */}
        <Card style={{ marginTop: 12 }}>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg }}>{t('season')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{t(crop.season.toLowerCase()) || crop.season}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={{ color: colors.mutedFg }}>{t('sowingDate')}</Text>
            <Text style={{ color: colors.foreground, fontWeight: '700' }}>{fmtDMY(crop.sowingDate)}</Text>
          </View>
          {crop.expectedHarvestDate && (
            <View style={styles.detailRow}>
              <Text style={{ color: colors.mutedFg }}>{t('expectedHarvest')}</Text>
              <Text style={{ color: colors.foreground, fontWeight: '700' }}>{fmtDMY(crop.expectedHarvestDate)}</Text>
            </View>
          )}
          {crop.actualHarvestDate && (
            <View style={styles.detailRow}>
              <Text style={{ color: colors.mutedFg }}>{t('actualHarvest')}</Text>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{fmtDMY(crop.actualHarvestDate)}</Text>
            </View>
          )}
          {crop.actualYield !== undefined && (
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={{ color: colors.mutedFg }}>{t('actualYield')}</Text>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {toNative(crop.actualYield)} {crop.actualYieldUnit ? (t(crop.actualYieldUnit.toLowerCase()) || crop.actualYieldUnit) : t('quintal')}
              </Text>
            </View>
          )}
        </Card>

        {/* Growth Stage Progression Timeline */}
        <Card style={{ marginTop: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>
            {t('cropStatus')}
          </Text>
          <View style={styles.statusTimeline}>
            {STATUS_ORDER.map((status, idx) => {
              const isComplete = idx <= currentIdx;
              const isActive = idx === currentIdx;
              return (
                <View key={status} style={styles.statusItem}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: isComplete ? colors.primary : colors.muted,
                        borderColor: isActive ? colors.primary : 'transparent',
                        borderWidth: isActive ? 3 : 0,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusLabel,
                      { color: isComplete ? colors.primary : colors.mutedFg, fontWeight: isActive ? '700' : '500' },
                    ]}
                  >
                    {t(status)}
                  </Text>
                  {idx < STATUS_ORDER.length - 1 && (
                    <View
                      style={[
                        styles.statusLine,
                        { backgroundColor: isComplete ? colors.primary : colors.border },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </Card>

        {/* Status Advancement Box */}
        {!isLocked && currentIdx < STATUS_ORDER.length - 1 && (
          <Card style={{ marginTop: 12 }} padding={16}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 10 }]}>
              {t('advanceStageTo')}: {t(STATUS_ORDER[currentIdx + 1])}
            </Text>

            {STATUS_ORDER[currentIdx + 1] === 'harvested' && (
              <>
                <DatePickerInput
                  label={t('actualHarvest')}
                  value={harvestDate}
                  onChange={setHarvestDate}
                />
                <Input
                  label={`${t('actualYield')} (${t(yieldUnit)})`}
                  placeholder={t('yieldPlaceholder')}
                  value={actualYield}
                  onChangeText={setActualYield}
                  keyboardType="numeric"
                />
              </>
            )}

            <Button
              title={t('advanceTo', { stage: t(STATUS_ORDER[currentIdx + 1]) })}
              onPress={advanceStatus}
              loading={advancing}
              fullWidth
            />
          </Card>
        )}
      </ScrollView>

      <MoneyInModal
        visible={moneyInOpen}
        plotId={plotId}
        cropId={cropId}
        onClose={() => setMoneyInOpen(false)}
      />
      <MoneyOutModal
        visible={moneyOutOpen}
        plotId={plotId}
        cropId={cropId}
        onClose={() => setMoneyOutOpen(false)}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  banner: { padding: 12, borderRadius: 10, marginTop: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  finGrid: { flexDirection: 'row', gap: 8 },
  finItem: { flex: 1, alignItems: 'center' },
  finCard: { borderRadius: 24, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  finLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  finValue: { fontSize: 18, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  statusTimeline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  statusItem: { flex: 1, alignItems: 'center', position: 'relative' },
  statusDot: { width: 20, height: 20, borderRadius: 10, zIndex: 2 },
  statusLabel: { fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  statusLine: { position: 'absolute', top: 10, left: '50%', right: '-50%', height: 2, zIndex: 1 },
});
