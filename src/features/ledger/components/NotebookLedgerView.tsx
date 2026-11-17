import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { tCategory, tPaymentMode } from '../../../shared/utils/helpers';
import { ArrowDownLeft, ArrowUpRight, ScanLine, BookOpen } from 'lucide-react-native';
import { ms } from '../../../shared/utils/responsive';

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
  const { fmtCurrency, toNative, fmtDMY } = useLocalizedFormat();

  const summaries = useMemo(() => {
    let allIncome = 0;
    let allExpense = 0;
    for (const tx of transactions) {
      const amt = tx.amount || 0;
      if (tx.type === 'income') allIncome += amt;
      else allExpense += amt;
    }
    return { allIncome, allExpense };
  }, [transactions]);

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions]);

  const fmt = (v: number) => fmtCurrency(Math.round(v));

  return (
    <FlatList
      data={sortedTransactions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
      ListHeaderComponent={
        <View style={{ paddingTop: 8 }}>
          {/* Hero Summary */}
          <Card style={{ borderRadius: 20 }} padding={16}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.headingIcon, { backgroundColor: '#FEF3C7' }]}>
                <BookOpen color="#D97706" size={20} />
              </View>
              <Text style={{ color: colors.foreground, fontSize: ms(16), fontWeight: '700' }}>
                {t('notebook')}
              </Text>
            </View>
            <View style={[styles.kpiTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('income')}</Text>
                <Text style={[styles.kpiValue, { color: '#16A34A' }]} numberOfLines={1}>
                  +{fmt(summaries.allIncome)}
                </Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('expense')}</Text>
                <Text style={[styles.kpiValue, { color: '#DC2626' }]} numberOfLines={1}>
                  -{fmt(summaries.allExpense)}
                </Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('netProfit')}</Text>
                <Text
                  style={[
                    styles.kpiValue,
                    { color: summaries.allIncome - summaries.allExpense >= 0 ? '#16A34A' : '#DC2626' },
                  ]}
                  numberOfLines={1}
                >
                  {summaries.allIncome - summaries.allExpense >= 0 ? '+' : ''}{fmt(summaries.allIncome - summaries.allExpense)}
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

          {/* Transaction list header */}
          <Text style={[styles.sectionLabel, { color: colors.foreground, marginBottom: 6, marginTop: 18 }]}>
            {t('allTransactions')} ({toNative(sortedTransactions.length)})
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ color: colors.mutedFg, fontSize: ms(13), fontWeight: '600' }}>{t('noData')}</Text>
        </View>
      }
      renderItem={({ item: txn }) => (
        <Card style={{ marginTop: 8 }} padding={12}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: ms(13) }}>{tCategory(txn.category, t)}</Text>
                {txn.isAutoGenerated && <Badge text={t('autoGenerated')} variant="warning" />}
              </View>
              <Text style={{ color: colors.mutedFg, fontSize: ms(12), marginTop: 2 }}>
                {fmtDMY(txn.date)} {txn.partyName ? `• ${txn.partyName}` : ''}{txn.plotName ? ` • ${txn.plotName}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: txn.type === 'income' ? colors.primary : colors.destructive, fontWeight: '700', fontSize: ms(15) }}>
                {txn.type === 'income' ? '+' : '-'}{fmtCurrency(txn.amount)}
              </Text>
              <Badge text={tPaymentMode(txn.paymentMode, t)} />
            </View>
          </View>
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
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
    fontSize: ms(12),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: ms(16),
  },
  sectionLabel: {
    fontSize: ms(14),
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
  },
  headingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiTable: { flexDirection: 'row', marginTop: 14, borderRadius: 12, borderWidth: 1, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  kpiCol: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  kpiDivider: { width: 1, alignSelf: 'stretch', marginVertical: 2 },
  kpiLabel: { fontSize: ms(11), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  kpiValue: { fontSize: ms(16), fontWeight: '800', marginTop: 4, textAlign: 'center' },
});
