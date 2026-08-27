import { supabase } from "@/integrations/supabase/client";

export const DEATH_CERT_BODY_SETTING_KEY = "death_cert_body_text";

export interface DeathCertificateField {
  /** Serial number used in the @F token, e.g. @F1 */
  serial: number;
  /** Death register column this field maps to */
  key: string;
  /** Label shown in the configuration screen */
  label: string;
}

/** Fields available for insertion into the death certificate body text */
export const DEATH_CERT_FIELDS: DeathCertificateField[] = [
  { serial: 1, key: "deceased_name", label: "இறந்தவர் பெயர் / Deceased name" },
  { serial: 2, key: "deceased_name_en", label: "இறந்தவர் பெயர் (English)" },
  { serial: 3, key: "parent_label", label: "த/பெ அல்லது க/பெ / Father or Husband label" },
  { serial: 4, key: "parent_name", label: "தந்தை / கணவர் பெயர் / Father or Husband name" },
  { serial: 5, key: "deceased_father_name", label: "தந்தை பெயர் / Father name" },
  { serial: 6, key: "deceased_husband_name", label: "கணவர் பெயர் / Husband name" },
  { serial: 7, key: "deceased_address", label: "முகவரி / Address" },
  { serial: 8, key: "street", label: "முகவரி முதல் வரி / Address first line" },
  { serial: 9, key: "deceased_age", label: "வயது / Age" },
  { serial: 10, key: "deceased_gender", label: "பாலினம் / Gender" },
  { serial: 11, key: "deceased_occupation", label: "தொழில் / Occupation" },
  { serial: 12, key: "death_date", label: "இறப்பு தேதி / Death date (dd/mm/yyyy)" },
  { serial: 13, key: "death_time", label: "இறப்பு நேரம் / Death time" },
  { serial: 14, key: "place_of_death", label: "இறந்த இடம் / Place of death" },
  { serial: 15, key: "cause_of_death", label: "இறப்புக்கான காரணம் / Cause of death" },
  { serial: 16, key: "burial_date", label: "அடக்கம் தேதி / Burial date (dd/mm/yyyy)" },
  { serial: 17, key: "burial_time", label: "அடக்கம் நேரம் / Burial time" },
  { serial: 18, key: "burial_place", label: "அடக்கம் செய்த இடம் / Burial place" },
  { serial: 19, key: "informant_name", label: "தகவல் தந்தவர் / Informant name" },
  { serial: 20, key: "informant_relationship", label: "உறவுமுறை / Informant relationship" },
  { serial: 21, key: "member_id", label: "உறுப்பினர் எண் / Member ID" },
  { serial: 22, key: "register_page_number", label: "பதிவேட்டு பக்க எண் / Register page number" },
  { serial: 23, key: "registrar_name", label: "பதிவாளர் பெயர் / Registrar name" },
  { serial: 24, key: "hijri_date", label: "ஹிஜ்ரி தேதி / Hijri date" },
  { serial: 25, key: "day_name", label: "நாள் / Day name" },
];

export const DEFAULT_DEATH_CERT_BODY = [
  "@F1, @F3. @F4,",
  "@F8 என்ற முகவரியை சார்ந்த நபர்",
  "கடந்த @F12 அன்று மரணமடைந்துவிட்டார்.",
  "அன்னாரது உடல் எங்களது @F18 மையய வாடியில்தான்",
  "அடக்கம் செய்யப்பட்டுள்ளது என்பதற்கு கொடுக்கலான சான்று.",
].join("\n");

const formatDate = (value?: string | null): string => {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  } catch {
    return value;
  }
};

/** Build the token -> value map for a death register record */
export const buildDeathCertificateValues = (record: any): Record<string, string> => {
  const hasHusband = !!(record?.deceased_husband_name && String(record.deceased_husband_name).trim());
  const address = record?.deceased_address || "";
  const street = address.split(",")[0]?.trim() || address;

  return {
    deceased_name: record?.deceased_name || "",
    deceased_name_en: record?.deceased_name_en || "",
    parent_label: hasHusband ? "க/பெ" : "த/பெ",
    parent_name: (hasHusband ? record?.deceased_husband_name : record?.deceased_father_name) || "",
    deceased_father_name: record?.deceased_father_name || "",
    deceased_husband_name: record?.deceased_husband_name || "",
    deceased_address: address,
    street,
    deceased_age: record?.deceased_age != null ? String(record.deceased_age) : "",
    deceased_gender: record?.deceased_gender || "",
    deceased_occupation: record?.deceased_occupation || "",
    death_date: formatDate(record?.death_date),
    death_time: record?.death_time || "",
    place_of_death: record?.place_of_death || "",
    cause_of_death: record?.cause_of_death || "",
    burial_date: formatDate(record?.burial_date),
    burial_time: record?.burial_time || "",
    burial_place: record?.burial_place_en || record?.burial_place || "",
    informant_name: record?.informant_name || "",
    informant_relationship: record?.informant_relationship || "",
    member_id: record?.member_id || "",
    register_page_number: record?.register_page_number || "",
    registrar_name: record?.registrar_name || "",
    hijri_date:
      record?.hijri_day && record?.hijri_month
        ? `${record.hijri_day} ${record.hijri_month} ${record.hijri_year ?? ""}`.trim()
        : "",
    day_name: record?.day_name || "",
  };
};

/** Replace @F<serial> tokens with the matching record values */
export const renderDeathCertificateBody = (template: string, record: any): string => {
  const values = buildDeathCertificateValues(record);
  return template.replace(/@F(\d+)/g, (match, serial) => {
    const field = DEATH_CERT_FIELDS.find((f) => f.serial === Number(serial));
    if (!field) return match;
    return values[field.key] ?? "";
  });
};

/** Fetch the configured body text (falls back to the default template) */
export const getDeathCertificateBodyTemplate = async (): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", DEATH_CERT_BODY_SETTING_KEY)
      .maybeSingle();
    if (error || !data?.value?.trim()) return DEFAULT_DEATH_CERT_BODY;
    return data.value;
  } catch {
    return DEFAULT_DEATH_CERT_BODY;
  }
};

/** Fetch + render in one step */
export const getRenderedDeathCertificateBody = async (record: any): Promise<string[]> => {
  const template = await getDeathCertificateBodyTemplate();
  return renderDeathCertificateBody(template, record)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};
