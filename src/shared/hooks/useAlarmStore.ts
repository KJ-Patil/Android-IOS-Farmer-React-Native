import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleDailyAlarm,
  cancelDailyAlarm,
  scheduleDailyReminders,
} from '../services/alarmService';

const ALARM_KEY = '@farmer_alarm_enabled';

interface AlarmState {
  isEnabled: boolean;
  isRinging: boolean;
  isInitialized: boolean;
  setRinging: (ringing: boolean) => void;
  toggleAlarm: () => Promise<void>;
  initAlarm: () => Promise<void>;
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  isEnabled: true,
  isRinging: false,
  isInitialized: false,

  setRinging: (ringing: boolean) => set({ isRinging: ringing }),

  toggleAlarm: async () => {
    const current = get().isEnabled;
    const next = !current;
    set({ isEnabled: next });
    await AsyncStorage.setItem(ALARM_KEY, JSON.stringify(next));

    if (next) {
      await scheduleDailyAlarm();
    } else {
      await cancelDailyAlarm();
    }
  },

  initAlarm: async () => {
    try {
      const stored = await AsyncStorage.getItem(ALARM_KEY);
      const enabled = stored === null ? true : JSON.parse(stored);
      set({ isEnabled: enabled, isInitialized: true });

      if (enabled) {
        await scheduleDailyAlarm();
      }
      await scheduleDailyReminders();
    } catch {
      set({ isInitialized: true });
    }
  },
}));
