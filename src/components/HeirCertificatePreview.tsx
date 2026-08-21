import { useState, useEffect } from "react";
import { HeirRecord, Heir } from "@/utils/heirCertificatePdf";
import { getCertificateImages, CertificateImages } from "@/lib/certificateImages";
import { getCertificateSignatureSettings, CertificateSignatureSettings, DEFAULT_CERTIFICATE_SIGNATURE } from "@/lib/certificateSignatureSettings";
import { getCertificateHeaderSettings, CertificateHeaderSettings, DEFAULT_CERTIFICATE_HEADER } from "@/lib/certificateHeaderSettings";

interface HeirCertificatePreviewProps {
  record: HeirRecord;
}

const DEFAULT_SIGNATURE = "/images/trustee-signature.jpg";
const DEFAULT_SEAL = "/images/mosque-stamp.jpg";

export default function HeirCertificatePreview({ record }: HeirCertificatePreviewProps) {
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

  // Parse heirs if it's a string
  const heirs: Heir[] = typeof record.heirs === 'string' 
    ? JSON.parse(record.heirs) 
    : (record.heirs || []);

  // Pad to 10 rows
  const paddedHeirs = [...heirs];
  while (paddedHeirs.length < 10) {
    paddedHeirs.push({ name: "", relationship: "", age: "", marriage_eligibility: "" });
  }

  const certDate = record.certificate_date 
    ? new Date(record.certificate_date).toLocaleDateString("en-GB")
    : "...........................";

  return (
    <div className="bg-white p-8 border rounded-lg shadow-sm max-w-[210mm] w-full mx-auto print:shadow-none print:border-0 font-tamil overflow-x-hidden box-border">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-sm mb-1" style={{ fontFamily: "Arial, sans-serif" }}>
          {headerSettings.bismillah}
        </p>
        <h1 className="text-lg font-bold">
          {headerSettings.titleTa}
        </h1>
        <h2 className="text-sm font-bold">
          {headerSettings.titleEn}
        </h2>
        <p className="text-xs mt-1">
          {headerSettings.addressTa}
        </p>
      </div>

      {/* Two Column Address */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div>
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

      {/* Register Number and Date */}
      <div className="flex justify-between mb-2 text-sm">
        <span className="font-bold">{record.register_number || "___"}</span>
        <span className="mr-10">நாள்: {certDate}</span>
      </div>

      {/* Divider */}
      <hr className="border-t border-black mb-6" />

      {/* Title */}
      <h2 className="text-xl font-bold text-center mb-6">வாரிசு சான்றிதழ்</h2>

      {/* Body Text */}
      <div className="text-sm leading-relaxed mb-6 text-justify">
        <p>
          சிவகங்கை மாவட்டம், இளையான்குடி டவுன், <span className="font-semibold">{record.deceased_address}</span>{" "}
          தெருவில் வசித்து வந்த எங்கள் ஜமாஅத்தைச் சார்ந்த{" "}
          <span className="font-semibold">{record.deceased_father_name}</span> மகன்/மகள்{" "}
          <span className="font-semibold">{record.deceased_name}</span>{" "}
          அவர்களுக்கு கீழ்க்கண்ட நபர்கள் உறவு முறையில் உள்ளவர்கள் என சான்றளிக்கப்படுகிறது.
        </p>
      </div>

      {/* Heirs Table */}
      <table className="w-full border-collapse border border-black text-sm mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black px-2 py-1.5 w-12">வ.எண்</th>
            <th className="border border-black px-2 py-1.5">பெயர்</th>
            <th className="border border-black px-2 py-1.5 w-28">உறவுமுறை</th>
            <th className="border border-black px-2 py-1.5 w-16">வயது</th>
            <th className="border border-black px-2 py-1.5 w-28">திருமண தகுதி</th>
          </tr>
        </thead>
        <tbody>
          {paddedHeirs.map((heir, index) => (
            <tr key={index}>
              <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
              <td className="border border-black px-2 py-1 max-w-[140px] truncate" title={heir.name}>
                <span className="block truncate text-[clamp(8px,2vw,14px)]">{heir.name}</span>
              </td>
              <td className="border border-black px-2 py-1 max-w-[100px]">
                <span className="block truncate text-[clamp(8px,2vw,14px)]">{heir.relationship}</span>
              </td>
              <td className="border border-black px-2 py-1 text-center">{heir.age}</td>
              <td className="border border-black px-2 py-1 max-w-[100px]">
                <span className="block truncate text-[clamp(8px,2vw,14px)]">{heir.marriage_eligibility}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
        <div className="text-right text-sm">
          <img 
            src={images.signatureUrl} 
            alt="Trustee Signature" 
            className="h-12 ml-auto mb-1 object-contain"
            loading="lazy"
          />
          <p className="font-bold">{signatureSettings.designationTa}</p>
          {signatureSettings.linesTa.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
