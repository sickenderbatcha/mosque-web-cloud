import { supabase } from "@/integrations/supabase/client";

export interface CertificateHeaderSettings {
  bismillah: string;
  titleTa: string;
  titleEn: string;
  addressTa: string;
  addressEn: string;
  officeAddressTa: string[];
  officeAddressEn: string[];
}

// Default header values
const DEFAULT_HEADER: CertificateHeaderSettings = {
  bismillah: "بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ",
  titleTa: "இளையான்குடி நெசவுபட்டடை தொழுகை மேடை பள்ளிவாசல்",
  titleEn: "Ilayangudi Nesavupattadai Thozhugai Medai Pallivasal",
  addressTa: "எண்: 115, காமராசர் சாலை, இளையான்குடி - 630702. சிவகங்கை மாவட்டம்.",
  addressEn: "No. 115, Kamarajar Salai, Ilayangudi - 630702. Sivagangai District.",
  officeAddressTa: [
    "அலுவலகம் :",
    "நிர் 11, பக்கீர் ராவுத்தர் தெரு,",
    "இளையான்குடி - 630702.",
    "சிவகங்கை மாவட்டம், தமிழ்நாடு.",
    "📞: 04564 - 265720"
  ],
  officeAddressEn: [
    "Office :",
    "No. 11, Packeer Rowther Street,",
    "ILAYANGUDI - 630702.",
    "Sivagangai Dist, Tamilnadu.",
    "Tel: 04564 - 265720"
  ]
};

// Keys used in app_settings
const SETTING_KEYS = {
  bismillah: "cert_header_bismillah",
  titleTa: "cert_header_title_ta",
  titleEn: "cert_header_title_en",
  addressTa: "cert_header_address_ta",
  addressEn: "cert_header_address_en",
  officeAddressTa: "cert_header_office_address_ta",
  officeAddressEn: "cert_header_office_address_en",
};

// No-op for backward compatibility
export const clearCertificateHeaderCache = () => {};

export const getCertificateHeaderSettings = async (): Promise<CertificateHeaderSettings> => {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", Object.values(SETTING_KEYS));

    if (error) {
      console.error("Error fetching certificate header settings:", error);
      return DEFAULT_HEADER;
    }

    const settings: CertificateHeaderSettings = { ...DEFAULT_HEADER };

    if (data && data.length > 0) {
      data.forEach((item) => {
        switch (item.key) {
          case SETTING_KEYS.bismillah:
            if (item.value) settings.bismillah = item.value;
            break;
          case SETTING_KEYS.titleTa:
            if (item.value) settings.titleTa = item.value;
            break;
          case SETTING_KEYS.titleEn:
            if (item.value) settings.titleEn = item.value;
            break;
          case SETTING_KEYS.addressTa:
            if (item.value) settings.addressTa = item.value;
            break;
          case SETTING_KEYS.addressEn:
            if (item.value) settings.addressEn = item.value;
            break;
          case SETTING_KEYS.officeAddressTa:
            if (item.value) {
              try {
                const parsed = JSON.parse(item.value);
                if (Array.isArray(parsed)) settings.officeAddressTa = parsed;
              } catch {
                // Keep default if parsing fails
              }
            }
            break;
          case SETTING_KEYS.officeAddressEn:
            if (item.value) {
              try {
                const parsed = JSON.parse(item.value);
                if (Array.isArray(parsed)) settings.officeAddressEn = parsed;
              } catch {
                // Keep default if parsing fails
              }
            }
            break;
        }
      });
    }

    return settings;
  } catch (error) {
    console.error("Error fetching certificate header settings:", error);
    return DEFAULT_HEADER;
  }
};

// Export setting keys for admin component
export const CERTIFICATE_HEADER_SETTING_KEYS = SETTING_KEYS;
export const DEFAULT_CERTIFICATE_HEADER = DEFAULT_HEADER;
