import { useState, useEffect } from "react";
import { NocRecord } from "@/utils/nocCertificatePdf";
import { getCertificateImages, CertificateImages } from "@/lib/certificateImages";
import { getCertificateHeaderSettings, CertificateHeaderSettings, DEFAULT_CERTIFICATE_HEADER } from "@/lib/certificateHeaderSettings";

interface NocCertificatePreviewProps {
  record: NocRecord;
}

const DEFAULT_SIGNATURE = "/images/trustee-signature.jpg";
const DEFAULT_SEAL = "/images/mosque-stamp.jpg";

export default function NocCertificatePreview({ record }: NocCertificatePreviewProps) {
  const [images, setImages] = useState<CertificateImages>({
    signatureUrl: DEFAULT_SIGNATURE,
    sealUrl: DEFAULT_SEAL,
  });
  const [headerSettings, setHeaderSettings] = useState<CertificateHeaderSettings>(DEFAULT_CERTIFICATE_HEADER);

  useEffect(() => {
    getCertificateImages().then(setImages);
    getCertificateHeaderSettings().then(setHeaderSettings);
  }, []);

  return (
    <div className="bg-white p-8 border rounded-lg shadow-sm max-w-[210mm] mx-auto print:shadow-none print:border-0">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-lg font-bold font-tamil">
          {headerSettings.titleTa}
        </h1>
        <h2 className="text-sm font-bold">
          {headerSettings.titleEn}
        </h2>
        <p className="text-xs font-tamil mt-1">
          {headerSettings.addressTa}
        </p>
      </div>

      {/* Two Column Address */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div className="font-tamil">
          {headerSettings.officeAddressTa.map((line, index) => (
            <p key={index} className={index === 0 ? "font-semibold" : ""}>
              {line}
            </p>
          ))}
        </div>
        <div>
          {headerSettings.officeAddressEn.map((line, index) => (
            <p key={index} className={index === 0 ? "font-semibold" : ""}>
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Divider */}
      <hr className="border-t border-black mb-6" />

      {/* Greeting */}
      <p className="font-bold font-tamil text-base mb-6">அஸ்ஸலாமு அலைக்கும்</p>

      {/* Recipient */}
      <div className="font-tamil text-sm mb-4 leading-relaxed">
        <p>மேனேஜிங் டிரஸ்ட்டி,</p>
        <p>{record.mosque_to_submit},</p>
        <p>{record.address_to_submit} அவர்களுக்கு,</p>
      </div>

      {/* Body */}
      <div className="font-tamil text-sm leading-relaxed mb-8 text-justify w-full">
        <p>
          எங்களது I. N. P. T. ஜமாத்தைச் சேர்ந்த <span className="font-semibold">{record.father_name}</span> என்பவரது {record.applicant_relationship} <span className="font-semibold">{record.applicant_name}</span> என்ற {record.applicant_relationship === "மகன்" ? "மணமகனுக்கும்" : "மணமகளுக்கும்"} தங்கள் முஹல்லாவைச் சேர்ந்த <span className="font-semibold">{record.partner_father_name}</span> என்பவரது {record.partner_applicant_relationship} <span className="font-semibold">{record.partner_name}</span> என்ற {record.partner_category} ஷரியத் முறைப்படி திருமணம் செய்து வைப்பதற்கு எங்களுக்கு எவ்வித ஆட்சேபனையும் இல்லை என்பதை இதன் மூலம் தங்களுக்குத் தெரியப்படுத்திக்கொள்கிறோம்.
        </p>
      </div>

      {/* Signature Section */}
      <div className="flex justify-between items-end mt-12">
        {/* Seal on the left */}
        <div className="w-20 h-20 rounded-full overflow-hidden">
          <img 
            src={images.sealUrl} 
            alt="Official Seal" 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        
        {/* Signature on the right */}
        <div className="text-right font-tamil text-sm">
          <img 
            src={images.signatureUrl} 
            alt="Trustee Signature" 
            className="h-12 ml-auto mb-1 object-contain"
            loading="lazy"
          />
          <p className="font-bold">மேனேஜிங் டிரஸ்ட்டி</p>
          <p>{headerSettings.titleTa.split(' ')[0]} நெசவுப் பட்டடை</p>
          <p>தொழுகை மேடைப் பள்ளிவாசல்</p>
          <p>{headerSettings.titleTa.split(' ')[0]}</p>
        </div>
      </div>
    </div>
  );
}
