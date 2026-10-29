import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import en from './en';
import mr from './mr';
import hi from './hi';
import te from './te';
import ta from './ta';
import kn from './kn';
import bn from './bn';
import gu from './gu';
import ml from './ml';
import pa from './pa';
import od from './od';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'od', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ' },
] as const;

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as readonly string[];

function getDeviceLanguage(): string {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const code = locales[0].languageCode;
      if (code && SUPPORTED_CODES.includes(code)) return code;
      if (code === 'or') return 'od';
    }
  } catch {}
  return 'en';
}

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    try {
      const lang = await AsyncStorage.getItem('farmer_ledger_language');
      if (lang) {
        callback(lang);
      } else {
        const deviceLang = getDeviceLanguage();
        await AsyncStorage.setItem('farmer_ledger_language', deviceLang);
        callback(deviceLang);
      }
    } catch {
      callback(getDeviceLanguage());
    }
  },
  init: () => {},
  cacheUserLanguage: async (lang: string) => {
    try {
      await AsyncStorage.setItem('farmer_ledger_language', lang);
    } catch {}
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      mr: { translation: mr },
      hi: { translation: hi },
      te: { translation: te },
      ta: { translation: ta },
      kn: { translation: kn },
      bn: { translation: bn },
      gu: { translation: gu },
      ml: { translation: ml },
      pa: { translation: pa },
      od: { translation: od },
    },
    fallbackLng: false,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
