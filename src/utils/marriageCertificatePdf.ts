import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { getCertificateImages } from "@/lib/certificateImages";
import { getCertificateHeaderSettings } from "@/lib/certificateHeaderSettings";
import { generateMarriageCertificateNumber } from "@/components/admin/MarriageCertificateNumberSettings";

export interface MarriageRecord {
  id: string;
  member_id: string | null;
  hijri_year: number;
  hijri_month: string;
  hijri_day: number;
  gregorian_year: number;
  gregorian_month: string;
  gregorian_day: number;
  day_name: string;
  day_name_en: string | null;
  day_night: string;
  time_of_event: string;
  place_of_marriage: string | null;
  place_of_marriage_en: string | null;
  groom_name: string;
  groom_name_en: string | null;
  groom_father_name: string;
  groom_father_name_en: string | null;
  groom_category: string | null;
  groom_address: string;
  groom_age: number;
  groom_madhab: string | null;
  bride_name: string;
  bride_name_en: string | null;
  bride_father_name: string;
  bride_father_name_en: string | null;
  bride_category: string | null;
  bride_address: string;
  bride_age: number;
  bride_madhab: string | null;
  wali_name: string;
  wali_name_en: string | null;
  wali_father_name: string;
  mahr: string;
  mahr_en: string | null;
  witness1_name: string;
  witness1_name_en: string | null;
  witness1_father_name: string;
  witness1_father_name_en: string | null;
  witness2_name: string;
  witness2_name_en: string | null;
  witness2_father_name: string;
  witness2_father_name_en: string | null;
  kathib_thaib_name: string | null;
  kathib_name_en: string | null;
  kathib_thaib_father_name: string | null;
  registrar_name: string;
  registrar_father_name: string;
  register_page_number: string | null;
  created_at: string;
}

interface TrusteeInfo {
  name: string;
  qualification: string;
}

// Helper function to render text with Tamil support using canvas
const addTextWithTamilSupport = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontWeight: "normal" | "bold" = "normal",
  align: "left" | "center" | "right" = "left"
) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const scaleFactor = 4;
  const estimatedWidth = text.length * fontSize * 1.5;
  canvas.width = estimatedWidth * scaleFactor;
  canvas.height = fontSize * 3 * scaleFactor;

  const fontFamily = "'Noto Sans Tamil', 'Latha', 'Tamil Sangam MN', 'Arial Unicode MS', sans-serif";
  ctx.font = `${fontWeight === "bold" ? "bold " : ""}${fontSize * scaleFactor}px ${fontFamily}`;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "middle";

  const textMetrics = ctx.measureText(text);
  const actualWidth = textMetrics.width / scaleFactor;

  canvas.width = (actualWidth + 10) * scaleFactor;
  ctx.font = `${fontWeight === "bold" ? "bold " : ""}${fontSize * scaleFactor}px ${fontFamily}`;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 5 * scaleFactor, (fontSize * 1.5) * scaleFactor);

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = actualWidth + 10;
  const imgHeight = fontSize * 3;

  let xPos = x;
  if (align === "center") {
    xPos = x - imgWidth / 2;
  } else if (align === "right") {
    xPos = x - imgWidth;
  }

  doc.addImage(imgData, "PNG", xPos, y - fontSize, imgWidth, imgHeight);
};

const fetchTrusteeSettings = async (): Promise<TrusteeInfo> => {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["certificate_trustee_name", "certificate_trustee_qualification"]);

  if (error || !data) return { name: "", qualification: "" };
  
  const nameRow = data.find(r => r.key === "certificate_trustee_name");
  const qualRow = data.find(r => r.key === "certificate_trustee_qualification");
  return {
    name: nameRow?.value || "",
    qualification: qualRow?.value || "",
  };
};

const fetchSerialFormat = async (): Promise<string> => {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "certificate_serial_format")
    .single();
  return data?.value || "YYYY/NNN";
};

export const generateCertificateSerialNumber = (format: string, year: number, sequence: number): string => {
  return format
    .replace("YYYY", String(year))
    .replace("NNN", String(sequence).padStart(3, "0"))
    .replace("NN", String(sequence).padStart(2, "0"))
    .replace("NNNN", String(sequence).padStart(4, "0"));
};

export const getNextCertificateSerial = async (record: MarriageRecord): Promise<string> => {
  const format = await fetchSerialFormat();
  const year = record.gregorian_year;
  
  // Count existing marriage certificates for this year to get sequence
  const { count } = await supabase
    .from("marriage_registers")
    .select("*", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01`)
    .lte("created_at", `${year}-12-31`)
    .lte("created_at", record.created_at);
  
  const sequence = count || 1;
  return generateCertificateSerialNumber(format, year, sequence);
};

const normalizeKey = (s: string) => s.trim().toLowerCase();

const getGregorianMonthEnShort = (month: string): string => {
  // Already English?
  const m = month.trim();
  const en = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const idx = en.indexOf(normalizeKey(m));
  if (idx >= 0) return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][idx];

  const taToEn: Record<string, string> = {
    "ஜனவரி": "Jan",
    "பிப்ரவரி": "Feb",
    "மார்ச்": "Mar",
    "ஏப்ரல்": "Apr",
    "மே": "May",
    "ஜூன்": "Jun",
    "ஜூலை": "Jul",
    "ஆகஸ்ட்": "Aug",
    "செப்டம்பர்": "Sep",
    "அக்டோபர்": "Oct",
    "நவம்பர்": "Nov",
    "டிசம்பர்": "Dec",
  };
  return taToEn[m] || m.substring(0, 3);
};

const getHijriMonthEn = (month: string): string => {
  const m = month.trim();
  const map: Record<string, string> = {
    "முஹர்ரம்": "Muharram",
    "முஹர்ரம் (முதல்)": "Muharram",
    "சஃபர்": "Safar",
    "ரபி உல் அவ்வல்": "Rabi' al-Awwal",
    "ரபி உல் ஆகிர்": "Rabi' al-Thani",
    "ஜுமாதல் அவ்வல்": "Jumada al-Awwal",
    "ஜுமாதல் ஆகிர்": "Jumada al-Thani",
    "ரஜப்": "Rajab",
    "ஷஅபான்": "Sha'ban",
    "ரமலான்": "Ramadan",
    "ஷவ்வால்": "Shawwal",
    "துல் காதா": "Dhu al-Qa'dah",
    "துல் ஹிஜ்ஜா": "Dhu al-Hijjah",
  };
  return map[m] || m;
};

const formatHijriDate = (day: number, month: string, year: number) => {
  const monthEn = getHijriMonthEn(month);
  return `Hijri ${year} ${monthEn} ${day}`;
};

// English day name mapping
const getDayNameEn = (dayNameTamil: string, dayNameEn: string | null): string => {
  if (dayNameEn) return dayNameEn;
  const dayMapping: { [key: string]: string } = {
    "ஞாயிறு": "Sunday",
    "திங்கள்": "Monday",
    "செவ்வாய்": "Tuesday",
    "புதன்": "Wednesday",
    "வியாழன்": "Thursday",
    "வெள்ளி": "Friday",
    "சனி": "Saturday",
  };
  return dayMapping[dayNameTamil] || dayNameTamil;
};

export const generateMarriageCertificatePdf = async (record: MarriageRecord) => {
  // Load Tamil font first
  await document.fonts.load("16px 'Noto Sans Tamil'");
  
  // Fetch trustee settings, serial number, certificate images, and header settings
  const [trusteeInfo, serialNumber, certificateImages, headerSettings] = await Promise.all([
    fetchTrusteeSettings(),
    getNextCertificateSerial(record),
    getCertificateImages(),
    getCertificateHeaderSettings()
  ]);
  
  const { signatureUrl, sealUrl } = certificateImages;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  // ============ HEADER SECTION - Split Layout ============
  
  // Organization Name in English (center header)
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(headerSettings.titleEn.toUpperCase(), pageWidth / 2, y, { align: "center" });
  y += 7;

  // Organization Name in Tamil (center)
  addTextWithTamilSupport(doc, headerSettings.titleTa, pageWidth / 2, y, 4.5, "bold", "center");
  y += 12;

  // Split address - Tamil on left, English on right
  const leftCol = margin;
  const rightCol = pageWidth - margin;
  const rightColMaxWidth = pageWidth - margin - (pageWidth / 2 + 5);

  // Tamil address (left side) - dynamic
  const officeLinesTa = headerSettings.officeAddressTa;
  addTextWithTamilSupport(doc, officeLinesTa[0] || "அலுவலகம்:", leftCol, y, 3.5, "bold", "left");
  y += 5;
  for (let i = 1; i < officeLinesTa.length; i++) {
    addTextWithTamilSupport(doc, officeLinesTa[i], leftCol, y + (i - 1) * 4, 3, "normal", "left");
  }

  // English address (right side) - dynamic
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(headerSettings.officeAddressEn[0] || "Office:", rightCol, y, { align: "right" });
  doc.setFont("helvetica", "normal");

  const addressLines = headerSettings.officeAddressEn.slice(1);
  let addrY = y + 4;
  for (const line of addressLines) {
    const wrapped = doc.splitTextToSize(line, rightColMaxWidth);
    doc.text(wrapped, rightCol, addrY, { align: "right", maxWidth: rightColMaxWidth });
    addrY += wrapped.length * 4;
  }

  y += 28;

  // Horizontal line
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Certificate Number and Date row
  const marriageCertNumber = await generateMarriageCertificateNumber();
  const certificateDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric"
  });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`No: ${marriageCertNumber}`, margin, y);
  doc.text(`Date: ${certificateDate}`, pageWidth - margin, y, { align: "right" });
  y += 8;

  // Managing Trustee row
  const trusteeText = trusteeInfo.name
    ? `${trusteeInfo.name}${trusteeInfo.qualification ? `, ${trusteeInfo.qualification}` : ""}`
    : "Managing Trustee";
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(trusteeText, margin, y);
  y += 5;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Managing Trustee.", margin, y);
  y += 12;

  // ============ CERTIFICATE TITLE ============
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("MARRIAGE CERTIFICATE", pageWidth / 2, y, { align: "center" });
  y += 12;

  // ============ CERTIFICATE BODY - English Only ============
  const lineHeight = 7;

  const fitParagraphToLines = (
    text: string,
    width: number,
    baseFontSize: number,
    maxLines: number,
    minFontSize = 9
  ) => {
    for (let fs = baseFontSize; fs >= minFontSize; fs -= 1) {
      doc.setFontSize(fs);
      const wrapped = doc.splitTextToSize(text, width);
      if (wrapped.length <= maxLines) return { fontSize: fs, lines: wrapped as string[] };
    }
    doc.setFontSize(minFontSize);
    return { fontSize: minFontSize, lines: doc.splitTextToSize(text, width) as string[] };
  };

  const drawFittedValue = (
    value: string,
    x: number,
    yPos: number,
    width: number,
    baseFontSize: number,
    maxLines: number,
    minFontSize = 8
  ) => {
    for (let fs = baseFontSize; fs >= minFontSize; fs -= 1) {
      doc.setFontSize(fs);
      const wrapped = doc.splitTextToSize(value, width) as string[];
      if (wrapped.length <= maxLines) {
        doc.text(wrapped, x, yPos, { maxWidth: width });
        return { lines: wrapped.length, fontSize: fs };
      }
    }
    doc.setFontSize(minFontSize);
    const wrapped = doc.splitTextToSize(value, width) as string[];
    doc.text(wrapped, x, yPos, { maxWidth: width });
    return { lines: wrapped.length, fontSize: minFontSize };
  };

  // Use English fields for certificate
  const groomName = record.groom_name_en || record.groom_name;
  const groomFatherName = record.groom_father_name_en || record.groom_father_name;
  const brideName = record.bride_name_en || record.bride_name;
  const brideFatherName = record.bride_father_name_en || record.bride_father_name;
  const waliName = record.wali_name_en || record.wali_name;
  const waliFatherName = record.wali_father_name;
  const mahrDetails = record.mahr_en || record.mahr;
  const witness1Name = record.witness1_name_en || record.witness1_name;
  const witness1FatherName = record.witness1_father_name_en || record.witness1_father_name;
  const witness2Name = record.witness2_name_en || record.witness2_name;
  const witness2FatherName = record.witness2_father_name_en || record.witness2_father_name;
  const kathibName = record.kathib_name_en || record.kathib_thaib_name;
  const venue = record.place_of_marriage_en || record.place_of_marriage || "INPT Jumma Mosque, Ilayangudi";
  const dayNameEn = getDayNameEn(record.day_name, record.day_name_en);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const groomFullName = `Janab ${groomName} son of ${groomFatherName}`;
  const brideFullName = `Janaba ${brideName} daughter of ${brideFatherName}`;
  const ceremonyDate = `${String(record.gregorian_day).padStart(2, "0")}.${getGregorianMonthEnShort(record.gregorian_month)}.${record.gregorian_year}`;
  const timeText = `${record.time_of_event} ${record.day_night === "பகல்" ? "AM" : record.day_night === "இரவு" ? "PM" : record.day_night}`;
  const hijriText = formatHijriDate(record.hijri_day, record.hijri_month, record.hijri_year);
  const registerPageNo = record.register_page_number || "-";

  // Normalize spacing (prevents odd letter spacing artifacts in some PDF viewers)
  const certificateText = (
    `This is to certify that the marriage (NIKKAH) ceremony of ${groomFullName} with ${brideFullName} ` +
    `was solemnized on ${ceremonyDate}, ${dayNameEn} at ${timeText} (${hijriText}) at ${venue}, ` +
    `Sivagangai Dist. and recorded in our Marriage Register Page No. ${registerPageNo}.`
  ).replace(/\s+/g, " ");

  // Auto-shrink if the paragraph wraps too much
  const textWidth = pageWidth - margin * 2;
  const fitted = fitParagraphToLines(certificateText, textWidth, 11, 4, 9);
  doc.setFontSize(fitted.fontSize);
  doc.text(fitted.lines, margin, y, { maxWidth: textWidth });
  y += fitted.lines.length * (fitted.fontSize >= 11 ? lineHeight : 6) + 10;

  // Restore base font size for rest of doc
  doc.setFontSize(11);

  // ============ NIKKAH DETAILS - English Only ============

  const labelValueX = margin + 25;
  const labelValueWidth = pageWidth - margin - labelValueX; // available width until right margin

  // Wali
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Wali:", margin, y);
  doc.setFont("helvetica", "normal");
  const waliText = waliName.replace(/\s+/g, " ");
  const waliFit = drawFittedValue(waliText, labelValueX, y, labelValueWidth, 11, 2, 8);
  y += waliFit.lines * (waliFit.fontSize >= 11 ? lineHeight : 6);

  // Mahar
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Mahar:", margin, y);
  doc.setFont("helvetica", "normal");
  const mahrText = String(mahrDetails).replace(/\s+/g, " ");
  const mahrFit = drawFittedValue(mahrText, labelValueX, y, labelValueWidth, 11, 2, 8);
  y += mahrFit.lines * (mahrFit.fontSize >= 11 ? lineHeight : 6) + 5;

  // Witnesses
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Witnesses:", margin, y);
  y += lineHeight;

  doc.setFont("helvetica", "normal");
  const witnessX = margin + 10;
  const witnessWidth = pageWidth - margin - witnessX;

  const witness1Text = `1. ${witness1Name} son of ${witness1FatherName}`.replace(/\s+/g, " ");
  const w1Fit = drawFittedValue(witness1Text, witnessX, y, witnessWidth, 11, 2, 8);
  y += w1Fit.lines * (w1Fit.fontSize >= 11 ? lineHeight : 6);

  const witness2Text = `2. ${witness2Name} son of ${witness2FatherName}`.replace(/\s+/g, " ");
  const w2Fit = drawFittedValue(witness2Text, witnessX, y, witnessWidth, 11, 2, 8);
  y += w2Fit.lines * (w2Fit.fontSize >= 11 ? lineHeight : 6) + 5;

  // Qathib
  doc.setFontSize(11);
  if (kathibName) {
    doc.setFont("helvetica", "bold");
    doc.text("Qathib:", margin, y);
    doc.setFont("helvetica", "normal");
    const qathibText = `Moulvi ${kathibName}`.replace(/\s+/g, " ");
    const qFit = drawFittedValue(qathibText, labelValueX, y, labelValueWidth, 11, 2, 8);
    y += qFit.lines * (qFit.fontSize >= 11 ? lineHeight : 6) + 15;
  } else {
    y += 15;
  }

  // Restore base font size
  doc.setFontSize(11);


  // ============ SIGNATURE SECTION ============
  
  // Right-aligned Managing Trustee signature
  const signatureY = Math.max(y + 20, pageHeight - 60);
  
  // Add trustee signature image
  try {
    const signatureImg = new Image();
    signatureImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      signatureImg.onload = () => resolve();
      signatureImg.onerror = () => reject();
      signatureImg.src = signatureUrl;
    });
    const sigCanvas = document.createElement("canvas");
    sigCanvas.width = signatureImg.width;
    sigCanvas.height = signatureImg.height;
    const sigCtx = sigCanvas.getContext("2d");
    if (sigCtx) {
      sigCtx.drawImage(signatureImg, 0, 0);
      const sigData = sigCanvas.toDataURL("image/jpeg");
      const sigWidth = 50;
      const sigHeight = (signatureImg.height / signatureImg.width) * sigWidth;
      doc.addImage(sigData, "JPEG", pageWidth - margin - sigWidth, signatureY - sigHeight - 2, sigWidth, sigHeight);
    }
  } catch {
    // Fallback: draw signature line if image fails
    doc.line(pageWidth - margin - 60, signatureY, pageWidth - margin, signatureY);
  }
  
  doc.setFont("helvetica", "bold");
  doc.text("Managing Trustee.", pageWidth - margin, signatureY + 6, { align: "right" });

  // ============ STAMP SECTION ============
  const stampX = margin + 25;
  const stampY = signatureY - 5;
  const stampRadius = 18;
  
  // Add mosque stamp image
  try {
    const stampImg = new Image();
    stampImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      stampImg.onload = () => resolve();
      stampImg.onerror = () => reject();
      stampImg.src = sealUrl;
    });
    const stampCanvas = document.createElement("canvas");
    stampCanvas.width = stampImg.width;
    stampCanvas.height = stampImg.height;
    const stampCtx = stampCanvas.getContext("2d");
    if (stampCtx) {
      stampCtx.drawImage(stampImg, 0, 0);
      const stampData = stampCanvas.toDataURL("image/jpeg");
      const stampSize = stampRadius * 2;
      doc.addImage(stampData, "JPEG", stampX - stampRadius, stampY - stampRadius, stampSize, stampSize);
    }
  } catch {
    // Fallback: draw placeholder circle if image fails
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.circle(stampX, stampY, stampRadius);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text("(OFFICIAL SEAL)", stampX, stampY + 2, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // ============ FOOTER ============
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text(`Certificate No: ${serialNumber}`, pageWidth / 2, pageHeight - 15, { align: "center" });
  doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, pageWidth / 2, pageHeight - 10, { align: "center" });
  doc.setTextColor(0, 0, 0);

  // Save the PDF
  const groomNameForFile = (record.groom_name_en || record.groom_name).replace(/\s+/g, '-');
  const brideNameForFile = (record.bride_name_en || record.bride_name).replace(/\s+/g, '-');
  doc.save(`marriage-certificate-${groomNameForFile}-${brideNameForFile}.pdf`);
};

// Print-friendly version that opens in a new window - English Only
export const printMarriageCertificate = async (record: MarriageRecord) => {
  // Fetch trustee settings and certificate number (match PDF numbering logic)
  const [trusteeInfo, marriageCertNumber] = await Promise.all([
    fetchTrusteeSettings(),
    generateMarriageCertificateNumber(),
  ]);
  
  // Use English fields for certificate
  const groomName = record.groom_name_en || record.groom_name;
  const groomFatherName = record.groom_father_name_en || record.groom_father_name;
  const brideName = record.bride_name_en || record.bride_name;
  const brideFatherName = record.bride_father_name_en || record.bride_father_name;
  const waliName = record.wali_name_en || record.wali_name;
  const waliFatherName = record.wali_father_name;
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
  const hijriText = formatHijriDate(record.hijri_day, record.hijri_month, record.hijri_year);
  const registerPageNo = record.register_page_number || "-";
  const certificateDate = new Date().toLocaleDateString("en-GB");

  const trusteeText = trusteeInfo.name
    ? `${trusteeInfo.name}${trusteeInfo.qualification ? `, ${trusteeInfo.qualification}` : ""}`
    : "Managing Trustee";

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Marriage Certificate - ${groomName} & ${brideName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #000;
          padding: 0;
        }
        .container {
          max-width: 210mm;
          margin: 0 auto;
          padding: 0 10mm;
        }
        .header {
          text-align: center;
          margin-bottom: 15px;
        }
        .header h1 {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .header .tamil {
          font-family: 'Noto Sans Tamil', sans-serif;
          font-size: 12pt;
          font-weight: bold;
          margin-bottom: 15px;
        }
        .address-row {
          display: flex;
          justify-content: space-between;
          gap: 10mm;
          margin-bottom: 15px;
        }
        .address-left,
        .address-right {
          width: 48%;
          max-width: 48%;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .address-left {
          font-family: 'Noto Sans Tamil', sans-serif;
          font-size: 10pt;
          text-align: left;
        }
        .address-right {
          font-size: 10pt;
          text-align: right;
        }
        .divider {
          border-top: 2px solid #000;
          margin: 15px 0;
        }
         .cert-meta {
           display: flex;
           justify-content: space-between;
           align-items: flex-start;
           font-weight: bold;
           margin: 0 0 12px 0;
           font-size: 10pt;
         }
        .trustee-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .trustee-info {
          font-weight: bold;
        }
        .trustee-title {
          font-size: 9pt;
        }
        .certificate-title {
          text-align: center;
          margin-bottom: 20px;
        }
        .certificate-title h2 {
          font-size: 16pt;
          font-weight: bold;
          text-decoration: underline;
        }
        .certificate-body {
          text-align: left;
          margin-bottom: 20px;
          line-height: 1.8;
          letter-spacing: normal;
          word-spacing: normal;
        }
        .details {
          margin-bottom: 30px;
        }
        .details p {
          margin-bottom: 8px;
        }
        .details strong {
          display: inline-block;
          min-width: 70px;
        }
        .witnesses {
          margin-left: 20px;
        }
        .witnesses p {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .signature-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 50px;
        }
        .stamp-image {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
        }
        .signature-area {
          text-align: right;
        }
        .signature-image {
          height: 50px;
          margin-left: auto;
          margin-bottom: 5px;
          object-fit: contain;
          display: block;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 8pt;
          color: #666;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ILAYANGUDI NESAVU PATTADAI THOZHUKAI MEDAI PALLIVAYAL</h1>
          <p class="tamil">இளையான்குடி நெசவுப்பட்டடை தொழுகை மேடை பள்ளிவாயல்</p>
        </div>
        
        <div class="address-row">
          <div class="address-left">
            <strong>அலுவலகம்:</strong><br/>
            எண்: 115, பாக்கீர் ரவுத்தர் தெரு<br/>
            இளையான்குடி - 630 702<br/>
            சிவகங்கை மாவட்டம்
          </div>
          <div class="address-right">
            <strong>Office:</strong><br/>
            No. 11, Packeer Rowther Street<br/>
            ILAYANGUDI - 630702<br/>
            Sivagangai District<br/>
            Tamilnadu, INDIA.<br/>
            Ph: 04564 - 265720
          </div>
        </div>
        
        <div class="divider"></div>

         <div class="cert-meta">
           <p>No: ${marriageCertNumber}</p>
           <p>Date: ${certificateDate}</p>
         </div>
        
        <div class="trustee-row">
          <div>
            <p class="trustee-info">${trusteeText}</p>
            <p class="trustee-title">Managing Trustee.</p>
          </div>
        </div>
        
        <div class="certificate-title">
          <h2>MARRIAGE CERTIFICATE</h2>
        </div>
        
        <div class="certificate-body">
          <p>This is to certify that the marriage (NIKKAH) ceremony of <strong>${groomFullName}</strong> with <strong>${brideFullName}</strong> was solemnized on <strong>${ceremonyDate}, ${dayNameEn}</strong> at <strong>${timeText}</strong> (${hijriText}) at <strong>${venue}</strong>, Sivagangai Dist. and recorded in our Marriage Register Page No. <strong>${registerPageNo}</strong>.</p>
        </div>
        
        <div class="details">
          <p><strong>Wali:</strong> ${waliName}</p>
          <p><strong>Mahar:</strong> ${mahrDetails}</p>
          <p><strong>Witnesses:</strong></p>
          <div class="witnesses">
            <p>1. ${witness1Name} son of ${witness1FatherName}</p>
            <p>2. ${witness2Name} son of ${witness2FatherName}</p>
          </div>
          ${kathibName ? `<p><strong>Qathib:</strong> Moulvi ${kathibName}</p>` : ''}
        </div>
        
        <div class="signature-section">
          <img src="/images/mosque-stamp.jpg" alt="Official Seal" class="stamp-image" />
          <div class="signature-area">
            <img src="/images/trustee-signature.jpg" alt="Trustee Signature" class="signature-image" />
            <p><strong>Managing Trustee.</strong></p>
          </div>
        </div>
        
        <div class="footer">
           <p>Certificate No: ${marriageCertNumber}</p>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printContent);
    printWindow.document.close();
  }
};
