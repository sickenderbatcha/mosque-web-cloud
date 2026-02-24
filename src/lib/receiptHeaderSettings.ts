import { supabase } from "@/integrations/supabase/client";

export interface ReceiptHeaderSettings {
  organizationNameTa: string;
  organizationNameEn: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  footerMessage: string;
  footerMessageEn: string;
}

// Default header values
const DEFAULT_HEADER: ReceiptHeaderSettings = {
  organizationNameTa: "இளையான்குடி நெசவுப்பட்டடை தொழுகை மேடை பள்ளிவாசல்",
  organizationNameEn: "Ilayangudi Nesavupattadai Thozhugai Medai Pallivasal",
  addressLine1: "எண்: 115, காமராசர் சாலை, இளையான்குடி - 630702",
  addressLine2: "சிவகங்கை மாவட்டம், தமிழ்நாடு",
  phone: "04564 - 265720",
  footerMessage: "ஏதேனும் கேள்விகளுக்கு, பள்ளிவாசல் நிர்வாகத்தை தொடர்பு கொள்ளவும்.",
  footerMessageEn: "For any queries, please contact the mosque administration.",
};

// Keys used in app_settings
const SETTING_KEYS = {
  organizationNameTa: "receipt_header_org_name_ta",
  organizationNameEn: "receipt_header_org_name_en",
  addressLine1: "receipt_header_address_1",
  addressLine2: "receipt_header_address_2",
  phone: "receipt_header_phone",
  footerMessage: "receipt_header_footer_ta",
  footerMessageEn: "receipt_header_footer_en",
};

// No-op for backward compatibility
export const clearReceiptHeaderCache = () => {};

export const getReceiptHeaderSettings = async (): Promise<ReceiptHeaderSettings> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", Object.values(SETTING_KEYS));

    if (error) {
      console.error("Error fetching receipt header settings:", error);
      return DEFAULT_HEADER;
    }

    const settings: ReceiptHeaderSettings = { ...DEFAULT_HEADER };

    if (data && data.length > 0) {
      data.forEach((item) => {
        switch (item.key) {
          case SETTING_KEYS.organizationNameTa:
            if (item.value) settings.organizationNameTa = item.value;
            break;
          case SETTING_KEYS.organizationNameEn:
            if (item.value) settings.organizationNameEn = item.value;
            break;
          case SETTING_KEYS.addressLine1:
            if (item.value) settings.addressLine1 = item.value;
            break;
          case SETTING_KEYS.addressLine2:
            if (item.value) settings.addressLine2 = item.value;
            break;
          case SETTING_KEYS.phone:
            if (item.value) settings.phone = item.value;
            break;
          case SETTING_KEYS.footerMessage:
            if (item.value) settings.footerMessage = item.value;
            break;
          case SETTING_KEYS.footerMessageEn:
            if (item.value) settings.footerMessageEn = item.value;
            break;
        }
      });
    }

    return settings;
  } catch (error) {
    console.error("Error fetching receipt header settings:", error);
    return DEFAULT_HEADER;
  }
};

// Export setting keys for admin component
export const RECEIPT_HEADER_SETTING_KEYS = SETTING_KEYS;
export const DEFAULT_RECEIPT_HEADER = DEFAULT_HEADER;
