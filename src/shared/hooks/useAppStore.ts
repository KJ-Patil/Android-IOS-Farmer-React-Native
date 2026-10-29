import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';

interface AppStore {
  isOnline: boolean;
  syncQueueCount: number;
  setOnline: (online: boolean) => void;
  incrementSyncQueue: () => void;
  decrementSyncQueue: () => void;
  initNetworkListener: () => () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  isOnline: true,
  syncQueueCount: 0,

  setOnline: (online: boolean) => set({ isOnline: online }),

  incrementSyncQueue: () => set((s) => ({ syncQueueCount: s.syncQueueCount + 1 })),

  decrementSyncQueue: () =>
    set((s) => ({ syncQueueCount: Math.max(0, s.syncQueueCount - 1) })),

  initNetworkListener: () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      set({ isOnline: state.isConnected ?? true });
    });
    return unsubscribe;
  },
}));
