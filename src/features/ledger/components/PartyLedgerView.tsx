import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
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
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import { tCategory, tPaymentMode } from '../../../shared/utils/helpers';
import type { PaymentMode } from '../../../shared/types/ledger';
import {
  Users,
  Search,
  ArrowLeft,
  Phone,
  X,
} from 'lucide-react-native';
import { ms } from '../../../shared/utils/responsive';

interface PartySummary {
  name: string;
  phone?: string;
  partyType?: string;
  totalDebit: number; // Farmer expenses/purchases
  totalCredit: number; // Farmer payments/receipts
  pendingCreditDue: number;
  txCount: number;
  lastDate?: string;
}

export function PartyLedgerView() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { transactions, customLedgers, createTransaction, recordCreditPayment } = useLedgerStore();
  const { fmtCurrency, toNative, fmtDMY } = useLocalizedFormat();

  const [selectedPartyName, setSelectedPartyName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentType, setPaymentType] = useState<'pay_to_party' | 'receive_from_party'>('pay_to_party');
  const [submitting, setSubmitting] = useState(false);

  // Aggregate parties from transactions and customLedgers
  const partiesList = useMemo(() => {
    const map = new Map<string, PartySummary>();

    // 1. Seed custom ledgers
    (customLedgers || []).forEach((cl) => {
      map.set(cl.name, {
        name: cl.name,
        phone: cl.phone,
        partyType: cl.partyType,
        totalDebit: 0,
        totalCredit: 0,
        pendingCreditDue: 0,
        txCount: 0,
      });
    });

    // 2. Aggregate transactions
    transactions.forEach((tx) => {
      const pName = tx.partyName || (tx.ledgerType === 'party' ? tx.category : null);
      if (!pName) return;

      let record = map.get(pName);
      if (!record) {
        record = {
          name: pName,
          totalDebit: 0,
          totalCredit: 0,
          pendingCreditDue: 0,
          txCount: 0,
        };
        map.set(pName, record);
      }

      record.txCount += 1;
      if (!record.lastDate || (tx.date && tx.date > record.lastDate)) {
        record.lastDate = tx.date;
      }

      if (tx.type === 'expense') {
        record.totalDebit += tx.amount || 0;
      } else {
        record.totalCredit += tx.amount || 0;
      }

      if (tx.paymentMode === 'credit' && (tx.pendingAmount ?? 0) > 0) {
        record.pendingCreditDue += tx.pendingAmount || 0;
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      return (b.pendingCreditDue - a.pendingCreditDue) || (b.txCount - a.txCount);
    });
  }, [transactions, customLedgers]);

  // Filter parties by search
  const filteredParties = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return partiesList;
    return partiesList.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q))
    );
  }, [partiesList, searchQuery]);

  const activeParty = selectedPartyName
    ? partiesList.find((p) => p.name === selectedPartyName) || null
    : null;

  // Transactions specifically for active party, sorted date-ascending for running balance
  const partyTransactions = useMemo(() => {
    if (!selectedPartyName) return [];

    const relevant = transactions.filter(
      (tx) => tx.partyName === selectedPartyName || (tx.ledgerType === 'party' && tx.category === selectedPartyName)
    );

    // Sort ascending for ledger statement
    relevant.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    let runningBal = 0;
    return relevant.map((tx) => {
      const debit = tx.type === 'expense' ? tx.amount || 0 : 0;
      const credit = tx.type === 'income' ? tx.amount || 0 : 0;
      runningBal = runningBal + debit - credit;

      return {
        ...tx,
        debit,
        credit,
        runningBalance: runningBal,
      };
    });
  }, [selectedPartyName, transactions]);

  // Handle Record Payment Submit
  const handlePaymentSubmit = async () => {
    if (!selectedPartyName || !paymentAmount || Number(paymentAmount) <= 0) {
      Alert.alert(t('required'), t('enterValidAmount'));
      return;
    }

    const numAmount = Number(paymentAmount);
    setSubmitting(true);
    try {
      // Check if there is an outstanding credit purchase for this party
      const pendingCreditTx = transactions.find(
        (tx) =>
          (tx.partyName === selectedPartyName || tx.category === selectedPartyName) &&
          tx.paymentMode === 'credit' &&
          (tx.pendingAmount || 0) > 0
      );

      if (pendingCreditTx && paymentType === 'pay_to_party') {
        await recordCreditPayment(pendingCreditTx.id, {
          date: paymentDate,
          amount: numAmount,
          paymentMode,
          notes: paymentNotes || `${selectedPartyName} - ${t('payInstallment')}`,
        });
      } else {
        await createTransaction({
          type: paymentType === 'pay_to_party' ? 'expense' : 'income',
          ledgerType: 'party',
          category: selectedPartyName,
          partyName: selectedPartyName,
          amount: numAmount,
          date: paymentDate,
          paymentMode,
          notes:
            paymentNotes ||
            (paymentType === 'pay_to_party'
              ? `${selectedPartyName} - ${t('paidToParty')}`
              : `${selectedPartyName} - ${t('receivedFromParty')}`),
        });
      }

      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      Alert.alert(t('success'), t('paymentRecordedSuccessfully'));
    } catch (err: any) {
      Alert.alert(t('error'), err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (v: number) => fmtCurrency(Math.round(v));

  // If a single party is selected, show Statement View
  if (selectedPartyName && activeParty) {
    const netBal = activeParty.totalDebit - activeParty.totalCredit; // >0 means farmer owes party
    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={[...partyTransactions].reverse()} // show newest on top in list
          keyExtractor={(tx) => tx.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          ListHeaderComponent={
            <View style={{ paddingTop: 8 }}>
              {/* Back Button and Party Header */}
              <TouchableOpacity
                onPress={() => setSelectedPartyName(null)}
                style={styles.backBtn}
                activeOpacity={0.7}
              >
                <ArrowLeft color={colors.primary} size={18} />
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: ms(13), marginLeft: 6 }}>
                  {t('allParties')}
                </Text>
              </TouchableOpacity>

              <Card style={{ marginTop: 10 }} padding={16}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontSize: ms(16), fontWeight: '700' }}>
                      {activeParty.name}
                    </Text>
                    {activeParty.phone && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Phone color={colors.mutedFg} size={12} />
                        <Text style={{ color: colors.mutedFg, fontSize: ms(12) }}>{activeParty.phone}</Text>
                      </View>
                    )}
                    {activeParty.partyType && (
                      <Text style={{ color: colors.primary, fontSize: ms(12), fontWeight: '600', marginTop: 2 }}>
                        {activeParty.partyType}
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.mutedFg, fontSize: ms(12) }}>
                      {t('currentBalance')}
                    </Text>
                    <Text
                      style={{
                        color: netBal > 0 ? colors.destructive : colors.primary,
                        fontSize: ms(16),
                        fontWeight: '800',
                      }}
                    >
                      {fmt(Math.abs(netBal))}
                    </Text>
                    <Badge
                      text={netBal > 0 ? t('payableDr') : t('receivableCr')}
                      variant={netBal > 0 ? 'destructive' : 'success'}
                    />
                  </View>
                </View>

                {/* Dues summary row */}
                <View style={[styles.duesRow, { borderTopColor: colors.border }]}>
                  <View>
                    <Text style={{ color: colors.mutedFg, fontSize: ms(12) }}>{t('totalPurchases')}</Text>
                    <Text style={{ color: colors.destructive, fontWeight: '700', fontSize: ms(13) }}>{fmt(activeParty.totalDebit)}</Text>
                  </View>
                  <View>
                    <Text style={{ color: colors.mutedFg, fontSize: ms(12) }}>{t('totalPaid')}</Text>
                    <Text style={{ color: colors.primary, fontWeight: '700', fontSize: ms(13) }}>{fmt(activeParty.totalCredit)}</Text>
                  </View>
                  {activeParty.pendingCreditDue > 0 && (
                    <View>
                      <Text style={{ color: colors.mutedFg, fontSize: ms(12) }}>{t('pendingBills')}</Text>
                      <Text style={{ color: colors.warning, fontWeight: '700', fontSize: ms(13) }}>{fmt(activeParty.pendingCreditDue)}</Text>
                    </View>
                  )}
                </View>

                {/* Action button */}
                <Button
                  title={t('recordPaymentOrReceipt')}
                  onPress={() => setIsPaymentModalOpen(true)}
                  style={{ marginTop: 12 }}
                  size="sm"
                />
              </Card>

              <Text style={{ color: colors.foreground, fontSize: ms(14), fontWeight: '700', marginTop: 16, marginBottom: 8 }}>
                {t('transactionsStatement')} ({toNative(partyTransactions.length)})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={{ color: colors.mutedFg, textAlign: 'center', marginTop: 30 }}>
              {t('noTransactionsForParty')}
            </Text>
          }
          renderItem={({ item: tx }) => (
            <Card style={{ marginTop: 6 }} padding={12}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: ms(13) }}>
                    {tx.category ? tCategory(tx.category, t) : (tx.type === 'expense' ? t('purchase') : t('payment'))}
                  </Text>
                  <Text style={{ color: colors.mutedFg, fontSize: ms(12), marginTop: 2 }}>
                    {fmtDMY(tx.date)} • {tPaymentMode(tx.paymentMode, t)}
                    {tx.billNumber ? ` • #${tx.billNumber}` : ''}
                  </Text>
                  {tx.notes && (
                    <Text style={{ color: colors.mutedFg, fontSize: ms(12), fontStyle: 'italic', marginTop: 2 }}>
                      {tx.notes}
                    </Text>
                  )}
                </View>

                <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                  <Text
                    style={{
                      color: tx.type === 'expense' ? colors.destructive : colors.primary,
                      fontWeight: '700',
                      fontSize: ms(15),
                    }}
                  >
                    {tx.type === 'expense' ? '-' : '+'}{fmt(tx.amount)}
                  </Text>
                  <Text style={{ color: colors.mutedFg, fontSize: ms(12), marginTop: 2 }}>
                    {t('balance')}: {fmt(Math.abs(tx.runningBalance))}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />

        {/* Payment Modal */}
        {renderPaymentModal()}
      </View>
    );
  }

  // Helper for Payment Modal
  function renderPaymentModal() {
    if (!isPaymentModalOpen) return null;
    return (
      <Modal visible={true} animationType="slide" onRequestClose={() => setIsPaymentModalOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.unifiedHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={{ width: 40 }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={[styles.unifiedTitle, { color: colors.foreground }]}>💰 {selectedPartyName} - {t('payment')}</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                onPress={() => setPaymentType('pay_to_party')}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: paymentType === 'pay_to_party' ? colors.destructive : colors.card,
                  },
                ]}
              >
                <Text
                  style={{
                    color: paymentType === 'pay_to_party' ? '#FFF' : colors.foreground,
                    fontWeight: '700',
                    fontSize: ms(13),
                  }}
                >
                  {t('paidToParty')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentType('receive_from_party')}
                style={[
                  styles.typeBtn,
                  {
                    backgroundColor: paymentType === 'receive_from_party' ? colors.primary : colors.card,
                  },
                ]}
              >
                <Text
                  style={{
                    color: paymentType === 'receive_from_party' ? '#FFF' : colors.foreground,
                    fontWeight: '700',
                    fontSize: ms(13),
                  }}
                >
                  {t('receivedFromParty')}
                </Text>
              </TouchableOpacity>
            </View>

            <Input
              label={t('amount')}
              value={paymentAmount}
              onChangeText={(v) => setPaymentAmount(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="1000"
            />

            <DatePickerInput
              label={t('date')}
              value={paymentDate}
              onChange={setPaymentDate}
            />

            <Text style={[styles.inputLabel, { color: colors.foreground }]}>
              {t('paymentMode')}
            </Text>
            <View style={styles.modeRow}>
              {(['cash', 'upi', 'bank'] as PaymentMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setPaymentMode(mode)}
                  style={[
                    styles.modeChip,
                    {
                      backgroundColor: paymentMode === mode ? colors.primary + '15' : colors.card,
                      borderColor: paymentMode === mode ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: paymentMode === mode ? colors.primary : colors.foreground,
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
              value={paymentNotes}
              onChangeText={setPaymentNotes}
              placeholder={t('partyPaymentNotesPlaceholder')}
            />
          </ScrollView>

          <View style={[styles.unifiedFooter, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <TouchableOpacity onPress={() => setIsPaymentModalOpen(false)} activeOpacity={0.7} style={[styles.unifiedCancelBtn, { borderColor: colors.destructive }]}>
              <Text style={{ color: colors.destructive, fontWeight: '700', fontSize: ms(15) }}>✕ {t('cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePaymentSubmit} activeOpacity={0.7} disabled={submitting} style={[styles.unifiedSaveBtn, { backgroundColor: colors.primary, shadowColor: colors.primary, opacity: submitting ? 0.6 : 1 }]}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: ms(16) }}>{submitting ? '...' : `✓ ${t('save')}`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Default Parties List View
  const totalPayable = partiesList.reduce((s, p) => { const net = p.totalDebit - p.totalCredit; return net > 0 ? s + net : s; }, 0);
  const totalReceivable = partiesList.reduce((s, p) => { const net = p.totalDebit - p.totalCredit; return net < 0 ? s + Math.abs(net) : s; }, 0);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filteredParties}
        keyExtractor={(p) => p.name}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.headingIcon, { backgroundColor: '#E0E7FF' }]}>
                <Users color="#4F46E5" size={20} />
              </View>
              <Text style={{ color: colors.foreground, fontSize: ms(16), fontWeight: '700' }}>
                {t('partyLedgersTitle')}
              </Text>
            </View>

            {/* Overview KPIs */}
            <View style={[styles.kpiTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('totalParties')}</Text>
                <Text style={[styles.kpiVal, { color: colors.foreground }]}>{toNative(partiesList.length)}</Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('payableDr')}</Text>
                <Text style={[styles.kpiVal, { color: '#DC2626' }]} numberOfLines={1}>{fmt(totalPayable)}</Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: colors.border }]} />
              <View style={styles.kpiCol}>
                <Text style={[styles.kpiLabel, { color: colors.mutedFg }]}>{t('receivableCr')}</Text>
                <Text style={[styles.kpiVal, { color: '#16A34A' }]} numberOfLines={1}>{fmt(totalReceivable)}</Text>
              </View>
            </View>

            {/* Search Box */}
            <View style={[styles.searchBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Search color={colors.mutedFg} size={16} />
              <TextInput
                placeholder={t('searchPartyPlaceholder')}
                placeholderTextColor={colors.mutedFg}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: colors.foreground }]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X color={colors.mutedFg} size={16} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Users color={colors.mutedFg} size={36} />
            <Text style={{ color: colors.mutedFg, marginTop: 10, fontSize: ms(13), fontWeight: '600' }}>
              {t('noPartiesFound')}
            </Text>
          </View>
        }
        renderItem={({ item: party }) => {
          const netBal = party.totalDebit - party.totalCredit; // >0 means farmer owes party
          return (
            <TouchableOpacity
              onPress={() => setSelectedPartyName(party.name)}
              activeOpacity={0.7}
            >
              <Card style={{ marginTop: 8 }} padding={12}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: ms(14) }}>
                      {party.name}
                    </Text>
                    <Text style={{ color: colors.mutedFg, fontSize: ms(12), marginTop: 2 }}>
                      {toNative(party.txCount)} {t('transactionsCount')}
                      {party.phone ? ` • 📞 ${party.phone}` : ''}
                      {party.lastDate ? ` • ${fmtDMY(party.lastDate)}` : ''}
                    </Text>
                    {party.pendingCreditDue > 0 && (
                      <Text style={{ color: colors.warning, fontSize: ms(12), fontWeight: '700', marginTop: 2 }}>
                        {t('pendingCreditLabel')} {fmt(party.pendingCreditDue)}
                      </Text>
                    )}
                  </View>

                  <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                    <Text
                      style={{
                        color: netBal > 0 ? colors.destructive : colors.primary,
                        fontWeight: '700',
                        fontSize: ms(15),
                      }}
                    >
                      {fmt(Math.abs(netBal))}
                    </Text>
                    <Badge
                      text={netBal > 0 ? t('payableDr') : t('receivableCr')}
                      variant={netBal > 0 ? 'destructive' : 'success'}
                    />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  duesRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10 },
  kpiTable: { flexDirection: 'row', marginVertical: 12, borderRadius: 12, borderWidth: 1, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
  kpiCol: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  kpiDivider: { width: 1, alignSelf: 'stretch', marginVertical: 2 },
  kpiLabel: { fontSize: ms(11), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  kpiVal: { fontSize: ms(16), fontWeight: '800', marginTop: 4, textAlign: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, height: 40, marginBottom: 8 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: ms(13), height: '100%' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { borderRadius: 16, borderWidth: 1, padding: 18 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: ms(15), fontWeight: '700' },
  typeSwitcher: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  inputLabel: { fontSize: ms(12), fontWeight: '600', marginBottom: 6, marginTop: 4 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeChip: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  unifiedHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1 },
  unifiedTitle: { fontSize: ms(18), fontWeight: '800' },
  unifiedFooter: { flexDirection: 'row', padding: 16, paddingBottom: 34, gap: 12, borderTopWidth: 1 },
  unifiedCancelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  unifiedSaveBtn: { flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
});
