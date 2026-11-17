import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';

export interface ParsedBillData {
  shopName?: string;
  billNumber?: string;
  date?: string;
  amount?: number;
  gstAmount?: number;
  items?: string;
  confidence: number;
}

const DEVANAGARI_DIGIT_MAP: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

function normalizeDigits(text: string): string {
  return text.replace(/[०-९]/g, (ch) => DEVANAGARI_DIGIT_MAP[ch] || ch);
}

function getScriptForLanguage(langCode: string): TextRecognitionScript {
  if (langCode === 'hi' || langCode === 'mr') return TextRecognitionScript.DEVANAGARI;
  return TextRecognitionScript.LATIN;
}

export async function recognizeText(imageUri: string, appLanguage?: string): Promise<string> {
  const primaryScript = appLanguage ? getScriptForLanguage(appLanguage) : TextRecognitionScript.LATIN;

  const primaryResult = await TextRecognition.recognize(imageUri, primaryScript);
  let text = primaryResult.text;

  // For non-Devanagari Indian languages, bills may still have Hindi text.
  // Run a second Devanagari pass if the primary Latin pass found very little.
  if (primaryScript === TextRecognitionScript.LATIN && text.length < 30) {
    try {
      const devResult = await TextRecognition.recognize(imageUri, TextRecognitionScript.DEVANAGARI);
      if (devResult.text.length > text.length) {
        text = devResult.text;
      }
    } catch {}
  }

  // For Devanagari primary, also try Latin if no numbers were found
  if (primaryScript === TextRecognitionScript.DEVANAGARI && !/\d/.test(text)) {
    try {
      const latinResult = await TextRecognition.recognize(imageUri, TextRecognitionScript.LATIN);
      if (/\d/.test(latinResult.text)) {
        text = text + '\n' + latinResult.text;
      }
    } catch {}
  }

  return text;
}

export function parseBillData(rawText: string): ParsedBillData {
  const normalized = normalizeDigits(rawText);
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  const result: ParsedBillData = { confidence: 0 };
  let matchCount = 0;
  const totalFields = 6;

  // --- Shop name ---
  const skipPattern = /^(\d|gst|bill|invoice|receipt|date|total|rs|₹|ph|mob|tel|fax|दिनांक|बिल|कुल|रसीद)/i;
  for (const line of lines) {
    if (!skipPattern.test(line) && line.length >= 3 && line.length <= 60) {
      result.shopName = line;
      matchCount++;
      break;
    }
  }

  // --- Bill / Invoice number ---
  const billPatterns = [
    /(?:bill|invoice|receipt|memo|voucher|challan|token|बिल|रसीद|पावती)\s*(?:no|number|#|num|नं|क्र)?[\s.:# -]*([A-Za-z0-9/\-]+)/i,
    /(?:no|#)[\s.:]*\s*([A-Za-z]{1,5}[\-/][A-Za-z0-9/\-]+)/i,
    /\b([A-Z]{2,5}[\-/]\d{2,}[\-/]?\d*)\b/,
  ];
  for (const pat of billPatterns) {
    const m = normalized.match(pat);
    if (m) {
      result.billNumber = m[1].trim();
      matchCount++;
      break;
    }
  }

  // --- Date ---
  const datePatterns = [
    /(?:date|dt|dated|दिनांक|तारीख)?[\s.:]*(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})/i,
    /(\d{4})-(\d{2})-(\d{2})/,
  ];
  for (const pat of datePatterns) {
    const m = normalized.match(pat);
    if (m) {
      if (m[1].length === 4) {
        result.date = `${m[1]}-${m[2]}-${m[3]}`;
      } else {
        const year = m[3].length === 2 ? `20${m[3]}` : m[3];
        result.date = `${year}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      }
      matchCount++;
      break;
    }
  }

  // --- Amount ---
  const amountPatterns: { pattern: RegExp; priority: number }[] = [
    { pattern: /grand\s*total[\s.:₹]*(?:rs\.?\s*)?([0-9,]+\.?\d*)/i, priority: 5 },
    { pattern: /(?:कुल\s*(?:योग|रक्कम|रकम)|एकूण)[\s.:₹]*(?:rs\.?\s*)?([0-9,]+\.?\d*)/i, priority: 5 },
    { pattern: /net\s*(?:amount|total|payable)[\s.:₹]*(?:rs\.?\s*)?([0-9,]+\.?\d*)/i, priority: 4 },
    { pattern: /(?:total\s*amount|final\s*amount|amount\s*payable)[\s.:₹]*(?:rs\.?\s*)?([0-9,]+\.?\d*)/i, priority: 3 },
    { pattern: /total[\s.:₹]*(?:rs\.?\s*)?([0-9,]+\.?\d*)/i, priority: 2 },
    { pattern: /(?:rs\.?|₹|रु\.?)\s*([0-9,]+\.?\d*)/i, priority: 1 },
  ];

  let bestAmount = 0;
  let bestPriority = 0;
  for (const { pattern, priority } of amountPatterns) {
    const globalPat = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let match;
    while ((match = globalPat.exec(normalized)) !== null) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      if (val > 0 && (priority > bestPriority || (priority === bestPriority && val > bestAmount))) {
        bestAmount = val;
        bestPriority = priority;
      }
    }
  }
  if (bestAmount > 0) {
    result.amount = bestAmount;
    matchCount++;
  }

  // --- GST / Tax ---
  let totalGst = 0;
  let gstFound = false;

  const combinedGst = normalized.match(/(?:total\s*)?(?:gst|tax|कर)\s*(?:amount)?[\s.:₹]*(?:rs\.?\s*)?([0-9,]+\.?\d*)/i);
  if (combinedGst) {
    totalGst = parseFloat(combinedGst[1].replace(/,/g, ''));
    gstFound = true;
  } else {
    const cgstMatches = [...normalized.matchAll(/cgst\s*[\d.]*%?[\s.:₹]*(?:rs\.?\s*)?([0-9,]+\.?\d*)/gi)];
    const sgstMatches = [...normalized.matchAll(/sgst\s*[\d.]*%?[\s.:₹]*(?:rs\.?\s*)?([0-9,]+\.?\d*)/gi)];
    for (const m of cgstMatches) totalGst += parseFloat(m[1].replace(/,/g, ''));
    for (const m of sgstMatches) totalGst += parseFloat(m[1].replace(/,/g, ''));
    if (totalGst > 0) gstFound = true;
  }
  if (gstFound && totalGst > 0) {
    result.gstAmount = Math.round(totalGst * 100) / 100;
    matchCount++;
  }

  // --- Items ---
  const itemLines = lines.filter((l) => {
    const ln = normalizeDigits(l);
    if (/\d+\s*[xX×]\s*[\d,]+/.test(ln)) return true;
    if (/[\d,]+\.\d{2}\s*$/.test(ln)) return true;
    if (/\d+\s*(?:qty|nos|pcs|kg|ltr|ml|gm|bag|packet|नग|किलो|लिटर)/i.test(ln) && /[\d,]+\.?\d*\s*$/.test(ln)) return true;
    return false;
  });
  const totalKeywords = /^(sub\s*total|total|grand|net|cgst|sgst|igst|gst|tax|discount|round|कुल|एकूण|सूट)/i;
  const filteredItems = itemLines.filter((l) => !totalKeywords.test(normalizeDigits(l)));
  if (filteredItems.length > 0) {
    result.items = filteredItems.join('; ');
    matchCount++;
  }

  result.confidence = Math.min(100, Math.round((matchCount / totalFields) * 100));
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
  {
    name: 'कृषी सेवा केंद्र (Marathi)',
    text: `कृषी सेवा केंद्र
पिंपळगाव, जि. नाशिक
बिल नं: KSK/५६७८
दिनांक: २०/०७/२०२४

युरिया ५० किलो     २ x २६७.००    ५३४.००
DAP ५० किलो        १ x १३५०.००  १३५०.००

कुल योग: रु. १८८४.००
GST ५%:               ९४.२०
एकूण: रु. १९७८.२०`,
  },
];
