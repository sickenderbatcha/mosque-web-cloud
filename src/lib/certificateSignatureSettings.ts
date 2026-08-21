import { supabase } from "@/integrations/supabase/client";

export interface CertificateSignatureSettings {
  designationTa: string;
  designationEn: string;
  linesTa: string[];
  linesEn: string[];
}

const DEFAULT_SIGNATURE_BLOCK: CertificateSignatureSettings = {
  designationTa: "மேனேஜிங் டிரஸ்ட்டி",
  designationEn: "Managing Trustee.",
  linesTa: [
    "இளையான்குடி நெசவுப் பட்டடை",
    "தொழுகை மேடைப் பள்ளிவாசல்",
    "இளையான்குடி",
  ],
  linesEn: [],
};

const SETTING_KEYS = {
  designationTa: "cert_sign_designation_ta",
  designationEn: "cert_sign_designation_en",
  linesTa: "cert_sign_lines_ta",
  linesEn: "cert_sign_lines_en",
};

const parseLines = (value: string, fallback: string[]): string[] => {
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((l) => String(l ?? ""));
  } catch {
    // ignore
  }
  return fallback;
};

export const getCertificateSignatureSettings =
  async (): Promise<CertificateSignatureSettings> => {
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", Object.values(SETTING_KEYS));

      if (error) {
        console.error("Error fetching certificate signature settings:", error);
        return DEFAULT_SIGNATURE_BLOCK;
      }

      const settings: CertificateSignatureSettings = {
        ...DEFAULT_SIGNATURE_BLOCK,
        linesTa: [...DEFAULT_SIGNATURE_BLOCK.linesTa],
        linesEn: [...DEFAULT_SIGNATURE_BLOCK.linesEn],
      };

      (data || []).forEach((item) => {
        if (!item.value) return;
        switch (item.key) {
          case SETTING_KEYS.designationTa:
            settings.designationTa = item.value;
            break;
          case SETTING_KEYS.designationEn:
            settings.designationEn = item.value;
            break;
          case SETTING_KEYS.linesTa:
            settings.linesTa = parseLines(item.value, settings.linesTa);
            break;
          case SETTING_KEYS.linesEn:
            settings.linesEn = parseLines(item.value, settings.linesEn);
            break;
        }
      });

      // Drop empty entries so certificates don't render blank lines
      settings.linesTa = settings.linesTa.filter((l) => l && l.trim() !== "");
      settings.linesEn = settings.linesEn.filter((l) => l && l.trim() !== "");

      return settings;
    } catch (error) {
      console.error("Error fetching certificate signature settings:", error);
      return DEFAULT_SIGNATURE_BLOCK;
    }
  };

export const CERTIFICATE_SIGNATURE_SETTING_KEYS = SETTING_KEYS;
export const DEFAULT_CERTIFICATE_SIGNATURE = DEFAULT_SIGNATURE_BLOCK;
