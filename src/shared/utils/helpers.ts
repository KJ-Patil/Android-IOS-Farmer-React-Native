const NATIVE_DIGITS: Record<string, string[]> = {
  hi: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'],
  mr: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'],
  bn: ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'],
  te: ['౦', '౧', '౨', '౩', '౪', '౫', '౬', '౭', '౮', '౯'],
  ta: ['௦', '௧', '௨', '௩', '௪', '௫', '௬', '௭', '௮', '௯'],
  kn: ['೦', '೧', '೨', '೩', '೪', '೫', '೬', '೭', '೮', '೯'],
  gu: ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'],
  ml: ['൦', '൧', '൨', '൩', '൪', '൫', '൬', '൭', '൮', '൯'],
  pa: ['੦', '੧', '੨', '੩', '੪', '੫', '੬', '੭', '੮', '੯'],
  od: ['୦', '୧', '୨', '୩', '୪', '୫', '୬', '୭', '୮', '୯'],
};

const LANG_LOCALE: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', te: 'te-IN', ta: 'ta-IN',
  kn: 'kn-IN', bn: 'bn-IN', gu: 'gu-IN', ml: 'ml-IN', pa: 'pa-IN', od: 'or-IN',
};

export const toNativeDigits = (value: string | number, lang: string): string => {
  const str = String(value);
  const digits = NATIVE_DIGITS[lang];
  if (!digits) return str;
  return str.replace(/[0-9]/g, (d) => digits[parseInt(d, 10)]);
};

export const formatCurrency = (amount: number, lang: string = 'en'): string => {
  const formatted = `₹${amount.toLocaleString('en-IN')}`;
  return toNativeDigits(formatted, lang);
};

export const formatNumber = (value: number, lang: string = 'en'): string => {
  return toNativeDigits(value.toLocaleString('en-IN'), lang);
};

export const formatDate = (dateStr: string, lang: string = 'en'): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const locale = LANG_LOCALE[lang] || 'en-IN';
  return toNativeDigits(
    d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }),
    lang,
  );
};

export const fmtDMY = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return dateStr;
};

export const mobileToEmail = (mobile: string): string => {
  return `${mobile}@farmerledger.com`;
};

export const isValidMobile = (mobile: string): boolean => {
  return /^[6-9]\d{9}$/.test(mobile);
};

export const isValidAadhaar = (aadhaar: string): boolean => {
  return /^\d{12}$/.test(aadhaar);
};

export const isValidPincode = (pincode: string): boolean => {
  return /^\d{6}$/.test(pincode);
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

export const isOverdue = (dueDate: string | undefined, pendingAmount: number | undefined): boolean => {
  if (!dueDate || !pendingAmount || pendingAmount <= 0) return false;
  return new Date(dueDate) < new Date();
};

export const calculateNetReceived = (sanctionAmount: number, processingFee: number): number => {
  return sanctionAmount - processingFee;
};

export const CATEGORY_KEY_MAP: Record<string, string> = {
  'Crop Sale': 'cropSale',
  'Dairy Income': 'dairyIncome',
  'Loan Received': 'loanReceived',
  'Direct': 'direct',
};

export const tCategory = (category: string, t: (key: string) => string): string => {
  const key = CATEGORY_KEY_MAP[category] || category;
  const translated = t(key);
  return translated === key ? category : translated;
};

export const tPaymentMode = (mode: string | undefined, t: (key: string) => string): string => {
  const key = (mode || 'cash').toLowerCase();
  return t(key);
};

export const CSV_BOM = '﻿';
