import type { FarmType } from '../hooks/useNotebookFarmStore';

export interface FarmCategoryConfig {
  income: readonly string[];
  expense: readonly string[];
}

const DAIRY_INCOME = ['milkSale', 'gheeSale', 'curdSale', 'paneerSale', 'buttermilkSale', 'calfSale', 'dungManureSale', 'otherDairyIncome'] as const;
const DAIRY_EXPENSE = ['fodder', 'animalFeed', 'vaccination', 'medicines', 'veterinary', 'animalPurchase', 'breeding', 'animalInsurance', 'shedMaintenance', 'equipment', 'milkCollection', 'dairyElectricity', 'dairyLabor', 'dairyTransport', 'otherDairy'] as const;

const GOAT_INCOME = ['kidSale', 'goatMilkSale', 'goatManureSale', 'breedingServiceFee', 'skinHideSale', 'otherGoatIncome'] as const;
const GOAT_EXPENSE = ['goatFeedFodder', 'goatPurchase', 'goatMedicineVaccine', 'goatLabor', 'goatShedMaintenance', 'goatEquipment', 'goatInsurance', 'goatElectricityWater', 'goatTransport', 'otherGoatExpense'] as const;

const POULTRY_INCOME = ['eggSale', 'meatBirdSale', 'poultryManureSale', 'chickSale', 'otherPoultryIncome'] as const;
const POULTRY_EXPENSE = ['poultryFeed', 'chickPurchase', 'poultryMedicineVaccine', 'poultryElectricity', 'poultryLabor', 'poultryShedMaintenance', 'poultryEquipment', 'poultryTransport', 'poultryInsurance', 'otherPoultryExpense'] as const;

const FISHERY_INCOME = ['fishSale', 'fingerlingSeedSale', 'otherFisheryIncome'] as const;
const FISHERY_EXPENSE = ['fishFeed', 'fingerlingPurchase', 'fertiliserLime', 'fishLabor', 'pondLeaseRent', 'fishElectricityDiesel', 'fishMedicine', 'netsEquipment', 'fishTransportMarketing', 'otherFisheryExpense'] as const;

const PIGGERY_INCOME = ['pigletSale', 'porkSale', 'pigManureSale', 'otherPiggeryIncome'] as const;
const PIGGERY_EXPENSE = ['pigFeed', 'pigPurchase', 'pigMedicineVaccine', 'pigLabor', 'pigShedMaintenance', 'pigEquipment', 'pigInsurance', 'pigTransport', 'otherPiggeryExpense'] as const;

const SERICULTURE_INCOME = ['cocoonSale', 'silkYarnSale', 'otherSericultureIncome'] as const;
const SERICULTURE_EXPENSE = ['mulberryLeaves', 'silkwormEggs', 'sericultureLabor', 'sericultureEquipment', 'sericultureMedicine', 'sericultureTransport', 'otherSericultureExpense'] as const;

const APIARY_INCOME = ['honeySale', 'beeswaxSale', 'pollinationServiceFee', 'otherApiaryIncome'] as const;
const APIARY_EXPENSE = ['beeColonyPurchase', 'beeBoxEquipment', 'sugarSyrupFeed', 'apiaryMedicine', 'apiaryLabor', 'apiaryTransport', 'otherApiaryExpense'] as const;

const OTHER_FARM_INCOME = ['farmProductSale', 'otherFarmIncome'] as const;
const OTHER_FARM_EXPENSE = ['farmFeed', 'farmAnimalPurchase', 'farmMedicine', 'farmLabor', 'farmMaintenance', 'farmEquipment', 'farmTransport', 'otherFarmExpense'] as const;

export const FARM_CATEGORIES: Record<FarmType, FarmCategoryConfig> = {
  dairy: { income: DAIRY_INCOME, expense: DAIRY_EXPENSE },
  goat: { income: GOAT_INCOME, expense: GOAT_EXPENSE },
  poultry: { income: POULTRY_INCOME, expense: POULTRY_EXPENSE },
  fishery: { income: FISHERY_INCOME, expense: FISHERY_EXPENSE },
  piggery: { income: PIGGERY_INCOME, expense: PIGGERY_EXPENSE },
  sericulture: { income: SERICULTURE_INCOME, expense: SERICULTURE_EXPENSE },
  apiary: { income: APIARY_INCOME, expense: APIARY_EXPENSE },
  other: { income: OTHER_FARM_INCOME, expense: OTHER_FARM_EXPENSE },
};

export const FARM_CATEGORY_EMOJIS: Record<string, string> = {
  // Dairy Income
  milkSale: '🥛', gheeSale: '🧈', curdSale: '🍶', paneerSale: '🧀', buttermilkSale: '🥛', calfSale: '🐄', dungManureSale: '💩', otherDairyIncome: '🐄',
  // Goat Income
  kidSale: '🐐', goatMilkSale: '🥛', goatManureSale: '💩', breedingServiceFee: '🧬', skinHideSale: '🏷️', otherGoatIncome: '🐐',
  // Poultry Income
  eggSale: '🥚', meatBirdSale: '🍗', poultryManureSale: '💩', chickSale: '🐣', otherPoultryIncome: '🐔',
  // Fishery Income
  fishSale: '🐟', fingerlingSeedSale: '🐠', otherFisheryIncome: '🎣',
  // Piggery Income
  pigletSale: '🐷', porkSale: '🥩', pigManureSale: '💩', otherPiggeryIncome: '🐖',
  // Sericulture Income
  cocoonSale: '🧵', silkYarnSale: '🪡', otherSericultureIncome: '🦋',
  // Apiary Income
  honeySale: '🍯', beeswaxSale: '🕯️', pollinationServiceFee: '🐝', otherApiaryIncome: '🐝',
  // Other Farm Income
  farmProductSale: '🏷️', otherFarmIncome: '🌾',

  // Goat Expense
  goatFeedFodder: '🌾', goatPurchase: '🐐', goatMedicineVaccine: '💊', goatLabor: '👷', goatShedMaintenance: '🏚️', goatEquipment: '⚙️', goatInsurance: '🛡️', goatElectricityWater: '💡', goatTransport: '🚛', otherGoatExpense: '🐐',
  // Poultry Expense
  poultryFeed: '🌽', chickPurchase: '🐣', poultryMedicineVaccine: '💊', poultryElectricity: '⚡', poultryLabor: '👷', poultryShedMaintenance: '🏚️', poultryEquipment: '⚙️', poultryTransport: '🚛', poultryInsurance: '🛡️', otherPoultryExpense: '🐔',
  // Fishery Expense
  fishFeed: '🌽', fingerlingPurchase: '🐠', fertiliserLime: '🧪', fishLabor: '👷', pondLeaseRent: '🏞️', fishElectricityDiesel: '⚡', fishMedicine: '💊', netsEquipment: '🪤', fishTransportMarketing: '🚛', otherFisheryExpense: '🐟',
  // Piggery Expense
  pigFeed: '🌽', pigPurchase: '🐷', pigMedicineVaccine: '💊', pigLabor: '👷', pigShedMaintenance: '🏚️', pigEquipment: '⚙️', pigInsurance: '🛡️', pigTransport: '🚛', otherPiggeryExpense: '🐖',
  // Sericulture Expense
  mulberryLeaves: '🍃', silkwormEggs: '🥚', sericultureLabor: '👷', sericultureEquipment: '⚙️', sericultureMedicine: '💊', sericultureTransport: '🚛', otherSericultureExpense: '🦋',
  // Apiary Expense
  beeColonyPurchase: '🐝', beeBoxEquipment: '📦', sugarSyrupFeed: '🍬', apiaryMedicine: '💊', apiaryLabor: '👷', apiaryTransport: '🚛', otherApiaryExpense: '🐝',
  // Other Farm Expense
  farmFeed: '🌽', farmAnimalPurchase: '🐄', farmMedicine: '💊', farmLabor: '👷', farmMaintenance: '🏚️', farmEquipment: '⚙️', farmTransport: '🚛', otherFarmExpense: '🌾',
};

export function getFarmIncomeCategories(farmType: string): readonly string[] {
  return FARM_CATEGORIES[farmType as FarmType]?.income ?? FARM_CATEGORIES.other.income;
}

export function getFarmExpenseCategories(farmType: string): readonly string[] {
  return FARM_CATEGORIES[farmType as FarmType]?.expense ?? FARM_CATEGORIES.other.expense;
}

export function getFarmCategoryEmoji(key: string): string {
  return FARM_CATEGORY_EMOJIS[key] || '📋';
}
