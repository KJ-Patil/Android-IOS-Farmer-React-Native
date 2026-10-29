import { Timestamp } from 'firebase/firestore';

export type SoilType = 'black' | 'medium' | 'light';
export type AreaUnit = 'acre' | 'hectare' | 'guntha';
export type Season = 'kharif' | 'rabi' | 'zaid';
export type CropStatus = 'sown' | 'vegetative' | 'flowering' | 'harvested' | 'running' | 'completed';

export interface Plot {
  id: string;
  name: string;
  gatNumber: string;
  area: number;
  areaUnit: AreaUnit;
  soilType: SoilType;
  irrigationType: string;
  waterAvailability: 'perennial' | 'seasonal';
  geoLocation?: { lat: number; lng: number };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Crop {
  id: string;
  plotId: string;
  cropType: string;
  variety: string;
  area: number;
  areaUnit: string;
  season: Season;
  sowingDate: string;
  expectedHarvestDate?: string;
  estimatedYield?: number;
  estimatedYieldUnit?: string;
  actualHarvestDate?: string;
  actualYield?: number;
  actualYieldUnit?: string;
  status: CropStatus;
  isLocked?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
