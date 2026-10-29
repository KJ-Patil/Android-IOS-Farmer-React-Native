import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Share, Linking } from 'react-native';
import { Transaction } from '../types/ledger';
import { CSV_BOM } from '../utils/helpers';

export async function exportCSV(transactions: Transaction[], filename: string): Promise<void> {
  const header = 'Date,Type,Category,Amount,Payment Mode,Party,Plot,Crop,Bill#,Notes';
  const rows = transactions.map((tx) =>
    [tx.date, tx.type, tx.category, tx.amount, tx.paymentMode, tx.partyName || '', tx.plotName || '', tx.cropName || '', tx.billNumber || '', (tx.notes || '').replace(/"/g, '""')]
      .map((v) => `"${v}"`)
      .join(',')
  );
  const csv = CSV_BOM + header + '\n' + rows.join('\n');
  const file = new File(Paths.cache, `${filename}_${Date.now()}.csv`);
  await file.write(csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: filename });
  }
}

export async function exportPDF(html: string, filename: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: filename });
  }
}

export async function shareOnWhatsApp(text: string): Promise<void> {
  const encoded = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?text=${encoded}`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    await Share.share({ message: text });
  }
}

export async function nativeShare(text: string): Promise<void> {
  await Share.share({ message: text });
}

export function generatePLHtml(data: {
  totalRevenue: number;
  directCosts: number;
  grossProfit: number;
  grossMargin: number;
  indirectCosts: number;
  netProfit: number;
  netMargin: number;
}): string {
  return `
    <html><head><meta charset="utf-8"/><style>
      body { font-family: sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
      th { background: #16A34A; color: white; text-align: left; }
      .positive { color: #16A34A; }
      .negative { color: #EF4444; }
      h1 { color: #16A34A; }
    </style></head><body>
    <h1>FarmerLedger - Profit & Loss Statement</h1>
    <p>Generated: ${new Date().toLocaleDateString('en-IN')}</p>
    <table>
      <tr><th>Particulars</th><th>Amount (₹)</th></tr>
      <tr><td><b>A. Total Revenue</b></td><td class="positive"><b>${data.totalRevenue.toLocaleString('en-IN')}</b></td></tr>
      <tr><td><b>B. Direct Costs</b></td><td class="negative"><b>${data.directCosts.toLocaleString('en-IN')}</b></td></tr>
      <tr><td><b>C. Gross Profit</b></td><td class="${data.grossProfit >= 0 ? 'positive' : 'negative'}"><b>${data.grossProfit.toLocaleString('en-IN')}</b></td></tr>
      <tr><td>Gross Margin</td><td>${data.grossMargin.toFixed(1)}%</td></tr>
      <tr><td><b>D. Indirect Costs</b></td><td class="negative"><b>${data.indirectCosts.toLocaleString('en-IN')}</b></td></tr>
      <tr><td><b>E. Net Farm Profit/Loss</b></td><td class="${data.netProfit >= 0 ? 'positive' : 'negative'}"><b>${data.netProfit.toLocaleString('en-IN')}</b></td></tr>
      <tr><td>Net Margin</td><td>${data.netMargin.toFixed(1)}%</td></tr>
    </table>
    </body></html>`;
}
