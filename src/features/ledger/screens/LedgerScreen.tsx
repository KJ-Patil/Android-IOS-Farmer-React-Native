import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { ScreenLayout } from '../../../components/layout/ScreenLayout';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { MoneyInModal } from '../components/MoneyInModal';
import { MoneyOutModal } from '../components/MoneyOutModal';
import { OCRScannerModal } from '../components/OCRScannerModal';
import { CustomLedgersModal } from '../components/CustomLedgersModal';
import { IncomeRegisterView } from '../components/IncomeRegisterView';
import { ProfitLossView } from '../components/ProfitLossView';
import { ReportsHubView } from '../components/ReportsHubView';
import { PartyLedgerView } from '../components/PartyLedgerView';
import { CreditTrackerView } from '../components/CreditTrackerView';
import { TransactionFilterBar, TransactionFilters } from '../components/TransactionFilterBar';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { tCategory, tPaymentMode } from '../../../shared/utils/helpers';
import { BookOpen, ScanLine, ArrowDownLeft, ArrowUpRight, List, Wallet, TrendingUp, FileText, Users, CreditCard } from 'lucide-react-native';
import { WaveHeader } from '../../../components/ui/WaveHeader';

type TabKey = 'all' | 'income' | 'pnl' | 'reports' | 'party' | 'credit';

export function LedgerScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { transactions, fetchTransactions } = useLedgerStore();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [moneyInVisible, setMoneyInVisible] = useState(false);
  const [moneyOutVisible, setMoneyOutVisible] = useState(false);
  const [ocrVisible, setOcrVisible] = useState(false);
  const [customLedgersVisible, setCustomLedgersVisible] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [ocrInitialData, setOcrInitialData] = useState<any>(null);
  const { fmtCurrency, toNative, fmtDMY } = useLocalizedFormat();

  const handleApplyOCR = (data: any) => {
    setOcrVisible(false);
    setOcrInitialData({
      amount: data.amount,
      partyName: data.merchantName,
      billNumber: data.billNumber,
      date: data.date,
      category: data.category?.toLowerCase() || 'fertilizers',
      notes: data.items ? `Items: ${data.items}` : '',
      paymentMode: data.paymentMode || 'cash',
    });
    setMoneyOutVisible(true);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (filters.type) result = result.filter((tx) => tx.type === filters.type);
    if (filters.paymentMode) result = result.filter((tx) => tx.paymentMode === filters.paymentMode);
    if (filters.dateFrom) result = result.filter((tx) => tx.date >= filters.dateFrom!);
    if (filters.dateTo) result = result.filter((tx) => tx.date <= filters.dateTo!);
    return result;
  }, [transactions, filters]);

  const tabDefs: { key: TabKey; label: string; Icon: typeof List }[] = [
    { key: 'all', label: t('allTransactions'), Icon: List },
    { key: 'income', label: t('incomeRegister'), Icon: Wallet },
    { key: 'pnl', label: t('profitLoss'), Icon: TrendingUp },
    { key: 'reports', label: t('reportsExport'), Icon: FileText },
    { key: 'party', label: t('partyLedgers'), Icon: Users },
    { key: 'credit', label: t('creditDues'), Icon: CreditCard },
  ];

  return (
    <ScreenLayout noPadding noTopInset>
      <WaveHeader
        title={t('ledger')}
        stats={[
          { value: fmtCurrency(transactions.reduce((s, tx) => s + (tx.type === 'income' ? tx.amount : 0), 0)), label: t('revenue') },
          { value: fmtCurrency(transactions.reduce((s, tx) => s + (tx.type === 'expense' ? tx.amount : 0), 0)), label: t('expenses') },
          { value: toNative(transactions.length), label: t('entries') },
        ]}
        gradientFrom="#D97706"
        gradientTo="#B45309"
      />
      <View style={[styles.tabBarOuter, { backgroundColor: colors.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
          {tabDefs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <tab.Icon size={15} color={isActive ? '#FFFFFF' : colors.mutedFg} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isActive ? '#FFFFFF' : colors.mutedFg,
                    marginLeft: 5,
                  }}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {activeTab === 'all' && (
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ListHeaderComponent={
              <View>
                <View style={styles.actionGrid}>
                  <TouchableOpacity onPress={() => setMoneyInVisible(true)} style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.7}>
                    <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}><ArrowDownLeft color="#16A34A" size={20} /></View>
                    <Text style={[styles.actionLabel, { color: colors.foreground }]} numberOfLines={2}>{t('moneyIn')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setMoneyOutVisible(true)} style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.7}>
                    <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}><ArrowUpRight color="#DC2626" size={20} /></View>
                    <Text style={[styles.actionLabel, { color: colors.foreground }]} numberOfLines={2}>{t('moneyOut')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setOcrVisible(true)} style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.7}>
                    <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}><ScanLine color="#2563EB" size={20} /></View>
                    <Text style={[styles.actionLabel, { color: colors.foreground }]} numberOfLines={2}>{t('scanBill')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCustomLedgersVisible(true)} style={[styles.actionBtn, { backgroundColor: colors.card }]} activeOpacity={0.7}>
                    <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}><BookOpen color="#D97706" size={20} /></View>
                    <Text style={[styles.actionLabel, { color: colors.foreground }]} numberOfLines={2}>{t('customLedgers')}</Text>
                  </TouchableOpacity>
                </View>
                <TransactionFilterBar filters={filters} onApply={setFilters} />
              </View>
            }
            ListEmptyComponent={<Text style={{ color: colors.mutedFg, textAlign: 'center', marginTop: 40 }}>{t('noData')}</Text>}
            renderItem={({ item: txn }) => (
              <Card style={{ marginTop: 8 }} padding={12}>
                <View style={styles.txnRow}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 14 }}>{tCategory(txn.category, t)}</Text>
                      {txn.isAutoGenerated && <Badge text={t('autoGenerated')} variant="warning" />}
                      {txn.isLocked && <Badge text="🔒" />}
                    </View>
                    <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>
                      {fmtDMY(txn.date)} {txn.partyName ? `• ${txn.partyName}` : ''}
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
        )}
        {activeTab === 'income' && (
          <IncomeRegisterView onOpenMoneyInModal={() => setMoneyInVisible(true)} />
        )}
        {activeTab === 'pnl' && <ProfitLossView />}
        {activeTab === 'reports' && <ReportsHubView />}
        {activeTab === 'party' && <PartyLedgerView />}
        {activeTab === 'credit' && (
          <CreditTrackerView onOpenAddModal={() => setMoneyOutVisible(true)} />
        )}
      </View>

      <MoneyInModal visible={moneyInVisible} onClose={() => { setMoneyInVisible(false); fetchTransactions(); }} />
      <MoneyOutModal
        visible={moneyOutVisible}
        initialData={ocrInitialData}
        onClose={() => {
          setMoneyOutVisible(false);
          setOcrInitialData(null);
          fetchTransactions();
        }}
      />
      <OCRScannerModal visible={ocrVisible} onClose={() => setOcrVisible(false)} onApply={handleApplyOCR} />
      <CustomLedgersModal visible={customLedgersVisible} onClose={() => setCustomLedgersVisible(false)} />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: { paddingVertical: 10 },
  tabContent: { paddingHorizontal: 14, gap: 8 },
  tabPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  content: { flex: 1 },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionGrid: { flexDirection: 'row', gap: 8, marginBottom: 12, marginTop: 8 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  actionIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  actionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 4, lineHeight: 15 },
});
