export const HEADER_SETTING_KEYS = [
  "header_bismillah",
  "header_title_ta",
  "header_title_en",
  "header_font_bismillah_mobile",
  "header_font_bismillah_desktop",
  "header_font_ta_mobile",
  "header_font_ta_desktop",
  "header_font_en_mobile",
  "header_font_en_desktop",
] as const;

export type HeaderSettingKey = (typeof HEADER_SETTING_KEYS)[number];

export type HeaderSettings = Record<HeaderSettingKey, string>;

export const HEADER_SETTINGS_DEFAULTS: HeaderSettings = {
  header_bismillah: "بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ",
  header_title_ta: "இளையான்குடி நெசவுபட்டடை தொழுகை மேடை பள்ளிவாசல்",
  header_title_en: "Ilayangudi Nesavupattadai Thozhugai Medai Pallivasal",
  header_font_bismillah_mobile: "14",
  header_font_bismillah_desktop: "14",
  header_font_ta_mobile: "24",
  header_font_ta_desktop: "36",
  header_font_en_mobile: "14",
  header_font_en_desktop: "16",
};

export const HEADER_SETTING_DESCRIPTIONS: Record<HeaderSettingKey, string> = {
  header_bismillah: "Header Bismillah text (Arabic)",
  header_title_ta: "Header title in Tamil",
  header_title_en: "Header title in English",
  header_font_bismillah_mobile: "Bismillah font size - mobile (px)",
  header_font_bismillah_desktop: "Bismillah font size - desktop (px)",
  header_font_ta_mobile: "Tamil title font size - mobile (px)",
  header_font_ta_desktop: "Tamil title font size - desktop (px)",
  header_font_en_mobile: "English title font size - mobile (px)",
  header_font_en_desktop: "English title font size - desktop (px)",
};

export const HEADER_SETTINGS_CACHE_KEY = "header_settings_cache_v2";

export const sanitizeHeaderSettings = (
  input: Partial<Record<string, unknown>>,
): Partial<HeaderSettings> => {
  const sanitized: Partial<HeaderSettings> = {};

  HEADER_SETTING_KEYS.forEach((key) => {
    const value = input[key];
    if (typeof value === "string") {
      sanitized[key] = value;
    }
  });

  return sanitized;
};
