import { supabase } from "@/integrations/supabase/client";

export type ReceiptType = "booking" | "donation" | "subscription" | "cash_payment" | "certificate_noc" | "certificate_heir" | "certificate_general";

export interface ReceiptNumberSettings {
  booking_prefix: string;
  donation_prefix: string;
  subscription_prefix: string;
  cash_payment_prefix: string;
  certificate_noc_prefix: string;
  certificate_heir_prefix: string;
  certificate_general_prefix: string;
}

// Default prefixes
const DEFAULT_SETTINGS: ReceiptNumberSettings = {
  booking_prefix: "BK-",
  donation_prefix: "DON-",
  subscription_prefix: "SUB-",
  cash_payment_prefix: "CASH-",
  certificate_noc_prefix: "NOC-",
  certificate_heir_prefix: "HEIR-",
  certificate_general_prefix: "CERT-",
};

// Keys used in app_settings
const SETTING_KEYS: Record<keyof ReceiptNumberSettings, string> = {
  booking_prefix: "receipt_num_prefix_booking",
  donation_prefix: "receipt_num_prefix_donation",
  subscription_prefix: "receipt_num_prefix_subscription",
  cash_payment_prefix: "receipt_num_prefix_cash_payment",
  certificate_noc_prefix: "receipt_num_prefix_cert_noc",
  certificate_heir_prefix: "receipt_num_prefix_cert_heir",
  certificate_general_prefix: "receipt_num_prefix_cert_general",
};

// No-op for backward compatibility
export const clearReceiptNumberCache = () => {};

export const getReceiptNumberSettings = async (): Promise<ReceiptNumberSettings> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", Object.values(SETTING_KEYS));

    if (error) {
      console.error("Error fetching receipt number settings:", error);
      return DEFAULT_SETTINGS;
    }

    const settings: ReceiptNumberSettings = { ...DEFAULT_SETTINGS };

    if (data && data.length > 0) {
      data.forEach((item) => {
        const settingKey = Object.entries(SETTING_KEYS).find(([, v]) => v === item.key)?.[0] as keyof ReceiptNumberSettings | undefined;
        if (settingKey && item.value) {
          settings[settingKey] = item.value;
        }
      });
    }

    return settings;
  } catch (error) {
    console.error("Error fetching receipt number settings:", error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Format a receipt number using the configured prefix and a unique identifier.
 * This is a FALLBACK used when the sequential number from DB is not yet available.
 * @param type - The receipt type
 * @param uniqueId - The unique portion (UUID slice, transaction ID, etc.)
 * @param settings - The receipt number settings
 */
export const formatReceiptNumber = (
  type: ReceiptType,
  uniqueId: string,
  settings: ReceiptNumberSettings
): string => {
  const prefixKey = `${type}_prefix` as keyof ReceiptNumberSettings;
  const prefix = settings[prefixKey] || DEFAULT_SETTINGS[prefixKey];
  // Avoid double-prefixing if uniqueId already starts with the prefix
  if (prefix && uniqueId.startsWith(prefix)) {
    return uniqueId;
  }
  return `${prefix}${uniqueId}`;
};

/**
 * Map ReceiptType to the reference_type used in the income table.
 */
const RECEIPT_TYPE_TO_REFERENCE: Record<string, string> = {
  booking: "booking",
  donation: "donation",
  subscription: "subscription",
  cash_payment: "cash_payment",
  certificate_noc: "noc_certificate",
  certificate_heir: "heir_certificate",
  certificate_general: "certificate_payment",
};

/**
 * Look up the sequential receipt number from the income/expenses table.
 * This is the authoritative source for receipt numbers since triggers
 * generate sequential numbers using get_next_receipt_number().
 * 
 * @param referenceId - The UUID of the source record (booking, donation, etc.)
 * @param referenceType - The reference_type as stored in income table
 * @returns The sequential receipt number, or null if not found
 */
export const lookupReceiptNumber = async (
  referenceId: string,
  referenceType: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("income")
      .select("receipt_number")
      .eq("reference_id", referenceId)
      .eq("reference_type", referenceType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error looking up receipt number:", error);
      return null;
    }

    return data?.receipt_number || null;
  } catch (error) {
    console.error("Error looking up receipt number:", error);
    return null;
  }
};

/**
 * Look up receipt number by receipt type and reference ID.
 * Convenience wrapper that maps ReceiptType to reference_type.
 */
export const lookupReceiptNumberByType = async (
  type: ReceiptType,
  referenceId: string
): Promise<string | null> => {
  const refType = RECEIPT_TYPE_TO_REFERENCE[type];
  if (!refType) return null;
  return lookupReceiptNumber(referenceId, refType);
};

export const RECEIPT_NUMBER_SETTING_KEYS = SETTING_KEYS;
export const DEFAULT_RECEIPT_NUMBER_SETTINGS = DEFAULT_SETTINGS;
