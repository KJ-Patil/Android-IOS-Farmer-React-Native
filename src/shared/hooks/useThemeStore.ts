import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  initializeTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'system',

  toggleTheme: () => {
    const current = get().theme;
    const next: ThemeMode = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
    set({ theme: next });
    AsyncStorage.setItem('farmer_ledger_theme', next);
  },

  setTheme: (theme: ThemeMode) => {
    set({ theme });
    AsyncStorage.setItem('farmer_ledger_theme', theme);
  },

  initializeTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem('farmer_ledger_theme');
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        set({ theme: saved as ThemeMode });
      }
    } catch {}
  },
}));
