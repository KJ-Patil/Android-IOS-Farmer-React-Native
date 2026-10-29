import { Timestamp } from 'firebase/firestore';

export type InventoryItemType = 'fertilizer' | 'seed' | 'pesticide' | 'other';

export type InventoryUnit =
  | 'bag'
  | 'kg'
  | 'liter'
  | 'bottle'
  | 'packet'
  | 'nos'
  | string;

export interface InventoryItem {
  id: string;
  name: string;
  nameMr?: string;
  type: InventoryItemType;
  category?: string;
  unit: string;
  purchaseRate: number;
  currentStock: number;
  minStockThreshold?: number;
  totalPurchased?: number;
  totalConsumed?: number;
  totalValue?: number;
  notes?: string;
  isCustom?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface InventoryPurchase {
  id: string;
  itemId: string;
  itemName: string;
  itemType?: InventoryItemType;
  quantity: number;
  unit?: string;
  rate: number;
  totalAmount: number;
  supplierName?: string;
  paymentMode: 'cash' | 'bank' | 'upi' | 'credit' | 'cheque';
  date: string;
  billNumber?: string;
  notes?: string;
  timestamp?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface InventoryConsumption {
  id: string;
  itemId: string;
  itemName: string;
  itemType?: InventoryItemType;
  quantity: number;
  unit?: string;
  rate: number;
  totalAmount?: number;
  totalExpense?: number;
  plotId: string;
  plotName: string;
  cropId?: string;
  cropName?: string;
  cropSeason?: string;
  date: string;
  notes?: string;
  linkedTransactionId?: string;
  timestamp?: any;
  createdAt?: any;
  updatedAt?: any;
}

export const PRELOADED_INVENTORY_MASTER: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Urea (Neem Coated)',
    nameMr: 'युरिया (युरिया खत - 45kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 270,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'नायट्रोजन पुरवठा करणारे मुख्य खत',
    isCustom: false,
  },
  {
    name: 'DAP (18:46:0)',
    nameMr: 'डीएपी (DAP 18:46:0 - 50kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 1350,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'फॉस्फरस व नायट्रोजनयुक्त खत',
    isCustom: false,
  },
  {
    name: 'NPK 10:26:26',
    nameMr: '१०:२६:२६ (NPK 10:26:26 - 50kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 1470,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'कंद व दाणे भरण्यासाठी उत्तम खत',
    isCustom: false,
  },
  {
    name: 'NPK 12:32:16',
    nameMr: '१२:३२:१६ (NPK 12:32:16 - 50kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 1450,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'शेत पिकांसाठी संतुलित खत',
    isCustom: false,
  },
  {
    name: 'MOP Potash (0:0:60)',
    nameMr: 'पोटॅश / एमओपी (0:0:60 - 50kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 1700,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'पिकाची रोगप्रतिकारशक्ती व चमक वाढवते',
    isCustom: false,
  },
  {
    name: 'Single Super Phosphate (SSP)',
    nameMr: 'सिंगल सुपर फॉस्फेट (SSP - 50kg)',
    type: 'fertilizer',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 450,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'फॉस्फरस, सल्फर व कॅल्शियम पुरवठा',
    isCustom: false,
  },
  {
    name: 'Water Soluble 19:19:19',
    nameMr: '१९:१९:१९ (द्राव्य खत - 1kg)',
    type: 'fertilizer',
    unit: 'packet',
    currentStock: 0,
    purchaseRate: 150,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'ठिबक सिंचन व फवारणीसाठी उपयोगी',
    isCustom: false,
  },
  {
    name: 'Micronutrient Mixture',
    nameMr: 'सूक्ष्म अन्नद्रव्ये (ग्रेड २ / लिटर)',
    type: 'fertilizer',
    unit: 'liter',
    currentStock: 0,
    purchaseRate: 350,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'झिंक, फेरस, कॉपर, बोरॉन घटक',
    isCustom: false,
  },
  {
    name: 'Onion Seeds (कांदा बियाणे)',
    nameMr: 'कांदा बियाणे (फुरसुंगी / पंचगंगा)',
    type: 'seed',
    unit: 'kg',
    currentStock: 0,
    purchaseRate: 1800,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'रब्बी / रांगडा कांदा बियाणे',
    isCustom: false,
  },
  {
    name: 'Soybean Seeds (सोयाबीन)',
    nameMr: 'सोयाबीन बियाणे (JS 335 / KDS 726)',
    type: 'seed',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 2800,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'खरीप पेरणीसाठी प्रमाणित बियाणे',
    isCustom: false,
  },
  {
    name: 'Cotton Seeds (कापूस बियाणे)',
    nameMr: 'कापूस बियाणे (BG II / बोलगार्ड)',
    type: 'seed',
    unit: 'packet',
    currentStock: 0,
    purchaseRate: 850,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'बीटी कपाशी प्रमाणित पाकीट',
    isCustom: false,
  },
  {
    name: 'Wheat Seeds (गहू बियाणे)',
    nameMr: 'गहू बियाणे (लोकवन / समाधान)',
    type: 'seed',
    unit: 'bag',
    currentStock: 0,
    purchaseRate: 1400,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: '४० किलो बॅग',
    isCustom: false,
  },
  {
    name: 'Coragen (Chlorantraniliprole)',
    nameMr: 'कोराजन (Coragen - 60ml)',
    type: 'pesticide',
    unit: 'bottle',
    currentStock: 0,
    purchaseRate: 850,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'अळी व खोडकिडीवर प्रभावी कीटकनाशक',
    isCustom: false,
  },
  {
    name: 'Confidor (Imidacloprid)',
    nameMr: 'कॉन्फिडोर (Confidor - 100ml)',
    type: 'pesticide',
    unit: 'bottle',
    currentStock: 0,
    purchaseRate: 380,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'मावा, तुडतुडे व रसशोषक कीड नियंत्रण',
    isCustom: false,
  },
  {
    name: 'Saaf Fungicide (Carbendazim + Mancozeb)',
    nameMr: 'साफ बुरशीनाशक (Saaf - 500g)',
    type: 'pesticide',
    unit: 'packet',
    currentStock: 0,
    purchaseRate: 420,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'अंतर्प्रवाही व स्पर्शजन्य बुरशीनाशक',
    isCustom: false,
  },
  {
    name: 'Roundup / Glycel Herbicide',
    nameMr: 'ग्लायसेल / राउंडअप (तणनाशक - 1L)',
    type: 'pesticide',
    unit: 'liter',
    currentStock: 0,
    purchaseRate: 480,
    totalPurchased: 0,
    totalConsumed: 0,
    totalValue: 0,
    notes: 'बिगर पीक क्षेत्रातील तण नियंत्रणासाठी',
    isCustom: false,
  },
];

