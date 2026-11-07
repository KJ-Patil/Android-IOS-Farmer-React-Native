interface PostOffice {
  Name: string;
  District: string;
  Block: string;
  Division: string;
  State: string;
  Pincode: string;
}

export interface DistrictData {
  talukas: string[];
  pincodes: string[];
  pincodesByTaluka: Record<string, string[]>;
}

const EMPTY: DistrictData = { talukas: [], pincodes: [], pincodesByTaluka: {} };

const cache = new Map<string, DistrictData>();

export async function fetchDistrictData(districtName: string): Promise<DistrictData> {
  const key = districtName.toLowerCase().trim();
  if (!key) return EMPTY;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const res = await fetch(
      `https://api.postalpincode.in/postoffice/${encodeURIComponent(districtName)}`,
    );
    const json = await res.json();

    if (!json?.[0]?.PostOffice?.length) return EMPTY;

    const offices: PostOffice[] = json[0].PostOffice.filter(
      (po: PostOffice) => po.District?.toLowerCase() === key,
    );

    if (offices.length === 0) return EMPTY;

    const talukaSet = new Set<string>();
    const pincodeSet = new Set<string>();
    const pincodesByTaluka: Record<string, string[]> = {};

    for (const po of offices) {
      const taluka = po.Block && po.Block !== 'NA' ? po.Block : '';
      const pincode = po.Pincode || '';

      if (taluka) talukaSet.add(taluka);
      if (pincode) pincodeSet.add(pincode);

      if (taluka && pincode) {
        if (!pincodesByTaluka[taluka]) pincodesByTaluka[taluka] = [];
        if (!pincodesByTaluka[taluka].includes(pincode)) {
          pincodesByTaluka[taluka].push(pincode);
        }
      }
    }

    for (const arr of Object.values(pincodesByTaluka)) arr.sort();

    const result: DistrictData = {
      talukas: [...talukaSet].sort(),
      pincodes: [...pincodeSet].sort(),
      pincodesByTaluka,
    };

    cache.set(key, result);
    return result;
  } catch {
    return EMPTY;
  }
}
