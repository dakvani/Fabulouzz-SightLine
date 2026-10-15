export interface SaudiCity {
  id: string;
  name: string;
  arabicName: string;
  region: string;
  lat: number;
  lon: number;
  isEconomicZone?: boolean;
}

export const SAUDI_CITIES: SaudiCity[] = [
  {
    id: "kaec",
    name: "King Abdullah Economic City (KAEC)",
    arabicName: "مدينة الملك عبدالله الاقتصادية",
    region: "Makkah Province (Rabigh)",
    lat: 22.4183,
    lon: 39.1175,
    isEconomicZone: true,
  },
  {
    id: "riyadh",
    name: "Riyadh",
    arabicName: "الرياض",
    region: "Riyadh Province (Capital)",
    lat: 24.7136,
    lon: 46.6753,
  },
  {
    id: "jeddah",
    name: "Jeddah",
    arabicName: "جدة",
    region: "Makkah Province",
    lat: 21.5433,
    lon: 39.1728,
  },
  {
    id: "makkah",
    name: "Makkah",
    arabicName: "مكة المكرمة",
    region: "Makkah Province",
    lat: 21.3891,
    lon: 39.8579,
  },
  {
    id: "madinah",
    name: "Madinah",
    arabicName: "المدينة المنورة",
    region: "Al Madinah Province",
    lat: 24.5247,
    lon: 39.5692,
  },
  {
    id: "dammam",
    name: "Dammam",
    arabicName: "الدمام",
    region: "Eastern Province",
    lat: 26.4207,
    lon: 50.0888,
  },
  {
    id: "khobar",
    name: "Al Khobar",
    arabicName: "الخبر",
    region: "Eastern Province",
    lat: 26.2172,
    lon: 50.1971,
  },
  {
    id: "dhahran",
    name: "Dhahran",
    arabicName: "الظهران",
    region: "Eastern Province",
    lat: 26.2361,
    lon: 50.0393,
  },
  {
    id: "jubail",
    name: "Al Jubail",
    arabicName: "الجبيل",
    region: "Eastern Province (Industrial)",
    lat: 27.0046,
    lon: 49.6598,
    isEconomicZone: true,
  },
  {
    id: "yanbu",
    name: "Yanbu",
    arabicName: "ينبع",
    region: "Al Madinah Province (Industrial)",
    lat: 24.0895,
    lon: 38.0637,
    isEconomicZone: true,
  },
  {
    id: "neom",
    name: "NEOM / Oxagon",
    arabicName: "نيوم / أوكساجون",
    region: "Tabuk Province",
    lat: 28.0063,
    lon: 35.1989,
    isEconomicZone: true,
  },
  {
    id: "tabuk",
    name: "Tabuk",
    arabicName: "تبوك",
    region: "Tabuk Province",
    lat: 28.3835,
    lon: 36.5662,
  },
  {
    id: "taif",
    name: "Taif",
    arabicName: "الطائف",
    region: "Makkah Province",
    lat: 21.4373,
    lon: 40.5127,
  },
  {
    id: "al-ula",
    name: "Al Ula",
    arabicName: "العلا",
    region: "Al Madinah Province",
    lat: 26.6167,
    lon: 37.9167,
  },
  {
    id: "abha",
    name: "Abha",
    arabicName: "أبها",
    region: "Asir Province",
    lat: 18.2164,
    lon: 42.5053,
  },
  {
    id: "khamis-mushait",
    name: "Khamis Mushait",
    arabicName: "خميس مشيط",
    region: "Asir Province",
    lat: 18.3000,
    lon: 42.7333,
  },
  {
    id: "jazan",
    name: "Jazan",
    arabicName: "جازان",
    region: "Jazan Province",
    lat: 16.8892,
    lon: 42.5706,
  },
  {
    id: "najran",
    name: "Najran",
    arabicName: "نجران",
    region: "Najran Province",
    lat: 17.4933,
    lon: 44.1277,
  },
  {
    id: "hail",
    name: "Hail",
    arabicName: "حائل",
    region: "Hail Province",
    lat: 27.5219,
    lon: 41.6907,
  },
  {
    id: "buraidah",
    name: "Buraidah",
    arabicName: "بريدة",
    region: "Al Qassim Province",
    lat: 26.3260,
    lon: 43.9750,
  },
  {
    id: "unaizah",
    name: "Unaizah",
    arabicName: "عنيزة",
    region: "Al Qassim Province",
    lat: 26.0843,
    lon: 43.9937,
  },
  {
    id: "al-ahsa",
    name: "Al Ahsa (Hofuf)",
    arabicName: "الأحساء / الهفوف",
    region: "Eastern Province",
    lat: 25.3833,
    lon: 49.5833,
  },
  {
    id: "rabigh",
    name: "Rabigh",
    arabicName: "رابغ",
    region: "Makkah Province",
    lat: 22.7986,
    lon: 39.0349,
  },
  {
    id: "ras-tanura",
    name: "Ras Tanura",
    arabicName: "رأس تنورة",
    region: "Eastern Province",
    lat: 26.7730,
    lon: 50.1581,
  },
  {
    id: "qatif",
    name: "Qatif",
    arabicName: "القطيف",
    region: "Eastern Province",
    lat: 26.5654,
    lon: 50.0123,
  },
  {
    id: "hafar-al-batin",
    name: "Hafar Al Batin",
    arabicName: "حفر الباطن",
    region: "Eastern Province",
    lat: 28.4328,
    lon: 45.9708,
  },
  {
    id: "al-kharj",
    name: "Al Kharj",
    arabicName: "الخرج",
    region: "Riyadh Province",
    lat: 24.1554,
    lon: 47.3346,
  },
  {
    id: "al-duwadimi",
    name: "Al Duwadimi",
    arabicName: "الدوادمي",
    region: "Riyadh Province",
    lat: 24.5077,
    lon: 44.3924,
  },
  {
    id: "al-bahah",
    name: "Al Bahah",
    arabicName: "الباحة",
    region: "Al Bahah Province",
    lat: 20.0129,
    lon: 41.4677,
  },
  {
    id: "arar",
    name: "Arar",
    arabicName: "عرعر",
    region: "Northern Borders",
    lat: 30.9753,
    lon: 41.0381,
  },
  {
    id: "sakaka",
    name: "Sakaka",
    arabicName: "سكاكا",
    region: "Al Jawf Province",
    lat: 29.9697,
    lon: 40.2064,
  },
  {
    id: "qurayyat",
    name: "Al Qurayyat",
    arabicName: "القريات",
    region: "Al Jawf Province",
    lat: 31.3317,
    lon: 37.3428,
  },
  {
    id: "sharurah",
    name: "Sharurah",
    arabicName: "شرورة",
    region: "Najran Province",
    lat: 17.4833,
    lon: 47.1167,
  },
  {
    id: "bishah",
    name: "Bishah",
    arabicName: "بيشة",
    region: "Asir Province",
    lat: 19.9864,
    lon: 42.6053,
  },
  {
    id: "wadi-ad-dawasir",
    name: "Wadi Ad-Dawasir",
    arabicName: "وادي الدواسر",
    region: "Riyadh Province",
    lat: 20.4500,
    lon: 44.8000,
  },
];

/**
 * Match a location string (e.g. "KAEC", "Jeddah", "Riyadh") to the closest Saudi City.
 */
export const findSaudiCity = (locationName?: string): SaudiCity => {
  if (!locationName) return SAUDI_CITIES[0]; // KAEC default
  const normalized = locationName.trim().toLowerCase();

  // Exact ID match or alias check
  if (normalized.includes("kaec") || normalized.includes("king abdullah") || normalized.includes("rabigh")) {
    return SAUDI_CITIES.find(c => c.id === "kaec") || SAUDI_CITIES[0];
  }
  if (normalized.includes("neom") || normalized.includes("oxagon")) {
    return SAUDI_CITIES.find(c => c.id === "neom") || SAUDI_CITIES[0];
  }
  if (normalized.includes("riyadh") || normalized.includes("الرياض")) {
    return SAUDI_CITIES.find(c => c.id === "riyadh") || SAUDI_CITIES[0];
  }
  if (normalized.includes("jeddah") || normalized.includes("جدة")) {
    return SAUDI_CITIES.find(c => c.id === "jeddah") || SAUDI_CITIES[0];
  }
  if (normalized.includes("makkah") || normalized.includes("mecca") || normalized.includes("مكة")) {
    return SAUDI_CITIES.find(c => c.id === "makkah") || SAUDI_CITIES[0];
  }
  if (normalized.includes("madinah") || normalized.includes("medina") || normalized.includes("المدينة")) {
    return SAUDI_CITIES.find(c => c.id === "madinah") || SAUDI_CITIES[0];
  }
  if (normalized.includes("dammam") || normalized.includes("الدمام")) {
    return SAUDI_CITIES.find(c => c.id === "dammam") || SAUDI_CITIES[0];
  }
  if (normalized.includes("khobar") || normalized.includes("الخبر")) {
    return SAUDI_CITIES.find(c => c.id === "khobar") || SAUDI_CITIES[0];
  }
  if (normalized.includes("dhahran") || normalized.includes("الظهران")) {
    return SAUDI_CITIES.find(c => c.id === "dhahran") || SAUDI_CITIES[0];
  }
  if (normalized.includes("jubail") || normalized.includes("الجبيل")) {
    return SAUDI_CITIES.find(c => c.id === "jubail") || SAUDI_CITIES[0];
  }
  if (normalized.includes("yanbu") || normalized.includes("ينبع")) {
    return SAUDI_CITIES.find(c => c.id === "yanbu") || SAUDI_CITIES[0];
  }
  if (normalized.includes("taif") || normalized.includes("الطائف")) {
    return SAUDI_CITIES.find(c => c.id === "taif") || SAUDI_CITIES[0];
  }
  if (normalized.includes("tabuk") || normalized.includes("تبوك")) {
    return SAUDI_CITIES.find(c => c.id === "tabuk") || SAUDI_CITIES[0];
  }
  if (normalized.includes("abha") || normalized.includes("أبها")) {
    return SAUDI_CITIES.find(c => c.id === "abha") || SAUDI_CITIES[0];
  }

  // Generic substring match
  const match = SAUDI_CITIES.find(
    c =>
      c.name.toLowerCase().includes(normalized) ||
      c.arabicName.includes(normalized) ||
      c.region.toLowerCase().includes(normalized)
  );

  return match || SAUDI_CITIES[0];
};
