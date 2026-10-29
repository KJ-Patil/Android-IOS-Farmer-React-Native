import { useTranslation } from 'react-i18next';
import { toNativeDigits, formatCurrency, formatNumber, formatDate, fmtDMY } from '../utils/helpers';

export function useLocalizedFormat() {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  return {
    fmtCurrency: (amount: number) => formatCurrency(amount, lang),
    fmtNum: (value: number) => formatNumber(value, lang),
    fmtDate: (dateStr: string) => formatDate(dateStr, lang),
    fmtDMY: (dateStr: string | undefined) => {
      const result = fmtDMY(dateStr);
      return toNativeDigits(result, lang);
    },
    toNative: (value: string | number) => toNativeDigits(value, lang),
  };
}
