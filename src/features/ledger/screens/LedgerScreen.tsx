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
import { ExpenseRegisterView } from '../components/ExpenseRegisterView';
import { ProfitLossView } from '../components/ProfitLossView';
import { PartyLedgerView } from '../components/PartyLedgerView';
import { CreditTrackerView } from '../components/CreditTrackerView';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { Wallet, TrendingDown, TrendingUp, Users, CreditCard } from 'lucide-react-native';
import { WaveHeader } from '../../../components/ui/WaveHeader';
import { fontSizes } from '../../../shared/utils/typography';

type TabKey = 'income' | 'expense' | 'pnl' | 'party' | 'credit';

export function LedgerScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { transactions, fetchTransactions } = useLedgerStore();
  const [activeTab, setActiveTab] = useState<TabKey>('income');
  const [moneyInVisible, setMoneyInVisible] = useState(false);
  const [moneyOutVisible, setMoneyOutVisible] = useState(false);
  const [ocrVisible, setOcrVisible] = useState(false);
  const [customLedgersVisible, setCustomLedgersVisible] = useState(false);
  const [ocrInitialData, setOcrInitialData] = useState<any>(null);
  const { fmtCurrency, toNative } = useLocalizedFormat();

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
  }, [fetchTransactions]);

  const tabDefs: { key: TabKey; label: string; Icon: typeof Wallet }[] = [
    { key: 'income', label: t('incomeRegister'), Icon: Wallet },
    { key: 'expense', label: t('expenseRegister'), Icon: TrendingDown },
    { key: 'party', label: t('partyLedgers'), Icon: Users },
    { key: 'pnl', label: t('profitLoss'), Icon: TrendingUp },
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
                    fontSize: fontSizes.sm,
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
        {activeTab === 'income' && (
          <IncomeRegisterView onOpenMoneyInModal={() => setMoneyInVisible(true)} />
        )}
        {activeTab === 'expense' && (
          <ExpenseRegisterView onOpenMoneyOutModal={() => setMoneyOutVisible(true)} />
        )}
        {activeTab === 'pnl' && <ProfitLossView />}
        {activeTab === 'party' && <PartyLedgerView />}
        {activeTab === 'credit' && (
          <CreditTrackerView onOpenAddModal={() => setMoneyOutVisible(true)} />
        )}
      </View>

      {/* Floating Action Buttons — visible across all tabs */}
      <View style={styles.fabRow}>
        <TouchableOpacity
          onPress={() => setMoneyOutVisible(true)}
          style={[styles.fabBtn, { backgroundColor: colors.destructive }]}
          activeOpacity={0.8}
          accessibilityLabel={t('moneyOut')}
          accessibilityRole="button"
        >
          <Text style={styles.fabBtnText}>- {t('out') || t('moneyOut')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMoneyInVisible(true)}
          style={[styles.fabBtn, { backgroundColor: colors.success }]}
          activeOpacity={0.8}
          accessibilityLabel={t('moneyIn')}
          accessibilityRole="button"
        >
          <Text style={styles.fabBtnText}>+ {t('in') || t('moneyIn')}</Text>
        </TouchableOpacity>
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
  fabRow: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', gap: 10, zIndex: 10 },
  fabBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 28, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  fabBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});
