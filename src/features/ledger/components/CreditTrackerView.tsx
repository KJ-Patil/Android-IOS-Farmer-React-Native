import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';
import { isOverdue, tCategory, tPaymentMode } from '../../../shared/utils/helpers';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import type { Transaction, PaymentMode } from '../../../shared/types/ledger';
import {
  Clock,
  CheckCircle2,
  Calendar,
  Wallet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { ms } from '../../../shared/utils/responsive';

interface CreditTrackerViewProps {
  onOpenAddModal?: () => void;
}

export function CreditTrackerView({ onOpenAddModal }: CreditTrackerViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { transactions, recordCreditPayment } = useLedgerStore();
  const { fmtCurrency, toNative, fmtDMY } = useLocalizedFormat();

  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState<PaymentMode>('upi');
  const [payNotes, setPayNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter all credit purchases (either paymentMode === 'credit' or has pendingAmount)
  const creditPurchases = useMemo(() => {
    return transactions.filter(
      (tx) => tx.paymentMode === 'credit' || (tx.pendingAmount !== undefined && tx.pendingAmount > 0)
    );
  }, [transactions]);

  const totalCreditTaken = creditPurchases.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalPendingDue = creditPurchases.reduce(
    (sum, tx) => sum + (tx.pendingAmount !== undefined ? tx.pendingAmount : tx.amount || 0),
    0
  );
  const totalPaidBack = Math.max(0, totalCreditTaken - totalPendingDue);

  const handleSettleSubmit = async () => {
    if (!selectedTx || !payAmount || Number(payAmount) <= 0) {
      Alert.alert(t('required'), t('enterValidAmount'));
      return;
    }

    const numAmount = Number(payAmount);
    const maxPending = selectedTx.pendingAmount !== undefined ? selectedTx.pendingAmount : selectedTx.amount;
    if (numAmount > maxPending) {
      Alert.alert(
        t('invalid'),
        `${t('amountCannotExceedDue')} (${fmt(maxPending)})`
      );
      return;
    }

    setLoading(true);
    try {
      await recordCreditPayment(selectedTx.id, {
        date: payDate,
        amount: numAmount,
        paymentMode: payMode,
        notes: payNotes || `${selectedTx.partyName || t('party')} - ${t('payInstallment')}`,
      });

      setSelectedTx(null);
      setPayAmount('');
      setPayNotes('');
      Alert.alert(t('success'), t('paymentRecordedSuccessfully'));
    } catch (err: any) {
      Alert.alert(t('error'), err.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: number) => fmtCurrency(Math.round(v));

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={creditPurchases}
        keyExtractor={(tx) => tx.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ paddingTop: 8 }}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={[styles.headingIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Clock color="#D97706" size={20} />
                </View>
                <Text style={[styles.mainTitle, { color: colors.foreground }]}>
                  {t('creditManagement')}
                </Text>
              </View>

              {onOpenAddModal && (
                <Button
                  title={t('addCredit')}
                  onPress={onOpenAddModal}
                  size="sm"
                />
              )}
            </View>

            {/* 3 KPI Stats */}
            <View style={[styles.kpiTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('totalPendingDue')}</Text>
                <Text style={[styles.kpiValue, { color: '#DC2626' }]} numberOfLines={1}>{fmt(totalPendingDue)}</Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('totalCreditTaken')}</Text>
                <Text style={[styles.kpiValue, { color: '#D97706' }]} numberOfLines={1}>{fmt(totalCreditTaken)}</Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('totalPaidBack')}</Text>
                <Text style={[styles.kpiValue, { color: '#16A34A' }]} numberOfLines={1}>{fmt(totalPaidBack)}</Text>
              </View>
            </View>

            <Text style={{ color: colors.foreground, fontSize: ms(14), fontWeight: '700', marginTop: 12, marginBottom: 6 }}>
              {t('creditBills')} ({toNative(creditPurchases.length)})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <CheckCircle2 color={colors.primary} size={36} />
            <Text style={{ color: colors.mutedFg, marginTop: 10, fontSize: ms(13), fontWeight: '600' }}>
              {t('noPendingCreditDues')}
            </Text>
          </View>
        }
        renderItem={({ item: tx }) => {
          const pending = tx.pendingAmount !== undefined ? tx.pendingAmount : tx.amount;
          const isSettled = pending <= 0;
          const overdue = !isSettled && isOverdue(tx.dueDate, pending);
          const isExpanded = expandedTxId === tx.id;
          const payments = tx.payments || [];
          const paidAmount = tx.amount - pending;
          const progressPct = tx.amount > 0 ? (paidAmount / tx.amount) * 100 : 0;

          return (
            <Card style={{ marginTop: 10 }} padding={16}>
              {/* Top: Name + Status */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <View style={[styles.partyIcon, { backgroundColor: overdue ? '#FEE2E2' : isSettled ? '#DCFCE7' : '#FEF3C7' }]}>
                    <Text style={{ fontSize: 16 }}>{overdue ? '⚠️' : isSettled ? '✅' : '🧾'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: ms(14) }} numberOfLines={1}>
                      {tx.partyName || tCategory(tx.category, t)}
                    </Text>
                    <Text style={{ color: colors.mutedFg, fontSize: ms(12), marginTop: 1 }}>
                      {tCategory(tx.category, t)} • {fmtDMY(tx.date)}
                    </Text>
                  </View>
                </View>
                {isSettled ? (
                  <Badge text={t('fullyPaid')} variant="success" />
                ) : overdue ? (
                  <Badge text={t('overdue')} variant="destructive" />
                ) : (
                  <Badge text={t('pending')} variant="warning" />
                )}
              </View>

              {/* Amount row */}
              <View style={[styles.amountRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: colors.mutedFg, fontSize: ms(11) }}>{t('total')}</Text>
                  <Text style={{ color: colors.foreground, fontSize: ms(15), fontWeight: '700' }}>{fmt(tx.amount)}</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: colors.mutedFg, fontSize: ms(11) }}>{t('paid')}</Text>
                  <Text style={{ color: '#16A34A', fontSize: ms(15), fontWeight: '700' }}>{fmt(paidAmount)}</Text>
                </View>
                <View style={{ width: 1, height: 28, backgroundColor: colors.border }} />
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: colors.mutedFg, fontSize: ms(11) }}>{t('due')}</Text>
                  <Text style={{ color: '#DC2626', fontSize: ms(15), fontWeight: '700' }}>{fmt(pending)}</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                <View style={[styles.progressFill, { width: `${Math.min(progressPct, 100)}%`, backgroundColor: isSettled ? '#16A34A' : '#D97706' }]} />
              </View>

              {/* Due date */}
              {tx.dueDate && !isSettled && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
                  <Calendar color={overdue ? colors.destructive : colors.mutedFg} size={13} />
                  <Text style={{ color: overdue ? colors.destructive : colors.mutedFg, fontSize: ms(12), fontWeight: overdue ? '700' : '500' }}>
                    {t('due')}: {fmtDMY(tx.dueDate)}
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  onPress={() => setExpandedTxId(isExpanded ? null : tx.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <Text style={{ color: colors.primary, fontSize: ms(12), fontWeight: '600' }}>
                    {toNative(payments.length)} {t('installments')}
                  </Text>
                  {isExpanded ? <ChevronUp color={colors.primary} size={14} /> : <ChevronDown color={colors.primary} size={14} />}
                </TouchableOpacity>

                {!isSettled && (
                  <TouchableOpacity
                    onPress={() => { setSelectedTx(tx); setPayAmount(String(pending)); }}
                    activeOpacity={0.7}
                    style={[styles.payBtn, { backgroundColor: overdue ? '#DC2626' : colors.primary }]}
                  >
                    <Wallet size={14} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: ms(13) }}>{t('payInstallment')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Payment history */}
              {isExpanded && (
                <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
                  <Text style={{ color: colors.foreground, fontSize: ms(13), fontWeight: '700', marginBottom: 6 }}>
                    {t('paymentHistory')}:
                  </Text>
                  {payments.length === 0 ? (
                    <Text style={{ color: colors.mutedFg, fontSize: ms(13) }}>{t('noPartialPayments')}</Text>
                  ) : (
                    payments.map((p, idx) => (
                      <View key={p.id || idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: idx < payments.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }}>
                        <Text style={{ color: colors.foreground, fontSize: ms(12) }}>
                          {fmtDMY(p.date)} • {tPaymentMode(p.paymentMode, t)}
                        </Text>
                        <Text style={{ color: '#16A34A', fontSize: ms(13), fontWeight: '700' }}>+{fmt(p.amount)}</Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </Card>
          );
        }}
      />

      {/* Settle / Pay Installment Modal */}
      {selectedTx && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setSelectedTx(null)}>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[styles.unifiedHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={{ width: 40 }} />
              <View style={{ alignItems: 'center', flex: 1 }}>
                <Text style={[styles.unifiedTitle, { color: colors.foreground }]}>💳 {t('payCreditDue')}</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              <Text style={{ color: colors.mutedFg, fontSize: ms(12), marginBottom: 12 }}>
                {selectedTx.partyName || tCategory(selectedTx.category, t)} • {t('pending')}:{' '}
                <Text style={{ fontWeight: '700', color: colors.destructive }}>
                  {fmt(selectedTx.pendingAmount ?? selectedTx.amount)}
                </Text>
              </Text>

              <Input
                label={t('repaymentAmount')}
                value={payAmount}
                onChangeText={(v) => setPayAmount(v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder={String(selectedTx.pendingAmount ?? selectedTx.amount)}
              />

              <DatePickerInput
                label={t('paymentDate')}
                value={payDate}
                onChange={setPayDate}
              />

              <Text style={[styles.inputLabel, { color: colors.foreground }]}>
                {t('paymentMode')}
              </Text>
              <View style={styles.modeRow}>
                {(['upi', 'cash', 'bank'] as PaymentMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setPayMode(mode)}
                    style={[
                      styles.modeChip,
                      {
                        backgroundColor: payMode === mode ? colors.primary + '15' : colors.card,
                        borderColor: payMode === mode ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: payMode === mode ? colors.primary : colors.foreground,
                        fontWeight: '700',
                        fontSize: ms(12),
                      }}
                    >
                      {t(mode)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label={t('notes')}
                value={payNotes}
                onChangeText={setPayNotes}
                placeholder={t('repaymentNotesPlaceholder')}
              />
            </ScrollView>

            <View style={[styles.unifiedFooter, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
              <TouchableOpacity onPress={() => setSelectedTx(null)} activeOpacity={0.7} style={[styles.unifiedCancelBtn, { borderColor: colors.destructive }]}>
                <Text style={{ color: colors.destructive, fontWeight: '700', fontSize: ms(15) }}>✕ {t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSettleSubmit} activeOpacity={0.7} disabled={loading} style={[styles.unifiedSaveBtn, { backgroundColor: colors.primary, shadowColor: colors.primary, opacity: loading ? 0.6 : 1 }]}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: ms(16) }}>{loading ? '...' : `✓ ${t('recordPayment')}`}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainTitle: { fontSize: ms(16), fontWeight: '700' },
  kpiTable: { flexDirection: 'row', marginVertical: 12, borderRadius: 12, borderWidth: 1, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  kpiCol: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  kpiDivider: { width: 1, alignSelf: 'stretch', marginVertical: 2 },
  kpiLabel: { fontSize: ms(11), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  kpiValue: { fontSize: ms(16), fontWeight: '800', marginTop: 4, textAlign: 'center' },
  modalOverlay: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 16, borderWidth: 1, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: ms(16), fontWeight: '700' },
  inputLabel: { fontSize: ms(12), fontWeight: '600', marginBottom: 6, marginTop: 4 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  partyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  amountRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%' as any,
    borderRadius: 3,
  },
  cardActions: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  payBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  unifiedHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1 },
  unifiedTitle: { fontSize: ms(18), fontWeight: '800' as const },
  unifiedFooter: { flexDirection: 'row' as const, padding: 16, gap: 12, borderTopWidth: 1 },
  unifiedCancelBtn: { flex: 1, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  unifiedSaveBtn: { flex: 1.5, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, paddingVertical: 14, borderRadius: 14, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
});
