import { supabase } from "@/integrations/supabase/client";

export type CertificateBodyType =
  | "death"
  | "marriage"
  | "outside_marriage"
  | "noc"
  | "heir";

export interface CertificateBodyField {
  /** Serial number used in the @F token, e.g. @F1 */
  serial: number;
  /** Value key produced by the type's value builder */
  key: string;
  /** Label shown in the configuration screen */
  label: string;
}

export interface CertificateBodyConfig {
  type: CertificateBodyType;
  /** Label shown in settings UI */
  label: string;
  /** app_settings key */
  settingKey: string;
  fields: CertificateBodyField[];
  defaultTemplate: string;
  buildValues: (record: any) => Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

const formatDate = (value?: string | null): string => {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  } catch {
    return String(value);
  }
};

const getGregorianMonthEnShort = (month: string): string => {
  const m = (month || "").trim();
  const en = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ];
  const idx = en.indexOf(m.toLowerCase());
  if (idx >= 0) return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][idx];

  const taToEn: Record<string, string> = {
    "ஜனவரி": "Jan", "பிப்ரவரி": "Feb", "மார்ச்": "Mar", "ஏப்ரல்": "Apr",
    "மே": "May", "ஜூன்": "Jun", "ஜூலை": "Jul", "ஆகஸ்ட்": "Aug",
    "செப்டம்பர்": "Sep", "அக்டோபர்": "Oct", "நவம்பர்": "Nov", "டிசம்பர்": "Dec",
  };
  return taToEn[m] || m.substring(0, 3);
};

const getHijriMonthEn = (month: string): string => {
  const m = (month || "").trim();
  const map: Record<string, string> = {
    "முஹர்ரம்": "Muharram", "சஃபர்": "Safar", "ரபி உல் அவ்வல்": "Rabi' al-Awwal",
    "ரபி உல் ஆகிர்": "Rabi' al-Thani", "ஜுமாதல் அவ்வல்": "Jumada al-Awwal",
    "ஜுமாதல் ஆகிர்": "Jumada al-Thani", "ரஜப்": "Rajab", "ஷஅபான்": "Sha'ban",
    "ரமலான்": "Ramadan", "ஷவ்வால்": "Shawwal", "துல் காதா": "Dhu al-Qa'dah",
    "துல் ஹிஜ்ஜா": "Dhu al-Hijjah",
  };
  return map[m] || m;
};

const getDayNameEn = (dayNameTamil?: string | null, dayNameEn?: string | null): string => {
  if (dayNameEn) return dayNameEn;
  const dayMapping: Record<string, string> = {
    "ஞாயிறு": "Sunday", "திங்கள்": "Monday", "செவ்வாய்": "Tuesday",
    "புதன்": "Wednesday", "வியாழன்": "Thursday", "வெள்ளி": "Friday", "சனி": "Saturday",
  };
  return dayMapping[dayNameTamil || ""] || dayNameTamil || "";
};

/* ------------------------------------------------------------------ */
/* Death certificate                                                   */
/* ------------------------------------------------------------------ */

export const DEATH_CERT_BODY_SETTING_KEY = "death_cert_body_text";

export const DEATH_CERT_FIELDS: CertificateBodyField[] = [
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

/* ------------------------------------------------------------------ */
/* Marriage / Outside marriage certificates (English body)             */
/* ------------------------------------------------------------------ */

const MARRIAGE_FIELDS: CertificateBodyField[] = [
  { serial: 1, key: "groom_full_name", label: "மணமகன் முழு விவரம் / Groom (Janab X son of Y)" },
  { serial: 2, key: "bride_full_name", label: "மணமகள் முழு விவரம் / Bride (Janaba X daughter of Y)" },
  { serial: 3, key: "groom_name", label: "மணமகன் பெயர் / Groom name" },
  { serial: 4, key: "groom_father_name", label: "மணமகன் தந்தை / Groom father name" },
  { serial: 5, key: "bride_name", label: "மணமகள் பெயர் / Bride name" },
  { serial: 6, key: "bride_father_name", label: "மணமகள் தந்தை / Bride father name" },
  { serial: 7, key: "ceremony_date", label: "திருமண தேதி / Ceremony date (dd.Mon.yyyy)" },
  { serial: 8, key: "day_name", label: "நாள் / Day name" },
  { serial: 9, key: "time_text", label: "நேரம் / Time (with AM/PM)" },
  { serial: 10, key: "hijri_text", label: "ஹிஜ்ரி தேதி / Hijri date" },
  { serial: 11, key: "venue", label: "இடம் / Venue" },
  { serial: 12, key: "register_page_number", label: "பதிவேட்டு பக்க எண் / Register page no." },
  { serial: 13, key: "wali_name", label: "வலி / Wali name" },
  { serial: 14, key: "mahr", label: "மஹர் / Mahar" },
  { serial: 15, key: "witness1", label: "சாட்சி 1 / Witness 1 (with father)" },
  { serial: 16, key: "witness2", label: "சாட்சி 2 / Witness 2 (with father)" },
  { serial: 17, key: "kathib_name", label: "கதீப் / Qathib name" },
  { serial: 18, key: "certificate_date", label: "சான்றிதழ் தேதி / Certificate date (dd/mm/yyyy)" },
];

const DEFAULT_MARRIAGE_BODY =
  "This is to certify that the marriage (NIKKAH) ceremony of @F1 with @F2 was solemnized on @F7, @F8 at @F9 (@F10) at @F11, Sivagangai Dist. and recorded in our Marriage Register Page No. @F12.";

const buildMarriageValues = (record: any): Record<string, string> => {
  const groomName = record?.groom_name_en || record?.groom_name || "";
  const groomFatherName = record?.groom_father_name_en || record?.groom_father_name || "";
  const brideName = record?.bride_name_en || record?.bride_name || "";
  const brideFatherName = record?.bride_father_name_en || record?.bride_father_name || "";
  const witness1Name = record?.witness1_name_en || record?.witness1_name || "";
  const witness1FatherName = record?.witness1_father_name_en || record?.witness1_father_name || "";
  const witness2Name = record?.witness2_name_en || record?.witness2_name || "";
  const witness2FatherName = record?.witness2_father_name_en || record?.witness2_father_name || "";

  return {
    groom_full_name: `Janab ${groomName} son of ${groomFatherName}`,
    bride_full_name: `Janaba ${brideName} daughter of ${brideFatherName}`,
    groom_name: groomName,
    groom_father_name: groomFatherName,
    bride_name: brideName,
    bride_father_name: brideFatherName,
    ceremony_date: `${String(record?.gregorian_day ?? "").padStart(2, "0")}.${getGregorianMonthEnShort(record?.gregorian_month)}.${record?.gregorian_year ?? ""}`,
    day_name: getDayNameEn(record?.day_name, record?.day_name_en),
    time_text: `${record?.time_of_event ?? ""} ${
      record?.day_night === "பகல்" ? "AM" : record?.day_night === "இரவு" ? "PM" : record?.day_night ?? ""
    }`.trim(),
    hijri_text: `Hijri ${record?.hijri_year ?? ""} ${getHijriMonthEn(record?.hijri_month)} ${record?.hijri_day ?? ""}`.trim(),
    venue: record?.place_of_marriage_en || record?.place_of_marriage || "INPT Jumma Mosque, Ilayangudi",
    register_page_number: record?.register_page_number || "-",
    wali_name: record?.wali_name_en || record?.wali_name || "",
    mahr: record?.mahr_en || record?.mahr || "",
    witness1: witness1FatherName ? `${witness1Name} son of ${witness1FatherName}` : witness1Name,
    witness2: witness2FatherName ? `${witness2Name} son of ${witness2FatherName}` : witness2Name,
    kathib_name: record?.kathib_name_en || record?.kathib_thaib_name || "",
    certificate_date: new Date().toLocaleDateString("en-GB"),
  };
};

/* ------------------------------------------------------------------ */
/* NOC certificate                                                     */
/* ------------------------------------------------------------------ */

const NOC_FIELDS: CertificateBodyField[] = [
  { serial: 1, key: "father_name", label: "விண்ணப்பதாரர் தந்தை பெயர் / Applicant father name" },
  { serial: 2, key: "applicant_relationship", label: "உறவுமுறை / Applicant relationship" },
  { serial: 3, key: "applicant_name", label: "விண்ணப்பதாரர் பெயர் / Applicant name" },
  { serial: 4, key: "applicant_role", label: "மணமகனுக்கும் / மணமகளுக்கும் / Groom or Bride word" },
  { serial: 5, key: "partner_father_name", label: "இணையர் தந்தை பெயர் / Partner father name" },
  { serial: 6, key: "partner_applicant_relationship", label: "இணையர் உறவுமுறை / Partner relationship" },
  { serial: 7, key: "partner_name", label: "இணையர் பெயர் / Partner name" },
  { serial: 8, key: "partner_category", label: "இணையர் வகை / Partner category" },
  { serial: 9, key: "mosque_to_submit", label: "சமர்ப்பிக்கும் பள்ளி / Mosque to submit" },
  { serial: 10, key: "address_to_submit", label: "சமர்ப்பிக்கும் முகவரி / Address to submit" },
  { serial: 11, key: "certificate_date", label: "சான்றிதழ் தேதி / Certificate date (dd/mm/yyyy)" },
];

const DEFAULT_NOC_BODY =
  "எங்களது I. N. P. T. ஜமாத்தைச் சேர்ந்த @F1 என்பவரது @F2 @F3 என்ற @F4 தங்கள் முஹல்லாவைச் சேர்ந்த @F5 என்பவரது @F6 @F7 என்ற @F8 ஷரியத் முறைப்படி திருமணம் செய்து வைப்பதற்கு எங்களுக்கு எவ்வித ஆட்சேபனையும் இல்லை என்பதை இதன் மூலம் தங்களுக்குத் தெரியப்படுத்திக்கொள்கிறோம்.";

const buildNocValues = (record: any): Record<string, string> => ({
  father_name: record?.father_name || "",
  applicant_relationship: record?.applicant_relationship || "",
  applicant_name: record?.applicant_name || "",
  applicant_role: record?.applicant_relationship === "மகன்" ? "மணமகனுக்கும்" : "மணமகளுக்கும்",
  partner_father_name: record?.partner_father_name || "",
  partner_applicant_relationship: record?.partner_applicant_relationship || "",
  partner_name: record?.partner_name || "",
  partner_category: record?.partner_category || "",
  mosque_to_submit: record?.mosque_to_submit || "",
  address_to_submit: record?.address_to_submit || "",
  certificate_date: new Date().toLocaleDateString("en-GB"),
});

/* ------------------------------------------------------------------ */
/* Heir certificate                                                    */
/* ------------------------------------------------------------------ */

const HEIR_FIELDS: CertificateBodyField[] = [
  { serial: 1, key: "deceased_name", label: "இறந்தவர் பெயர் / Deceased name" },
  { serial: 2, key: "deceased_father_name", label: "இறந்தவர் தந்தை பெயர் / Deceased father name" },
  { serial: 3, key: "deceased_address", label: "முகவரி / Address" },
  { serial: 4, key: "register_number", label: "பதிவு எண் / Register number" },
  { serial: 5, key: "certificate_date", label: "சான்றிதழ் தேதி / Certificate date (dd/mm/yyyy)" },
  { serial: 6, key: "applicant_name", label: "விண்ணப்பதாரர் பெயர் / Applicant name" },
  { serial: 7, key: "heirs_count", label: "வாரிசுகள் எண்ணிக்கை / Number of heirs" },
];

const DEFAULT_HEIR_BODY =
  "சிவகங்கை மாவட்டம், இளையான்குடி டவுன், @F3 தெருவில் வசித்து வந்த எங்கள் ஜமாஅத்தைச் சார்ந்த @F2 மகன்/மகள் @F1 அவர்களுக்கு கீழ்க்கண்ட நபர்கள் உறவு முறையில் உள்ளவர்கள் என சான்றளிக்கப்படுகிறது.";

const buildHeirValues = (record: any): Record<string, string> => {
  let heirsCount = 0;
  try {
    const heirs = typeof record?.heirs === "string" ? JSON.parse(record.heirs) : record?.heirs || [];
    heirsCount = Array.isArray(heirs) ? heirs.filter((h: any) => h?.name).length : 0;
  } catch {
    heirsCount = 0;
  }

  return {
    deceased_name: record?.deceased_name || "",
    deceased_father_name: record?.deceased_father_name || "",
    deceased_address: record?.deceased_address || "",
    register_number: record?.register_number || "",
    certificate_date: record?.certificate_date
      ? new Date(record.certificate_date).toLocaleDateString("en-GB")
      : "",
    applicant_name: record?.applicant_name || "",
    heirs_count: String(heirsCount),
  };
};

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const CERTIFICATE_BODY_CONFIGS: Record<CertificateBodyType, CertificateBodyConfig> = {
  death: {
    type: "death",
    label: "இறப்புச் சான்றிதழ் / Death Certificate",
    settingKey: DEATH_CERT_BODY_SETTING_KEY,
    fields: DEATH_CERT_FIELDS,
    defaultTemplate: DEFAULT_DEATH_CERT_BODY,
    buildValues: buildDeathCertificateValues,
  },
  marriage: {
    type: "marriage",
    label: "திருமணச் சான்றிதழ் / Marriage Certificate",
    settingKey: "marriage_cert_body_text",
    fields: MARRIAGE_FIELDS,
    defaultTemplate: DEFAULT_MARRIAGE_BODY,
    buildValues: buildMarriageValues,
  },
  outside_marriage: {
    type: "outside_marriage",
    label: "வெளியூர் திருமணச் சான்றிதழ் / Outside Marriage Certificate",
    settingKey: "outside_marriage_cert_body_text",
    fields: MARRIAGE_FIELDS,
    defaultTemplate: DEFAULT_MARRIAGE_BODY,
    buildValues: buildMarriageValues,
  },
  noc: {
    type: "noc",
    label: "தடையில்லா சான்றிதழ் / NOC Certificate",
    settingKey: "noc_cert_body_text",
    fields: NOC_FIELDS,
    defaultTemplate: DEFAULT_NOC_BODY,
    buildValues: buildNocValues,
  },
  heir: {
    type: "heir",
    label: "வாரிசு சான்றிதழ் / Heir Certificate",
    settingKey: "heir_cert_body_text",
    fields: HEIR_FIELDS,
    defaultTemplate: DEFAULT_HEIR_BODY,
    buildValues: buildHeirValues,
  },
};

export const CERTIFICATE_BODY_TYPES = Object.values(CERTIFICATE_BODY_CONFIGS);

/** Replace @F<serial> tokens with the matching record values */
export const renderCertificateBody = (
  type: CertificateBodyType,
  template: string,
  record: any
): string => {
  const config = CERTIFICATE_BODY_CONFIGS[type];
  const values = config.buildValues(record);
  return template.replace(/@F(\d+)/g, (match, serial) => {
    const field = config.fields.find((f) => f.serial === Number(serial));
    if (!field) return match;
    return values[field.key] ?? "";
  });
};

/** Fetch the configured body text (falls back to the default template) */
export const getCertificateBodyTemplate = async (type: CertificateBodyType): Promise<string> => {
  const config = CERTIFICATE_BODY_CONFIGS[type];
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", config.settingKey)
      .maybeSingle();
    if (error || !data?.value?.trim()) return config.defaultTemplate;
    return data.value;
  } catch {
    return config.defaultTemplate;
  }
};

/** Fetch + render, returning non-empty lines */
export const getRenderedCertificateBody = async (
  type: CertificateBodyType,
  record: any
): Promise<string[]> => {
  const template = await getCertificateBodyTemplate(type);
  return renderCertificateBody(type, template, record)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};
