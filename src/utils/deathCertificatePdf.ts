import jsPDF from "jspdf";
import { getCertificateImages } from "@/lib/certificateImages";
import { getCertificateHeaderSettings } from "@/lib/certificateHeaderSettings";
import { getCertificateSignatureSettings } from "@/lib/certificateSignatureSettings";
import { generateDeathCertificateNumber } from "@/components/admin/DeathCertificateNumberSettings";
import { getDeathCertificateFontSizes } from "@/components/admin/DeathCertificateFontSettings";
import { addTamilText as addTamilTextCanvas, loadTamilFont } from "@/utils/pdf/tamilCanvasText";
import { drawCertificateFooter } from "@/utils/pdf/certificateFooter";

export interface DeathRecord {
  id: string;
  hijri_year: number;
  hijri_month: string;
  hijri_day: number;
  gregorian_year: number;
  gregorian_month: string;
  gregorian_day: number;
  day_name: string;
  deceased_name: string;
  deceased_name_en?: string;
  deceased_father_name: string;
  deceased_father_name_en?: string;
  deceased_husband_name?: string;
  deceased_husband_name_en?: string;
  deceased_age: number;
  deceased_gender: string;
  deceased_address: string;
  deceased_occupation?: string;
  death_date: string;
  death_time?: string;
  place_of_death: string;
  cause_of_death?: string;
  burial_date?: string;
  burial_time?: string;
  burial_place?: string;
  burial_place_en?: string;
  informant_name: string;
  informant_name_en?: string;
  informant_relationship: string;
  informant_phone?: string;
  informant_address?: string;
  witness1_name?: string;
  witness1_name_en?: string;
  witness1_father_name?: string;
  witness2_name?: string;
  witness2_name_en?: string;
  witness2_father_name?: string;
  register_page_number?: string;
  member_id?: string;
  registrar_name: string;
  registrar_father_name?: string;
}

// Helper to format current date
const formatCurrentDateTamil = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}/${month}/${year}`;
};

// Render Arabic text using canvas
const addArabicText = (
  doc: jsPDF,
  text: string,
  xCenter: number,
  y: number,
  fontSizePt: number
) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const scale = 4;
  const fontPx = fontSizePt * (96 / 72);
  const fontFamily = "'Scheherazade New', 'Amiri', 'Traditional Arabic', serif";

  ctx.font = `400 ${fontPx}px ${fontFamily}`;
  const measuredWidth = ctx.measureText(text).width;

  const padding = 10;
  canvas.width = Math.ceil((measuredWidth + padding * 2) * scale);
  canvas.height = Math.ceil(fontPx * 1.8 * scale);

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.font = `400 ${fontPx}px ${fontFamily}`;
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";
  ctx.direction = "rtl";
  ctx.fillText(text, measuredWidth + padding, fontPx * 0.3);

  const imgWidthMm = (canvas.width / scale) * (25.4 / 96);
  const imgHeightMm = (canvas.height / scale) * (25.4 / 96);

  doc.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    xCenter - imgWidthMm / 2,
    y,
    imgWidthMm,
    imgHeightMm
  );
};

// Generate the certificate content
const generateCertificateContent = async (doc: jsPDF, record: DeathRecord) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Get certificate images, header settings, and font sizes
  const { signatureUrl, sealUrl } = await getCertificateImages();
  const headerSettings = await getCertificateHeaderSettings();
  const signSettings = await getCertificateSignatureSettings();
  const fontSizes = await getDeathCertificateFontSizes();

  // Helper for English text
  const addEnglishText = (
    text: string,
    x: number,
    y: number,
    fontSize: number,
    options: { align?: "left" | "center" | "right"; fontStyle?: "normal" | "bold" } = {}
  ) => {
    const { align = "left", fontStyle = "normal" } = options;
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(fontSize);
    doc.text(text, x, y, { align });
  };

  // ==================== HEADER ====================
  doc.setTextColor(0, 0, 0);

  // Bismillah - Arabic
  addTamilTextCanvas(doc, headerSettings.bismillah, margin, 12, fontSizes.bismillah, "normal", "center");

  // Mosque Name - Tamil
  addTamilTextCanvas(doc, headerSettings.titleTa, margin, 28, fontSizes.headerTa, "bold", "center");

  // Mosque Name - English (with configurable spacing from Tamil header)
  const englishHeaderY = 28 + fontSizes.headerTaSpacing;
  addEnglishText(headerSettings.titleEn, pageWidth / 2, englishHeaderY, fontSizes.headerEn * 1.3, { align: "center", fontStyle: "bold" });

  // Address line - Tamil (with configurable spacing from English header)
  const addressY = englishHeaderY + fontSizes.headerEnSpacing;
  addTamilTextCanvas(doc, headerSettings.addressTa, margin, addressY, fontSizes.headerAddressTa, "normal", "center");

  // ==================== TWO COLUMN ADDRESS ====================
  const leftCol = 20;
  const rightCol = pageWidth / 2 + 20;
  let yPos = addressY + fontSizes.headerAddressSpacing;
  const officeLineSpacing = fontSizes.officeAddressLineSpacing;

  // Left column - Tamil address
  const officeLinesTa = headerSettings.officeAddressTa;
  for (let i = 0; i < officeLinesTa.length; i++) {
    addTamilTextCanvas(doc, officeLinesTa[i], leftCol, yPos + i * officeLineSpacing, fontSizes.officeAddressTa, "normal", "left");
  }

  // Right column - English address (starts one line below Tamil)
  const officeLinesEn = headerSettings.officeAddressEn;
  for (let i = 0; i < officeLinesEn.length; i++) {
    addEnglishText(officeLinesEn[i], rightCol, yPos + (i + 1) * officeLineSpacing, fontSizes.officeAddressEn * 1.3);
  }

  // ==================== HEADER LINE ====================
  yPos = 84;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  // ==================== CERTIFICATE NUMBER AND DATE ====================
  yPos = 92;
  const currentDate = formatCurrentDateTamil();
  const certNumber = await generateDeathCertificateNumber();

  // Certificate number on the left (same as heir certificate)
  addTamilTextCanvas(doc, `எண்: ${certNumber}`, margin, yPos, fontSizes.regRow, "bold", "left");

  // Date on the right - positioned at pageWidth - margin - 25 to match heir certificate
  addTamilTextCanvas(doc, `நாள்: ${currentDate}`, pageWidth - margin - 25, yPos, fontSizes.regRow, "bold", "left");

  // ==================== CERTIFICATE TITLE ====================
  yPos = 106;
  addTamilTextCanvas(doc, "இறப்புச்சான்றிதழ்", margin, yPos, fontSizes.title, "bold", "center");

  // ==================== CERTIFICATE BODY ====================
  yPos = 126;
  const bodyLeft = 25;
  const bodyFontSize = fontSizes.body;
  const lineSpacing = fontSizes.bodyLineSpacing;

  // Prepare data
  const name = record.deceased_name || "";
  const hasHusbandName = record.deceased_husband_name && record.deceased_husband_name.trim() !== "";
  const parentLabel = hasHusbandName ? "க/பெ" : "த/பெ";
  const parentName = hasHusbandName ? record.deceased_husband_name : record.deceased_father_name;
  const addressParts = record.deceased_address ? record.deceased_address.split(",") : [""];
  const street = addressParts[0]?.trim() || record.deceased_address || "";

  // Death date formatting
  const deathDateFormatted = (() => {
    try {
      const date = new Date(record.death_date);
      return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
    } catch {
      return record.death_date;
    }
  })();

  const burialPlace = record.burial_place_en || record.burial_place || "I.N.P.T";

  // Body text lines - each rendered separately with auto-shrink enabled
  const bodyLines = [
    `${name}, ${parentLabel}. ${parentName},`,
    `${street} என்ற முகவரியை சார்ந்த நபர்`,
    `கடந்த ${deathDateFormatted} அன்று மரணமடைந்துவிட்டார்.`,
    `அன்னாரது உடல் எங்களது ${burialPlace} மையய வாடியில்தான்`,
    `அடக்கம் செய்யப்பட்டுள்ளது என்பதற்கு கொடுக்கலான சான்று.`
  ];

  // Render each line with auto-shrink to fit within content width
  for (const line of bodyLines) {
    addTamilTextCanvas(
      doc,
      line,
      bodyLeft,
      yPos,
      bodyFontSize,
      "normal",
      "left",
      contentWidth - 10, // maxWidth
      true, // autoShrink enabled
      1.0 // lineHeightMultiplier
    );
    yPos += lineSpacing;
  }

  // ==================== SIGNATURE SECTION ====================
  const signatureY = yPos + 40;
  
  // Signature position - same as heir certificate (pageWidth - margin - 55)
  const signatureX = pageWidth - margin - 55;

  // Add trustee signature image (right side)
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
      const sigWidth = 35;
      const sigHeight = (signatureImg.height / signatureImg.width) * sigWidth;
      doc.addImage(sigData, "JPEG", signatureX + 15, signatureY - sigHeight - 2, sigWidth, sigHeight);
    }
  } catch {
    console.log("Could not add signature image");
  }

  // Signature labels - multi-line like heir certificate
  let sigLabelY = signatureY + 6;
  addTamilTextCanvas(doc, signSettings.designationTa, signatureX, sigLabelY, fontSizes.signature, "bold", "left");
  signSettings.linesTa.forEach((line) => {
    sigLabelY += 4.2;
    addTamilTextCanvas(doc, line, signatureX, sigLabelY, fontSizes.signature, "normal", "left");
  });

  // ==================== STAMP SECTION (Left Side) ====================
  const stampX = margin + 22;
  const stampY = signatureY - 5;
  const stampRadius = 16;

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
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.circle(stampX, stampY, stampRadius);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text("(OFFICIAL SEAL)", stampX, stampY + 2, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  await drawCertificateFooter(doc, "death");
};

export const generateDeathCertificatePdf = async (record: DeathRecord): Promise<void> => {
  await loadTamilFont();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  await generateCertificateContent(doc, record);

  const fileName = `Death_Certificate_${record.deceased_name_en || record.deceased_name}_${record.gregorian_year}.pdf`;
  doc.save(fileName.replace(/\s+/g, "_"));
};

export const printDeathCertificate = async (record: DeathRecord): Promise<void> => {
  await loadTamilFont();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  await generateCertificateContent(doc, record);

  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};
