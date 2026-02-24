import { supabase } from "@/integrations/supabase/client";

export interface CertificateImages {
  signatureUrl: string;
  sealUrl: string;
}

// Default fallback images
const DEFAULT_SIGNATURE = "/images/trustee-signature.svg";
const DEFAULT_SEAL = "/images/mosque-stamp.jpg";

export const getCertificateImages = async (): Promise<CertificateImages> => {
  try {
    let signatureUrl = DEFAULT_SIGNATURE;
    let sealUrl = DEFAULT_SEAL;

    const cacheBuster = Date.now();

    // Fetch signature from storage
    const { data: signatureData } = await supabase.storage
      .from("certificate-assets")
      .list("", { search: "trustee-signature" });

    const signatureFile = signatureData?.find((f) =>
      f.name.toLowerCase().startsWith("trustee-signature.")
    );

    if (signatureFile) {
      const { data: signatureUrlData } = supabase.storage
        .from("certificate-assets")
        .getPublicUrl(signatureFile.name);
      signatureUrl = `${signatureUrlData.publicUrl}?t=${cacheBuster}`;
    }

    // Fetch seal from storage
    const { data: sealData } = await supabase.storage
      .from("certificate-assets")
      .list("", { search: "mosque-seal" });

    const sealFile = sealData?.find((f) =>
      f.name.toLowerCase().startsWith("mosque-seal.")
    );

    if (sealFile) {
      const { data: sealUrlData } = supabase.storage
        .from("certificate-assets")
        .getPublicUrl(sealFile.name);
      sealUrl = `${sealUrlData.publicUrl}?t=${cacheBuster}`;
    }

    return { signatureUrl, sealUrl };
  } catch (error) {
    console.error("Error fetching certificate images:", error);
    return { signatureUrl: DEFAULT_SIGNATURE, sealUrl: DEFAULT_SEAL };
  }
};

// No-op for backward compatibility
export const clearCertificateImagesCache = () => {};
