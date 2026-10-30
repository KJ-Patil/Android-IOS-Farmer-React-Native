import { create } from 'zustand';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuthStore } from './useAuthStore';
import { logger } from '../services/logger';

export type FarmType = 'dairy' | 'goat' | 'poultry' | 'fishery' | 'piggery' | 'sericulture' | 'apiary' | 'other';

export interface NotebookFarm {
  id: string;
  name: string;
  type: FarmType;
  animalCount?: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface NotebookFarmStore {
  farms: NotebookFarm[];
  isLoading: boolean;
  fetchFarms: () => Promise<void>;
  createFarm: (farm: { name: string; type: FarmType; animalCount?: number; notes?: string }) => Promise<void>;
  updateFarm: (id: string, updates: { animalCount?: number; name?: string }) => Promise<void>;
  deleteFarm: (id: string) => Promise<void>;
}

function getUserMobile(): string {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('User not authenticated');
  return user.mobileNumber;
}

function getFarmsRef() {
  return collection(db, 'users', getUserMobile(), 'notebook_farms');
}

export const useNotebookFarmStore = create<NotebookFarmStore>((set, get) => ({
  farms: [],
  isLoading: false,

  fetchFarms: async () => {
    set({ isLoading: true });
    try {
      const snap = await getDocs(getFarmsRef());
      const farms = snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotebookFarm));
      set({ farms, isLoading: false });
    } catch (err) {
      logger.error('fetchFarms error:', err);
      set({ isLoading: false });
    }
  },

  createFarm: async (farm) => {
    try {
      const now = Timestamp.now();
      const data: Record<string, any> = { name: farm.name, type: farm.type, createdAt: now, updatedAt: now };
      if (farm.animalCount) data.animalCount = farm.animalCount;
      if (farm.notes) data.notes = farm.notes;
      const docRef = await addDoc(getFarmsRef(), data);
      set((s) => ({ farms: [...s.farms, { id: docRef.id, ...data } as NotebookFarm] }));
    } catch (err) {
      logger.error('createFarm error:', err);
      throw err;
    }
  },

  updateFarm: async (id, updates) => {
    try {
      const data: Record<string, any> = { updatedAt: Timestamp.now() };
      if (updates.animalCount !== undefined) data.animalCount = updates.animalCount;
      if (updates.name) data.name = updates.name;
      await updateDoc(doc(getFarmsRef(), id), data);
      set((s) => ({
        farms: s.farms.map((f) => (f.id === id ? { ...f, ...data } as NotebookFarm : f)),
      }));
    } catch (err) {
      logger.error('updateFarm error:', err);
      throw err;
    }
  },

  deleteFarm: async (id: string) => {
    await deleteDoc(doc(getFarmsRef(), id));
    set((s) => ({ farms: s.farms.filter((f) => f.id !== id) }));
  },
}));
