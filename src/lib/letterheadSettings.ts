export interface LetterheadSettings {
  orgNameTa: string;
  orgNameEn: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  footerTa: string;
  footerEn: string;
}

export const DEFAULT_LETTERHEAD_SETTINGS: LetterheadSettings = {
  orgNameTa: "இளையான்குடி நெசவு பட்டடை ஜமாஅத் பள்ளிவாசல்",
  orgNameEn: "Ilayangudi Nesavu Pattadai Jamaath Masjid",
  addressLine1: "இளையான்குடி, சிவகங்கை மாவட்டம்",
  addressLine2: "தமிழ்நாடு - 630702",
  phone: "",
  footerTa: "ஏதேனும் கேள்விகளுக்கு, பள்ளிவாசல் நிர்வாகத்தை தொடர்பு கொள்ளவும்.",
  footerEn: "For any queries, please contact the mosque administration.",
};

export const LETTERHEAD_SETTING_KEYS = {
  orgNameTa: "letterhead_org_name_ta",
  orgNameEn: "letterhead_org_name_en",
  addressLine1: "letterhead_address_line1",
  addressLine2: "letterhead_address_line2",
  phone: "letterhead_phone",
  footerTa: "letterhead_footer_ta",
  footerEn: "letterhead_footer_en",
} as const;

export const LETTERHEAD_KEY_TO_FIELD: Record<string, keyof LetterheadSettings> = {
  [LETTERHEAD_SETTING_KEYS.orgNameTa]: "orgNameTa",
  [LETTERHEAD_SETTING_KEYS.orgNameEn]: "orgNameEn",
  [LETTERHEAD_SETTING_KEYS.addressLine1]: "addressLine1",
  [LETTERHEAD_SETTING_KEYS.addressLine2]: "addressLine2",
  [LETTERHEAD_SETTING_KEYS.phone]: "phone",
  [LETTERHEAD_SETTING_KEYS.footerTa]: "footerTa",
  [LETTERHEAD_SETTING_KEYS.footerEn]: "footerEn",
};
