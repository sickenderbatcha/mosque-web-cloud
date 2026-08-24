import { supabase } from "@/integrations/supabase/client";

export type CertificateFooterType =
  | "death"
  | "marriage"
  | "outside_marriage"
  | "heir"
  | "noc";

export interface CertificateFooterText {
  ta: string;
  en: string;
}

export type CertificateFooterSettings = Record<CertificateFooterType, CertificateFooterText>;

export const CERTIFICATE_FOOTER_TYPES: {
  type: CertificateFooterType;
  labelEn: string;
  labelTa: string;
}[] = [
  { type: "death", labelEn: "Death Certificate", labelTa: "இறப்புச் சான்றிதழ்" },
  { type: "marriage", labelEn: "Marriage Certificate", labelTa: "திருமணச் சான்றிதழ்" },
  { type: "outside_marriage", labelEn: "Outside Marriage Certificate", labelTa: "வெளி திருமணச் சான்றிதழ்" },
  { type: "heir", labelEn: "Heir Certificate", labelTa: "வாரிசுச் சான்றிதழ்" },
  { type: "noc", labelEn: "NOC Certificate", labelTa: "தடையில்லா சான்றிதழ்" },
];

export const certificateFooterKey = (type: CertificateFooterType, lang: "ta" | "en") =>
  `cert_footer_${type}_${lang}`;

export const DEFAULT_CERTIFICATE_FOOTERS: CertificateFooterSettings = {
  death: { ta: "", en: "" },
  marriage: { ta: "", en: "" },
  outside_marriage: { ta: "", en: "" },
  heir: { ta: "", en: "" },
  noc: { ta: "", en: "" },
};

const emptySettings = (): CertificateFooterSettings => ({
  death: { ta: "", en: "" },
  marriage: { ta: "", en: "" },
  outside_marriage: { ta: "", en: "" },
  heir: { ta: "", en: "" },
  noc: { ta: "", en: "" },
});

export const getCertificateFooterSettings = async (): Promise<CertificateFooterSettings> => {
  const settings = emptySettings();
  try {
    const keys = CERTIFICATE_FOOTER_TYPES.flatMap((t) => [
      certificateFooterKey(t.type, "ta"),
      certificateFooterKey(t.type, "en"),
    ]);

    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", keys);

    if (error) {
      console.error("Error fetching certificate footer settings:", error);
      return settings;
    }

    (data || []).forEach((item) => {
      CERTIFICATE_FOOTER_TYPES.forEach(({ type }) => {
        if (item.key === certificateFooterKey(type, "ta")) settings[type].ta = item.value || "";
        if (item.key === certificateFooterKey(type, "en")) settings[type].en = item.value || "";
      });
    });

    return settings;
  } catch (error) {
    console.error("Error fetching certificate footer settings:", error);
    return settings;
  }
};

export const getCertificateFooter = async (
  type: CertificateFooterType
): Promise<CertificateFooterText> => {
  const all = await getCertificateFooterSettings();
  return all[type];
};
