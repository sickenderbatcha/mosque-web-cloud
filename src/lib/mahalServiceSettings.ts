import { supabase } from "@/integrations/supabase/client";

export interface MahalService {
  id: string;
  nameTamil: string;
  nameEnglish: string;
  rate: number;
  sortOrder: number;
}

export const MAHAL_SERVICES_KEY = "mahal_booking_services";

export const LEGACY_MAHAL_RATE_KEYS = [
  "booking_rate_nikkah_book",
  "booking_rate_hall",
  "booking_rate_food_facility",
] as const;

const LEGACY_SERVICE_DEFS: Array<{
  id: string;
  nameTamil: string;
  nameEnglish: string;
  legacyKey: (typeof LEGACY_MAHAL_RATE_KEYS)[number];
  defaultRate: number;
}> = [
  {
    id: "nikkahBook",
    nameTamil: "நிக்காஹ் புத்தகம்",
    nameEnglish: "Nikkah Book",
    legacyKey: "booking_rate_nikkah_book",
    defaultRate: 3000,
  },
  {
    id: "hall",
    nameTamil: "மண்டபம்",
    nameEnglish: "Hall",
    legacyKey: "booking_rate_hall",
    defaultRate: 15000,
  },
  {
    id: "food",
    nameTamil: "உணவு இட வசதி",
    nameEnglish: "Dining Hall",
    legacyKey: "booking_rate_food_facility",
    defaultRate: 7000,
  },
];

export const generateMahalServiceId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `svc_${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Parse the stored JSON array. Returns null when the value is absent or unusable,
 * so callers can fall back to the legacy rate keys.
 */
export const parseMahalServices = (raw?: string | null): MahalService[] | null => {
  if (!raw || !raw.trim()) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const services = parsed
      .map((item: any, index: number): MahalService | null => {
        if (!item || typeof item !== "object") return null;
        const rate = Number(item.rate);
        const id = typeof item.id === "string" && item.id.trim() ? item.id : generateMahalServiceId();
        const nameTamil = typeof item.nameTamil === "string" ? item.nameTamil : "";
        const nameEnglish = typeof item.nameEnglish === "string" ? item.nameEnglish : "";
        if (!nameTamil && !nameEnglish) return null;
        if (!Number.isFinite(rate) || rate < 0) return null;
        const sortOrder = Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index;
        return { id, nameTamil, nameEnglish, rate, sortOrder };
      })
      .filter((s): s is MahalService => s !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s, index) => ({ ...s, sortOrder: index }));

    return services;
  } catch {
    return null;
  }
};

/** Build the seed list from the legacy booking_rate_* settings (or their defaults). */
export const buildDefaultMahalServices = (
  legacyValues?: Record<string, string | undefined>
): MahalService[] =>
  LEGACY_SERVICE_DEFS.map((def, index) => {
    const raw = legacyValues?.[def.legacyKey];
    const parsed = Number(raw);
    return {
      id: def.id,
      nameTamil: def.nameTamil,
      nameEnglish: def.nameEnglish,
      rate: Number.isFinite(parsed) && parsed > 0 ? parsed : def.defaultRate,
      sortOrder: index,
    };
  });

export const resolveMahalServices = (
  storedValue?: string | null,
  legacyValues?: Record<string, string | undefined>
): MahalService[] => parseMahalServices(storedValue) ?? buildDefaultMahalServices(legacyValues);

export const serializeMahalServices = (services: MahalService[]) =>
  JSON.stringify(
    services.map((service, index) => ({
      id: service.id,
      nameTamil: service.nameTamil,
      nameEnglish: service.nameEnglish,
      rate: service.rate,
      sortOrder: index,
    }))
  );

export const getMahalBookingServices = async (): Promise<MahalService[]> => {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", [MAHAL_SERVICES_KEY, ...LEGACY_MAHAL_RATE_KEYS]);

  if (error) {
    console.error("Failed to load mahal booking services:", error);
    return buildDefaultMahalServices();
  }

  const map: Record<string, string> = {};
  (data || []).forEach((row) => {
    map[row.key] = row.value;
  });

  return resolveMahalServices(map[MAHAL_SERVICES_KEY], map);
};
