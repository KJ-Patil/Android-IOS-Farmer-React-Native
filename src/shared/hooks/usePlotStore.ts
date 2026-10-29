import { create } from 'zustand';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { Plot, Crop } from '../types/plot';
import { useAuthStore } from './useAuthStore';
import { logger } from '../services/logger';

interface PlotStore {
  plots: Plot[];
  crops: Record<string, Crop[]>;
  isLoading: boolean;

  fetchPlots: () => Promise<void>;
  fetchCrops: (plotId: string) => Promise<void>;
  createPlot: (plot: Partial<Plot>) => Promise<string>;
  updatePlot: (id: string, updates: Partial<Plot>) => Promise<void>;
  deletePlot: (id: string) => Promise<void>;
  createCrop: (plotId: string, crop: Partial<Crop>) => Promise<string>;
  updateCrop: (plotId: string, cropId: string, updates: Partial<Crop>) => Promise<void>;
  deleteCrop: (plotId: string, cropId: string) => Promise<void>;
  getPlotRemainingArea: (plotId: string) => number;
  isDuplicateGatNumber: (gatNumber: string, excludeId?: string) => boolean;
}

function getUserMobile(): string {
  const user = useAuthStore.getState().user;
  if (!user) throw new Error('User not authenticated');
  return user.mobileNumber;
}

function getPlotsRef() {
  return collection(db, 'users', getUserMobile(), 'plots');
}

function getCropsRef(plotId: string) {
  return collection(db, 'users', getUserMobile(), 'plots', plotId, 'crops');
}

export const usePlotStore = create<PlotStore>((set, get) => ({
  plots: [],
  crops: {},
  isLoading: false,

  fetchPlots: async () => {
    set({ isLoading: true });
    try {
      const snap = await getDocs(getPlotsRef());
      const plots = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          geoLocation: data.location
            ? { lat: data.location.latitude, lng: data.location.longitude }
            : data.geoLocation,
        } as Plot;
      });
      plots.sort((a: any, b: any) => {
        const tA = new Date(a.timestamp || a.createdAt?.toDate?.() || a.createdAt || 0).getTime();
        const tB = new Date(b.timestamp || b.createdAt?.toDate?.() || b.createdAt || 0).getTime();
        return tB - tA;
      });
      set({ plots, isLoading: false });
    } catch (err) {
      logger.error('fetchPlots error:', err);
      set({ isLoading: false });
    }
  },

  fetchCrops: async (plotId: string) => {
    try {
      const snap = await getDocs(getCropsRef(plotId));
      const cropsList = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          plotId,
          ...data,
        } as Crop;
      });
      cropsList.sort((a: any, b: any) => {
        const tA = new Date(a.timestamp || a.createdAt?.toDate?.() || a.createdAt || a.sowingDate || 0).getTime();
        const tB = new Date(b.timestamp || b.createdAt?.toDate?.() || b.createdAt || b.sowingDate || 0).getTime();
        return tB - tA;
      });
      set((s) => ({ crops: { ...s.crops, [plotId]: cropsList } }));
    } catch (err) {
      logger.error('fetchCrops error:', err);
    }
  },

  createPlot: async (plot: Partial<Plot>) => {
    if (plot.gatNumber && get().isDuplicateGatNumber(plot.gatNumber)) {
      throw new Error('Gat number already exists');
    }
    const now = Timestamp.now();
    const isoString = new Date().toISOString();
    const data: Record<string, any> = {
      ...plot,
      timestamp: isoString,
      createdAt: now,
      updatedAt: now,
    };
    if (plot.geoLocation) {
      data.location = { latitude: plot.geoLocation.lat, longitude: plot.geoLocation.lng, address: 'Plot GPS', accuracy: 15 };
    }
    const docRef = await addDoc(getPlotsRef(), data);
    const newPlot = { id: docRef.id, ...data } as Plot;
    set((s) => ({ plots: [newPlot, ...s.plots] }));
    return docRef.id;
  },

  updatePlot: async (id: string, updates: Partial<Plot>) => {
    if (updates.gatNumber && get().isDuplicateGatNumber(updates.gatNumber, id)) {
      throw new Error('Gat number already exists');
    }
    const updateData = { ...updates, updatedAt: Timestamp.now() };
    await updateDoc(doc(getPlotsRef(), id), updateData);
    set((s) => ({
      plots: s.plots.map((p) => (p.id === id ? { ...p, ...updateData } as Plot : p)),
    }));
  },

  deletePlot: async (id: string) => {
    await deleteDoc(doc(getPlotsRef(), id));
    set((s) => {
      const { [id]: _, ...remainingCrops } = s.crops;
      return { plots: s.plots.filter((p) => p.id !== id), crops: remainingCrops };
    });
  },

  createCrop: async (plotId: string, crop: Partial<Crop>) => {
    const remaining = get().getPlotRemainingArea(plotId);
    if (crop.area && crop.area > remaining) {
      throw new Error('Crop area exceeds remaining plot area');
    }
    const now = Timestamp.now();
    const isoString = new Date().toISOString();
    const data = {
      ...crop,
      plotId,
      status: crop.status || 'sown',
      timestamp: isoString,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(getCropsRef(plotId), data);
    const newCrop = { id: docRef.id, ...data } as Crop;
    set((s) => ({
      crops: { ...s.crops, [plotId]: [newCrop, ...(s.crops[plotId] || [])] },
    }));
    return docRef.id;
  },

  updateCrop: async (plotId: string, cropId: string, updates: Partial<Crop>) => {
    const crop = (get().crops[plotId] || []).find((c) => c.id === cropId);
    if (!crop) return;

    // Enforce sequential status advancement
    if (updates.status) {
      const statusOrder = ['sown', 'vegetative', 'flowering', 'harvested', 'completed'];
      const currentIdx = statusOrder.indexOf(crop.status);
      const newIdx = statusOrder.indexOf(updates.status);
      if (newIdx < currentIdx) {
        throw new Error('Crop status can only advance forward');
      }
    }

    // Harvest date validation
    if (updates.actualHarvestDate && crop.sowingDate) {
      if (new Date(updates.actualHarvestDate) <= new Date(crop.sowingDate)) {
        throw new Error('Harvest date must be after sowing date');
      }
    }

    // Lock crop when harvested/completed
    if (updates.status === 'harvested' || updates.status === 'completed') {
      updates.isLocked = true;
    }

    const updateData = { ...updates, updatedAt: Timestamp.now() };
    await updateDoc(doc(getCropsRef(plotId), cropId), updateData);
    set((s) => ({
      crops: {
        ...s.crops,
        [plotId]: (s.crops[plotId] || []).map((c) =>
          c.id === cropId ? { ...c, ...updateData } as Crop : c
        ),
      },
    }));
  },

  deleteCrop: async (plotId: string, cropId: string) => {
    await deleteDoc(doc(getCropsRef(plotId), cropId));
    set((s) => ({
      crops: {
        ...s.crops,
        [plotId]: (s.crops[plotId] || []).filter((c) => c.id !== cropId),
      },
    }));
  },

  getPlotRemainingArea: (plotId: string) => {
    const plot = get().plots.find((p) => p.id === plotId);
    if (!plot) return 0;
    const plotCrops = get().crops[plotId] || [];
    const usedArea = plotCrops.reduce((sum, c) => sum + (c.area || 0), 0);
    return plot.area - usedArea;
  },

  isDuplicateGatNumber: (gatNumber: string, excludeId?: string) => {
    return get().plots.some(
      (p) => p.gatNumber === gatNumber && p.id !== excludeId
    );
  },
}));
