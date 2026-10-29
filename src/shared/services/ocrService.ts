export interface ParsedBillData {
  shopName?: string;
  billNumber?: string;
  date?: string;
  amount?: number;
  gstAmount?: number;
  items?: string;
  confidence: number;
}

export function parseBillData(rawText: string): ParsedBillData {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const result: ParsedBillData = { confidence: 0 };
  let matchCount = 0;

  // Shop name: usually the first substantial line
  if (lines.length > 0) {
    result.shopName = lines[0];
    matchCount++;
  }

  // Bill number patterns
  const billMatch = rawText.match(/(?:bill|invoice|receipt|no|#)\s*[.:# ]*\s*([A-Za-z0-9/-]+)/i);
  if (billMatch) { result.billNumber = billMatch[1]; matchCount++; }

  // Date patterns
  const dateMatch = rawText.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (dateMatch) {
    const [, d, m, y] = dateMatch;
    const year = y.length === 2 ? `20${y}` : y;
    result.date = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    matchCount++;
  }

  // Amount patterns (Rs, ₹, Total, Grand Total, Net)
  const amountMatches = rawText.match(/(?:total|net|grand\s*total|amount|rs\.?|₹)\s*[.:]*\s*([0-9,]+\.?\d*)/gi);
  if (amountMatches && amountMatches.length > 0) {
    const lastMatch = amountMatches[amountMatches.length - 1];
    const numMatch = lastMatch.match(/([0-9,]+\.?\d*)/);
    if (numMatch) {
      result.amount = parseFloat(numMatch[1].replace(/,/g, ''));
      matchCount++;
    }
  }

  // GST
  const gstMatch = rawText.match(/(?:gst|tax|cgst|sgst|igst)\s*[.:]*\s*([0-9,]+\.?\d*)/i);
  if (gstMatch) {
    result.gstAmount = parseFloat(gstMatch[1].replace(/,/g, ''));
    matchCount++;
  }

  // Items description: lines that look like item entries
  const itemLines = lines.filter((l) => /\d+\s*[xX×]\s*\d/.test(l) || /\d+\.\d{2}$/.test(l));
  if (itemLines.length > 0) {
    result.items = itemLines.join('; ');
    matchCount++;
  }

  result.confidence = Math.min(100, Math.round((matchCount / 5) * 100));
  return result;
}

export const SAMPLE_BILLS = [
  {
    name: 'Kisan Agro Store',
    text: `KISAN AGRO STORE
Nashik Road, Nashik - 422101
GST: 27AABCU1234D1ZM
Bill No: KAS-2024-0456
Date: 15/06/2024

Urea 50kg        2 x 267.00    534.00
DAP 50kg          1 x 1350.00  1350.00
Micronutrient     1 x 450.00    450.00

Subtotal:                      2334.00
CGST 9%:                        210.06
SGST 9%:                        210.06
Grand Total: Rs. 2754.12`,
  },
  {
    name: 'Krushi Seva Kendra',
    text: `KRUSHI SEVA KENDRA
Pimpalgaon, Dist. Nashik
Bill No: KSK/1234
Date: 20/07/2024

Imidacloprid 250ml   2 x 380.00   760.00
Mancozeb 500g        3 x 220.00   660.00
Neem Oil 1L          1 x 350.00   350.00

Total:                            1770.00
GST 5%:                             88.50
Net Amount: Rs. 1858.50`,
  },
  {
    name: 'Shri Balaji Seeds',
    text: `SHRI BALAJI SEEDS & FERTILIZERS
Market Yard, Lasalgaon
Receipt No: SB-789
Date: 01/06/2024

Soybean Seed JS-335    4 x 2800.00    11200.00
Cotton BG-II Packet    2 x 800.00      1600.00

Total Amount: Rs. 12800.00
Discount: 200.00
Grand Total: Rs. 12600`,
  },
];
