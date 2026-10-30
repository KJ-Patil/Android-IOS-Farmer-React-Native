import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { ScreenLayout } from '../../../components/layout/ScreenLayout';
import { MoneyInModal } from '../components/MoneyInModal';
import { MoneyOutModal } from '../components/MoneyOutModal';
import { OCRScannerModal } from '../components/OCRScannerModal';
import { CustomLedgersModal } from '../components/CustomLedgersModal';
import { IncomeRegisterView } from '../components/IncomeRegisterView';
import { ProfitLossView } from '../components/ProfitLossView';
import { ReportsHubView } from '../components/ReportsHubView';
import { PartyLedgerView } from '../components/PartyLedgerView';
import { CreditTrackerView } from '../components/CreditTrackerView';
import { NotebookLedgerView } from '../components/NotebookLedgerView';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { BookOpen, Wallet, TrendingUp, FileText, Users, CreditCard } from 'lucide-react-native';
import { WaveHeader } from '../../../components/ui/WaveHeader';

type TabKey = 'notebook' | 'income' | 'pnl' | 'reports' | 'party' | 'credit';

export function LedgerScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { transactions, fetchTransactions } = useLedgerStore();
  const [activeTab, setActiveTab] = useState<TabKey>('notebook');
  const [moneyInVisible, setMoneyInVisible] = useState(false);
  const [moneyOutVisible, setMoneyOutVisible] = useState(false);
  const [ocrVisible, setOcrVisible] = useState(false);
  const [customLedgersVisible, setCustomLedgersVisible] = useState(false);
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

  const tabDefs: { key: TabKey; label: string; Icon: typeof BookOpen }[] = [
    { key: 'notebook', label: t('notebook'), Icon: BookOpen },
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
        {activeTab === 'notebook' && (
          <NotebookLedgerView
            onMoneyIn={() => setMoneyInVisible(true)}
            onMoneyOut={() => setMoneyOutVisible(true)}
            onScanBill={() => setOcrVisible(true)}
            onCustomLedgers={() => setCustomLedgersVisible(true)}
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
});
