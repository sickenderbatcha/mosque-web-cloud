import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OutsideMarriageRecord } from "@/utils/outsideMarriageCertificatePdf";
import { getCertificateImages, CertificateImages } from "@/lib/certificateImages";
import { getCertificateSignatureSettings, CertificateSignatureSettings, DEFAULT_CERTIFICATE_SIGNATURE } from "@/lib/certificateSignatureSettings";
import { getCertificateHeaderSettings, CertificateHeaderSettings, DEFAULT_CERTIFICATE_HEADER } from "@/lib/certificateHeaderSettings";
import { generateOutsideMarriageCertificateNumber } from "@/components/admin/OutsideMarriageCertificateNumberSettings";
import CertificateFooterBlock from "@/components/CertificateFooterBlock";
import { getRenderedCertificateBody } from "@/lib/certificateBody";

interface TrusteeInfo {
  name: string;
  qualification: string;
}

const getGregorianMonthEnShort = (month: string): string => {
  const m = month.trim();
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
  const m = month.trim();
  const map: Record<string, string> = {
    "முஹர்ரம்": "Muharram", "சஃபர்": "Safar", "ரபி உல் அவ்வல்": "Rabi' al-Awwal",
    "ரபி உல் ஆகிர்": "Rabi' al-Thani", "ஜுமாதல் அவ்வல்": "Jumada al-Awwal",
    "ஜுமாதல் ஆகிர்": "Jumada al-Thani", "ரஜப்": "Rajab", "ஷஅபான்": "Sha'ban",
    "ரமலான்": "Ramadan", "ஷவ்வால்": "Shawwal", "துல் காதா": "Dhu al-Qa'dah",
    "துல் ஹிஜ்ஜா": "Dhu al-Hijjah",
  };
  return map[m] || m;
};

const getDayNameEn = (dayNameTamil: string, dayNameEn: string | null): string => {
  if (dayNameEn) return dayNameEn;
  const dayMapping: { [key: string]: string } = {
    "ஞாயிறு": "Sunday", "திங்கள்": "Monday", "செவ்வாய்": "Tuesday",
    "புதன்": "Wednesday", "வியாழன்": "Thursday", "வெள்ளி": "Friday", "சனி": "Saturday",
  };
  return dayMapping[dayNameTamil] || dayNameTamil;
};

interface Props {
  record: OutsideMarriageRecord;
}

export default function OutsideMarriageCertificatePreview({ record }: Props) {
  const [trustee, setTrustee] = useState<TrusteeInfo>({ name: "", qualification: "" });
  const [serialNumber, setSerialNumber] = useState<string>("");
  const [images, setImages] = useState<CertificateImages>({
    signatureUrl: "/images/trustee-signature.jpg",
    sealUrl: "/images/mosque-stamp.jpg",
  });
  const [headerSettings, setHeaderSettings] = useState<CertificateHeaderSettings>(DEFAULT_CERTIFICATE_HEADER);
  const [signatureSettings, setSignatureSettings] = useState<CertificateSignatureSettings>(DEFAULT_CERTIFICATE_SIGNATURE);
  const [bodyLines, setBodyLines] = useState<string[]>([]);

  useEffect(() => {
    getRenderedCertificateBody("outside_marriage", record).then(setBodyLines);
  }, [record]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["certificate_trustee_name", "certificate_trustee_qualification"]);

      if (data) {
        const nameRow = data.find(r => r.key === "certificate_trustee_name");
        const qualRow = data.find(r => r.key === "certificate_trustee_qualification");
        setTrustee({
          name: nameRow?.value || "",
          qualification: qualRow?.value || "",
        });
      }
    };

    const fetchCertificateNumber = async () => {
      const certNumber = await generateOutsideMarriageCertificateNumber();
      setSerialNumber(certNumber);
    };

    fetchSettings();
    fetchCertificateNumber();
    getCertificateImages().then(setImages);
    getCertificateSignatureSettings().then(setSignatureSettings);
    getCertificateHeaderSettings().then(setHeaderSettings);
  }, [record]);

  const groomName = record.groom_name_en || record.groom_name;
  const groomFatherName = record.groom_father_name_en || record.groom_father_name;
  const brideName = record.bride_name_en || record.bride_name;
  const brideFatherName = record.bride_father_name_en || record.bride_father_name;
  const waliName = record.wali_name_en || record.wali_name;
  const mahrDetails = record.mahr_en || record.mahr;
  const witness1Name = record.witness1_name_en || record.witness1_name;
  const witness1FatherName = record.witness1_father_name_en || record.witness1_father_name;
  const witness2Name = record.witness2_name_en || record.witness2_name;
  const witness2FatherName = record.witness2_father_name_en || record.witness2_father_name;
  const kathibName = record.kathib_name_en || record.kathib_thaib_name;
  const venue = record.place_of_marriage_en || record.place_of_marriage || "INPT Jumma Mosque, Ilayangudi";
  const dayNameEn = getDayNameEn(record.day_name, record.day_name_en);

  const groomFullName = `Janab ${groomName} son of ${groomFatherName}`;
  const brideFullName = `Janaba ${brideName} daughter of ${brideFatherName}`;
  const ceremonyDate = `${String(record.gregorian_day).padStart(2, "0")}.${getGregorianMonthEnShort(record.gregorian_month)}.${record.gregorian_year}`;
  const timeText = `${record.time_of_event} ${record.day_night === "பகல்" ? "AM" : record.day_night === "இரவு" ? "PM" : record.day_night}`;
  const hijriText = `Hijri ${record.hijri_year} ${getHijriMonthEn(record.hijri_month)} ${record.hijri_day}`;
  const registerPageNo = record.register_page_number || "-";
  const certificateDate = new Date().toLocaleDateString("en-GB");

  const trusteeText = trustee.name
    ? `${trustee.name}${trustee.qualification ? `, ${trustee.qualification}` : ""}`
    : "Managing Trustee";

  return (
    <div className="bg-white text-black p-6 rounded-lg border shadow-sm" style={{ fontFamily: "'Times New Roman', serif" }}>
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-sm font-bold">{headerSettings.titleEn.toUpperCase()}</h1>
        <p className="text-xs font-bold" style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}>
          {headerSettings.titleTa}
        </p>
      </div>

      {/* Address Row */}
      <div className="flex justify-between gap-4 mb-3 text-[10px]">
        <div className="text-left" style={{ fontFamily: "'Noto Sans Tamil', sans-serif" }}>
          {headerSettings.officeAddressTa.map((line, index) => (
            <span key={index}>
              {index === 0 ? <strong>{line}</strong> : line}
              {index < headerSettings.officeAddressTa.length - 1 && <br />}
            </span>
          ))}
        </div>
        <div className="text-right">
          {headerSettings.officeAddressEn.map((line, index) => (
            <span key={index}>
              {index === 0 ? <strong>{line}</strong> : line}
              {index < headerSettings.officeAddressEn.length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t-2 border-black my-3" />

      <div className="flex justify-between items-start mb-3 text-xs font-bold">
        <p>No: {serialNumber || "Loading..."}</p>
        <p>Date: {certificateDate}</p>
      </div>

      <div className="flex justify-between items-start mb-4 text-xs">
        <div>
          <p className="font-bold">{trusteeText}</p>
          <p className="text-[10px]">Managing Trustee.</p>
        </div>
      </div>

      <div className="text-center mb-4">
        <h2 className="text-base font-bold underline">MARRIAGE CERTIFICATE</h2>
      </div>

      <div className="text-xs leading-relaxed mb-4">
        {bodyLines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      <div className="text-xs space-y-1 mb-6">
        <p><strong>Wali:</strong> {waliName}</p>
        <p><strong>Mahar:</strong> {mahrDetails}</p>
        <p><strong>Witnesses:</strong></p>
        <div className="ml-4">
          <p>1. {witness1Name} son of {witness1FatherName}</p>
          <p>2. {witness2Name} son of {witness2FatherName}</p>
        </div>
        {kathibName && <p><strong>Qathib:</strong> Moulvi {kathibName}</p>}
      </div>

      <div className="flex justify-between items-end mt-8">
        <div className="w-20 h-20 rounded-full overflow-hidden">
          <img
            src={images.sealUrl}
            alt="Official Seal"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="text-right">
          <img
            src={images.signatureUrl}
            alt="Trustee Signature"
            className="h-12 ml-auto mb-1 object-contain"
            loading="lazy"
          />
          <p className="font-bold text-xs">{signatureSettings.designationEn}</p>
          {signatureSettings.linesEn.map((line, i) => (
            <p key={i} className="text-[10px]">{line}</p>
          ))}
        </div>
      </div>

      <div className="text-center mt-6 text-[8px] text-muted-foreground print:hidden">
        <p>Preview - முன்னோட்டம்</p>
      </div>
    <CertificateFooterBlock type="outside_marriage" />
    </div>
  );
}
