import { useState, useEffect } from "react";
import { DeathRecord } from "@/utils/deathCertificatePdf";
import { format, parseISO } from "date-fns";
import { getCertificateImages, CertificateImages } from "@/lib/certificateImages";
import { getCertificateSignatureSettings, CertificateSignatureSettings, DEFAULT_CERTIFICATE_SIGNATURE } from "@/lib/certificateSignatureSettings";
import { getCertificateHeaderSettings, CertificateHeaderSettings, DEFAULT_CERTIFICATE_HEADER } from "@/lib/certificateHeaderSettings";
import CertificateFooterBlock from "@/components/CertificateFooterBlock";

interface Props {
  record: DeathRecord;
}

const DEFAULT_SIGNATURE = "/images/mosque-stamp.jpg";
const DEFAULT_SEAL = "/images/mosque-stamp.jpg";

// Helper to format current date
const formatCurrentDate = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper to format death date
const formatDeathDate = (dateStr: string): string => {
  try {
    const date = parseISO(dateStr);
    return format(date, "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
};

export default function DeathCertificatePreview({ record }: Props) {
  const [images, setImages] = useState<CertificateImages>({
    signatureUrl: DEFAULT_SIGNATURE,
    sealUrl: DEFAULT_SEAL,
  });
  const [headerSettings, setHeaderSettings] = useState<CertificateHeaderSettings>(DEFAULT_CERTIFICATE_HEADER);
  const [signatureSettings, setSignatureSettings] = useState<CertificateSignatureSettings>(DEFAULT_CERTIFICATE_SIGNATURE);

  useEffect(() => {
    getCertificateImages().then(setImages);
    getCertificateSignatureSettings().then(setSignatureSettings);
    getCertificateHeaderSettings().then(setHeaderSettings);
  }, []);

  // Determine if husband name should be shown
  const hasHusbandName = record.deceased_husband_name && record.deceased_husband_name.trim() !== "";
  const parentLabel = hasHusbandName ? "க/பெ" : "த/பெ";
  const parentName = hasHusbandName ? record.deceased_husband_name : record.deceased_father_name;
  
  // Parse address for street
  const addressParts = record.deceased_address ? record.deceased_address.split(',') : [""];
  const street = addressParts[0]?.trim() || record.deceased_address || "";
  
  // Burial place
  const burialPlace = record.burial_place_en || record.burial_place || "I.N.P.T";
  
  const currentDate = formatCurrentDate();
  const deathDate = formatDeathDate(record.death_date);

  return (
    <div 
      className="bg-white text-black p-6 rounded-lg border shadow-sm max-w-2xl mx-auto font-tamil"
    >
      {/* Bismillah */}
      <div className="text-center mb-2">
        <p className="text-lg font-semibold text-emerald-700" style={{ fontFamily: "'Scheherazade New', 'Amiri', serif" }}>
          {headerSettings.bismillah}
        </p>
      </div>

      {/* Mosque Name */}
      <div className="text-center mb-2">
        <h1 className="text-sm font-bold font-tamil">{headerSettings.titleTa}</h1>
        <p className="text-xs font-bold">{headerSettings.titleEn}</p>
      </div>

      {/* Main Address */}
      <div className="text-center mb-2">
        <p className="text-[10px]">{headerSettings.addressTa}</p>
      </div>

      {/* Address Row - Two Columns */}
      <div className="flex justify-between gap-4 mb-2 text-[9px]">
        <div className="text-left">
          {headerSettings.officeAddressTa.map((line, index) => (
            <p key={index}>{index === 0 ? <strong>{line}</strong> : line}</p>
          ))}
        </div>
        <div className="text-right">
          {headerSettings.officeAddressEn.map((line, index) => (
            <p key={index}>{index === 0 ? <strong>{line}</strong> : line}</p>
          ))}
        </div>
      </div>

      {/* Date Row */}
      <div className="flex justify-end mb-3 text-sm">
        <div className="font-bold">
          <span>நாள்: </span>
          <span style={{ fontFamily: "'Times New Roman', serif" }}>{currentDate}</span>
        </div>
      </div>

      {/* Certificate Title */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold font-tamil">இறப்புச்சான்றிதழ்</h2>
      </div>

      {/* Certificate Body */}
      <div className="text-sm leading-tight text-right" dir="rtl">
        <p className="text-[13px] leading-relaxed text-justify" dir="ltr">
          <span className="font-medium">{record.deceased_name}, {parentLabel}. {parentName}, {street}</span> என்ற முகவரியை சார்ந்த நபர் கடந்த{" "}
          <span className="font-medium" style={{ fontFamily: "'Times New Roman', serif" }}>{deathDate}</span>{" "}
          அன்று மரணமடைந்துவிட்டார். அன்னாரது உடல் எங்களது{" "}
          <span style={{ fontFamily: "'Times New Roman', serif" }}>{burialPlace}</span>{" "}
          மையய வாடியில்தான் அடக்கம் செய்யப்பட்டுள்ளது என்பதற்கு கொடுக்கலான சான்று.
        </p>
      </div>

      {/* Signature Section */}
      <div className="flex justify-between items-end mt-12 pt-4">
        {/* Seal on the left */}
        <div className="w-16 h-16 rounded-full overflow-hidden border">
          <img 
            src={images.sealUrl || DEFAULT_SEAL} 
            alt="Official Seal" 
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_SEAL;
            }}
          />
        </div>
        
        {/* Signature on the right */}
        <div className="text-right">
          <img 
            src={images.signatureUrl || DEFAULT_SIGNATURE} 
            alt="Trustee Signature" 
            className="h-12 ml-auto mb-1 object-contain"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_SIGNATURE;
            }}
          />
          <p className="font-bold text-sm">{signatureSettings.designationTa}</p>
          {signatureSettings.linesTa.map((line, i) => (
            <p key={i} className="text-[11px]">{line}</p>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-[8px] text-gray-400">
        <p>Preview - இது முன்னோட்டம் மட்டுமே</p>
      </div>
    <CertificateFooterBlock type="death" />
    </div>
  );
}
