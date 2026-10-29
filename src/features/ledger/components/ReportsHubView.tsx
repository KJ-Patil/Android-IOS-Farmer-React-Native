import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  ScrollView,
} from 'react-native';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../app/providers/ThemeProvider';
import { useLedgerStore } from '../../../shared/hooks/useLedgerStore';
import { useInventoryStore } from '../../../shared/hooks/useInventoryStore';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { DatePickerInput } from '../../../components/ui/DatePickerInput';
import { CSV_BOM, tCategory, tPaymentMode } from '../../../shared/utils/helpers';
import { useLocalizedFormat } from '../../../shared/hooks/useLocalizedFormat';
import type { Transaction } from '../../../shared/types/ledger';
import {
  FileText,
  Download,
  Share2,
  BookOpen,
  Landmark,
  ExternalLink,
  Sparkles,
  Sprout,
  Milk,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Calendar,
} from 'lucide-react-native';

type ReportKey =
  | 'ledger'
  | 'cash_book'
  | 'bank_book'
  | 'profit_loss'
  | 'plot_report'
  | 'crop_report'
  | 'dairy_report'
  | 'income_report'
  | 'expense_report'
  | 'party_loan_report'
  | 'input_stock';

interface ReportDef {
  key: ReportKey;
  labelKey: string;
  descKey: string;
}

const REPORT_TABS: ReportDef[] = [
  { key: 'ledger', labelKey: 'report_ledger', descKey: 'report_ledger_desc' },
  { key: 'cash_book', labelKey: 'report_cash_book', descKey: 'report_cash_book_desc' },
  { key: 'bank_book', labelKey: 'report_bank_book', descKey: 'report_bank_book_desc' },
  { key: 'profit_loss', labelKey: 'report_profit_loss', descKey: 'report_profit_loss_desc' },
  { key: 'plot_report', labelKey: 'report_plot_report', descKey: 'report_plot_report_desc' },
  { key: 'crop_report', labelKey: 'report_crop_report', descKey: 'report_crop_report_desc' },
  { key: 'dairy_report', labelKey: 'report_dairy_report', descKey: 'report_dairy_report_desc' },
  { key: 'income_report', labelKey: 'report_income_report', descKey: 'report_income_report_desc' },
  { key: 'expense_report', labelKey: 'report_expense_report', descKey: 'report_expense_report_desc' },
  { key: 'party_loan_report', labelKey: 'report_party_loan_report', descKey: 'report_party_loan_report_desc' },
  { key: 'input_stock', labelKey: 'report_input_stock', descKey: 'report_input_stock_desc' },
];

export function ReportsHubView() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { transactions } = useLedgerStore();
  const { items: inventoryItems, consumptions: inventoryConsumptions } = useInventoryStore();
  const { fmtCurrency, toNative, fmtDMY } = useLocalizedFormat();

  const [selectedReport, setSelectedReport] = useState<ReportKey>('ledger');

  // Date filters: default 1st of current month to today
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Filtered transactions for selected report
  const filteredData = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = tx.date || '';
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;

      switch (selectedReport) {
        case 'cash_book':
          return tx.paymentMode === 'cash';
        case 'bank_book':
          return tx.paymentMode === 'bank' || tx.paymentMode === 'upi' || tx.paymentMode === 'cheque';
        case 'profit_loss':
          return true;
        case 'plot_report':
          return !!tx.plotId || !!tx.plotName;
        case 'crop_report':
          return !!tx.cropId || !!tx.cropName;
        case 'dairy_report':
          return (
            tx.ledgerType === 'dairy' ||
            tx.incomeCategory === 'dairy' ||
            (tx.category && (tx.category.startsWith('dairy_') || tx.category.includes('दूध')))
          );
        case 'income_report':
          return tx.type === 'income';
        case 'expense_report':
          return tx.type === 'expense';
        case 'party_loan_report':
          return tx.ledgerType === 'party' || !!tx.partyName || tx.incomeCategory === 'loan';
        case 'input_stock':
        case 'ledger':
        default:
          return true;
      }
    });
  }, [transactions, selectedReport, startDate, endDate]);

  // Summary KPIs
  const summary = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    filteredData.forEach((tx) => {
      const amt = tx.amount || 0;
      if (tx.type === 'income') totalIn += amt;
      else totalOut += amt;
    });

    return {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
      count: filteredData.length,
    };
  }, [filteredData]);

  // CSV Generator
  const generateCSV = (): string => {
    if (selectedReport === 'input_stock') {
      const header = 'Item Name,Category,Current Stock,Unit,Purchase Rate (₹),Total Valuation (₹),Status';
      const rows = inventoryItems.map((item) =>
        [
          item.name,
          tCategory(item.category || item.type, t),
          item.currentStock,
          item.unit,
          item.purchaseRate,
          item.currentStock * item.purchaseRate,
          item.currentStock <= (item.minStockThreshold || 5) ? t('lowStock') : t('available'),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      );
      return CSV_BOM + header + '\n' + rows.join('\n');
    }

    const header = 'Date,Type,Category,Amount (₹),Payment Mode,Party Name,Plot,Crop,Bill Number,Notes';
    const rows = filteredData.map((tx) =>
      [
        tx.date,
        tx.type === 'income' ? t('income') : t('expenses'),
        tCategory(tx.category, t),
        tx.amount,
        tPaymentMode(tx.paymentMode, t),
        tx.partyName || '',
        tx.plotName || '',
        tx.cropName || '',
        tx.billNumber || '',
        tx.notes || '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );

    return CSV_BOM + header + '\n' + rows.join('\n');
  };

  // Cross-Platform Export Handler
  const handleCSVExport = async () => {
    try {
      const csv = generateCSV();
      const currentTabDef = REPORT_TABS.find((t) => t.key === selectedReport);
      const title = currentTabDef ? t(currentTabDef.labelKey) : 'Report';
      const fileName = `${title.replace(/[^a-zA-Z0-9_]/g, '_')}_${startDate}_to_${endDate}.csv`;

      if (Platform.OS === 'web') {
        // Web standard blob trigger
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      // Native mobile file system
      const file = new File(Paths.cache, fileName);
      await file.write(csv);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: title,
        });
      }
    } catch (err: any) {
      Alert.alert(t('exportError'), err.message);
    }
  };

  // WhatsApp Share Handler
  const handleWhatsAppShare = () => {
    const currentTabDef = REPORT_TABS.find((tab) => tab.key === selectedReport);
    const title = t(currentTabDef?.labelKey || 'reportsExport');

    let text = `📊 *${title}*\n`;
    text += `📅 ${startDate} - ${endDate}\n`;
    text += `🟢 ${t('totalInflow')}: ${fmt(summary.totalIn)}\n`;
    text += `🔴 ${t('totalOutflow')}: ${fmt(summary.totalOut)}\n`;
    text += `⚖️ ${t('netBalance')}: ${fmt(summary.net)}\n\n`;

    filteredData.slice(0, 10).forEach((tx) => {
      text += `• ${fmtDMY(tx.date)}: ${tCategory(tx.category, t)} ${tx.type === 'income' ? '+' : '-'}${fmtCurrency(tx.amount)} (${tPaymentMode(tx.paymentMode, t)})\n`;
    });

    if (filteredData.length > 10) {
      text += `...+${toNative(filteredData.length - 10)}\n`;
    }

    Share.share({ message: text });
  };

  const fmt = (v: number) => fmtCurrency(Math.round(v));

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ paddingTop: 8 }}>
            {/* Summary Card */}
            <Card style={{ borderRadius: 16 }} padding={16}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <View style={[styles.summaryIcon, { backgroundColor: '#DBEAFE' }]}>
                  <FileText color="#2563EB" size={20} />
                </View>
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '700' }}>
                  {t('reportsHubTitle')}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: colors.mutedFg, fontSize: 11 }}>{t('totalInflow')}</Text>
                  <Text style={{ color: '#16A34A', fontSize: 16, fontWeight: '800' }}>{fmt(summary.totalIn)}</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: colors.mutedFg, fontSize: 11 }}>{t('totalOutflow')}</Text>
                  <Text style={{ color: '#DC2626', fontSize: 16, fontWeight: '800' }}>{fmt(summary.totalOut)}</Text>
                </View>
                <View style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: colors.mutedFg, fontSize: 11 }}>{t('netBalance')}</Text>
                  <Text style={{ color: summary.net >= 0 ? '#16A34A' : '#DC2626', fontSize: 16, fontWeight: '800' }}>
                    {summary.net < 0 ? '-' : ''}{fmt(Math.abs(summary.net))}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity onPress={handleCSVExport} style={[styles.exportBtn, { backgroundColor: '#DC2626' }]} activeOpacity={0.8}>
                  <Download color="#FFFFFF" size={16} />
                  <Text style={styles.exportBtnText}>{t('downloadCsv')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleWhatsAppShare} style={[styles.exportBtn, { backgroundColor: '#25D366' }]} activeOpacity={0.8}>
                  <Share2 color="#FFFFFF" size={16} />
                  <Text style={styles.exportBtnText}>{t('shareWhatsapp')}</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* Report Type Selector */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, marginBottom: 10 }}>
              {REPORT_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setSelectedReport(tab.key)}
                  style={[
                    styles.reportTab,
                    {
                      backgroundColor: selectedReport === tab.key ? colors.primary + '15' : colors.card,
                      borderColor: selectedReport === tab.key ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: selectedReport === tab.key ? colors.primary : colors.mutedFg,
                      fontWeight: '700',
                      fontSize: 12,
                    }}
                  >
                    {t(tab.labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Date Range — compact inline */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <DatePickerInput label={t('fromLabel')} value={startDate} onChange={setStartDate} />
              </View>
              <View style={{ flex: 1 }}>
                <DatePickerInput label={t('toLabel')} value={endDate} onChange={setEndDate} />
              </View>
            </View>

            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '700', marginBottom: 6 }}>
              {t('reportRecordsPreview')} ({toNative(filteredData.length)})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <FileText color={colors.mutedFg} size={36} />
            <Text style={{ color: colors.mutedFg, marginTop: 10, fontSize: 13, fontWeight: '600' }}>
              {t('noRecordsFound')}
            </Text>
          </View>
        }
        renderItem={({ item: tx }) => (
          <Card style={{ marginTop: 6 }} padding={12}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 13 }}>
                    {tCategory(tx.category, t)}
                  </Text>
                  <Badge
                    text={tPaymentMode(tx.paymentMode, t)}
                    variant={tx.type === 'income' ? 'success' : 'default'}
                  />
                  {tx.billNumber && <Badge text={`#${tx.billNumber}`} variant="default" />}
                </View>
                <Text style={{ color: colors.mutedFg, fontSize: 13, marginTop: 2 }}>
                  {fmtDMY(tx.date)}
                  {tx.partyName ? ` • ${tx.partyName}` : ''}
                  {tx.cropName ? ` • ${t(tx.cropName)}` : ''}
                </Text>
              </View>

              <Text
                style={{
                  color: tx.type === 'income' ? colors.primary : colors.destructive,
                  fontWeight: '800',
                  fontSize: 14,
                  marginLeft: 10,
                }}
              >
                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
              </Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  summaryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reportTab: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderRadius: 10, marginRight: 8 },
  actionRow: { flexDirection: 'row', gap: 10 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  exportBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
