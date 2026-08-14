export interface LetterheadSettings {
  footerTa: string;
  footerEn: string;
}

export const DEFAULT_LETTERHEAD_SETTINGS: LetterheadSettings = {
  footerTa: "ஏதேனும் கேள்விகளுக்கு, பள்ளிவாசல் நிர்வாகத்தை தொடர்பு கொள்ளவும்.",
  footerEn: "For any queries, please contact the mosque administration.",
};

export const LETTERHEAD_SETTING_KEYS = {
  footerTa: "letterhead_footer_ta",
  footerEn: "letterhead_footer_en",
} as const;
