import jsPDF from "jspdf";
import { getCertificateImages } from "@/lib/certificateImages";
import { getCertificateHeaderSettings } from "@/lib/certificateHeaderSettings";
import { generateNocCertificateNumber } from "@/components/admin/NocCertificateNumberSettings";

export interface NocRecord {
  id: string;
  applicant_membership_number?: string;
  applicant_name: string;
  applicant_email?: string | null;
  applicant_phone?: string | null;
  father_membership_number: string;
  father_name: string;
  family_name: string;
  applicant_relationship: string;
  partner_name: string;
  partner_father_name: string;
  partner_category: string;
  partner_applicant_relationship?: string;
  mosque_to_submit: string;
  address_to_submit: string;
  status: string;
  payment_status?: string;
  user_id?: string;
  created_at?: string;
}

// Font family for Tamil text rendering on canvas
const TAMIL_FONT_FAMILY = "'Noto Sans Tamil', 'Latha', 'Tamil Sangam MN', 'Arial Unicode MS', sans-serif";

// Canvas -> PDF sizing helpers
const CANVAS_DPI = 96;
const PX_TO_MM = 25.4 / CANVAS_DPI;
const PT_TO_PX = CANVAS_DPI / 72;
const TAMIL_RENDER_SCALE = 3;
const TAMIL_PADDING_PX = 6;

// Ensure Tamil fonts are loaded for canvas rendering
const ensureTamilFontsLoaded = async (): Promise<void> => {
  try {
    const fontsApi = (document as any).fonts as FontFaceSet | undefined;
    if (!fontsApi) return;

    const regular = new FontFace("Noto Sans Tamil", "url(/fonts/NotoSansTamil-Regular.ttf)", {
      weight: "400",
      style: "normal",
    });
    const bold = new FontFace("Noto Sans Tamil", "url(/fonts/NotoSansTamil-Bold.ttf)", {
      weight: "700",
      style: "normal",
    });

    fontsApi.add(regular);
    fontsApi.add(bold);

    await Promise.all([regular.load().catch(() => undefined), bold.load().catch(() => undefined)]);

    await fontsApi.load('400 16px "Noto Sans Tamil"');
    await fontsApi.load('700 16px "Noto Sans Tamil"');
    await fontsApi.ready;
  } catch {
    // Silently ignore font loading errors
  }
};

// Render Tamil text using canvas and add as image to PDF
const addTamilText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSizePt: number,
  options: {
    fontWeight?: "normal" | "bold";
    align?: "left" | "center" | "right" | "justify";
    maxWidth?: number; // in mm
  } = {}
) => {
  const { fontWeight = "normal", align = "left", maxWidth } = options;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  const weight = fontWeight === "bold" ? 700 : 400;
  const fontPx = fontSizePt * PT_TO_PX;

  ctx.font = `${weight} ${fontPx}px ${TAMIL_FONT_FAMILY}`;
  const measuredWidthPx = ctx.measureText(text).width;

  // For justified text, use maxWidth if provided
  const targetWidthPx = maxWidth ? (maxWidth / PX_TO_MM) : measuredWidthPx;
  const canvasWidthPx = Math.ceil(Math.max(measuredWidthPx, targetWidthPx) + TAMIL_PADDING_PX * 2);
  const canvasHeightPx = Math.ceil(fontPx * 1.6 + TAMIL_PADDING_PX * 2);

  canvas.width = canvasWidthPx * TAMIL_RENDER_SCALE;
  canvas.height = canvasHeightPx * TAMIL_RENDER_SCALE;

  ctx.setTransform(TAMIL_RENDER_SCALE, 0, 0, TAMIL_RENDER_SCALE, 0, 0);
  ctx.font = `${weight} ${fontPx}px ${TAMIL_FONT_FAMILY}`;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";

  const baselinePx = TAMIL_PADDING_PX + fontPx;
  ctx.fillText(text, TAMIL_PADDING_PX, baselinePx);

  const imgData = canvas.toDataURL("image/png");

  const imgWidthMm = canvasWidthPx * PX_TO_MM;
  const imgHeightMm = canvasHeightPx * PX_TO_MM;
  const baselineMm = baselinePx * PX_TO_MM;

  let xPos = x;
  if (align === "center") xPos = x - imgWidthMm / 2;
  if (align === "right") xPos = x - imgWidthMm;

  doc.addImage(imgData, "PNG", xPos, y - baselineMm, imgWidthMm, imgHeightMm);
  
  return imgHeightMm;
};

// Word wrap Tamil text and render justified lines
const addJustifiedTamilParagraph = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidthMm: number,
  fontSizePt: number,
  options: { fontWeight?: "normal" | "bold" } = {}
): number => {
  const { fontWeight = "normal" } = options;
  
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return y;

  const weight = fontWeight === "bold" ? 700 : 400;
  const fontPx = fontSizePt * PT_TO_PX;
  ctx.font = `${weight} ${fontPx}px ${TAMIL_FONT_FAMILY}`;

  const maxWidthPx = maxWidthMm / PX_TO_MM;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  // Word wrap
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;
    
    if (testWidth > maxWidthPx && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  const lineHeightMm = fontSizePt * 0.5; // Adjust line height
  let currentY = y;

  // Render each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isLastLine = i === lines.length - 1;
    
    // For justified text, we stretch the line to fill the width (except last line)
    const lineWidthPx = ctx.measureText(line).width;
    const lineWidthMm = lineWidthPx * PX_TO_MM;
    
    // Create canvas for this line
    const lineCanvas = document.createElement("canvas");
    const lineCtx = lineCanvas.getContext("2d");
    if (!lineCtx) continue;

    const canvasWidthPx = Math.ceil(maxWidthPx + TAMIL_PADDING_PX * 2);
    const canvasHeightPx = Math.ceil(fontPx * 1.6 + TAMIL_PADDING_PX * 2);

    lineCanvas.width = canvasWidthPx * TAMIL_RENDER_SCALE;
    lineCanvas.height = canvasHeightPx * TAMIL_RENDER_SCALE;

    lineCtx.setTransform(TAMIL_RENDER_SCALE, 0, 0, TAMIL_RENDER_SCALE, 0, 0);
    lineCtx.font = `${weight} ${fontPx}px ${TAMIL_FONT_FAMILY}`;
    lineCtx.fillStyle = "#000000";
    lineCtx.textBaseline = "alphabetic";

    const baselinePx = TAMIL_PADDING_PX + fontPx;

    if (!isLastLine && line.includes(" ")) {
      // Justify: distribute extra space between words
      const lineWords = line.split(/\s+/);
      const totalTextWidth = lineWords.reduce((sum, w) => sum + lineCtx.measureText(w).width, 0);
      const extraSpace = (maxWidthPx - totalTextWidth) / (lineWords.length - 1);
      
      let xOffset = TAMIL_PADDING_PX;
      for (const word of lineWords) {
        lineCtx.fillText(word, xOffset, baselinePx);
        xOffset += lineCtx.measureText(word).width + extraSpace;
      }
    } else {
      // Last line or single word: left align
      lineCtx.fillText(line, TAMIL_PADDING_PX, baselinePx);
    }

    const imgData = lineCanvas.toDataURL("image/png");
    const imgWidthMm = canvasWidthPx * PX_TO_MM;
    const imgHeightMm = canvasHeightPx * PX_TO_MM;
    const baselineMm = baselinePx * PX_TO_MM;

    doc.addImage(imgData, "PNG", x, currentY - baselineMm, imgWidthMm, imgHeightMm);
    currentY += lineHeightMm;
  }

  return currentY;
};

// Generate the NOC certificate content
const generateCertificateContent = async (doc: jsPDF, record: NocRecord) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Get certificate images and header settings from storage
  const { signatureUrl, sealUrl } = await getCertificateImages();
  const headerSettings = await getCertificateHeaderSettings();

  // Helper for English text
  const addEnglishText = (
    text: string,
    x: number,
    y: number,
    options: { align?: "left" | "center" | "right"; fontStyle?: "normal" | "bold" } = {}
  ) => {
    const { align = "left", fontStyle = "normal" } = options;
    doc.setFont("helvetica", fontStyle);
    doc.text(text, x, y, { align });
  };

  // ==================== HEADER ====================

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Mosque Name - Tamil
  addTamilText(doc, headerSettings.titleTa, pageWidth / 2, 24, 12, {
    fontWeight: "bold",
    align: "center",
  });

  // Mosque Name - English
  doc.setFontSize(10);
  addEnglishText(headerSettings.titleEn, pageWidth / 2, 32, {
    align: "center",
    fontStyle: "bold",
  });

  // Address line - Tamil
  addTamilText(doc, headerSettings.addressTa, pageWidth / 2, 40, 8, {
    align: "center",
  });

  // ==================== TWO COLUMN ADDRESS ====================

  const leftCol = 20;
  const rightCol = pageWidth / 2 + 10;
  let yPos = 50;

  // Left column - Tamil address (dynamic)
  const officeLinesTa = headerSettings.officeAddressTa;
  for (let i = 0; i < officeLinesTa.length; i++) {
    addTamilText(doc, officeLinesTa[i], leftCol, yPos + i * 6, 8);
  }

  // Right column - English address (dynamic)
  doc.setFontSize(8);
  const officeLinesEn = headerSettings.officeAddressEn;
  for (let i = 0; i < officeLinesEn.length; i++) {
    addEnglishText(officeLinesEn[i], rightCol, yPos + i * 6);
  }

  // ==================== HEADER LINE ====================
  yPos = 78;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(15, yPos, pageWidth - 15, yPos);

  // ==================== CERTIFICATE NUMBER & DATE ====================
  yPos = 85;
  const certNumber = await generateNocCertificateNumber();
  const certDate = new Date().toLocaleDateString("ta-IN");
  
  addTamilText(doc, `எண்: ${certNumber}`, 20, yPos, 9, { fontWeight: "bold" });
  addTamilText(doc, `நாள்: ${certDate}`, pageWidth - 20, yPos, 9, { align: "right" });

  // ==================== GREETING ====================

  yPos = 98;
  addTamilText(doc, "அஸ்ஸலாமு அலைக்கும்", 25, yPos, 11, { fontWeight: "bold" });

  // ==================== RECIPIENT ADDRESS ====================

  yPos = 108;
  const lineHeight = 8;
  const contentLeft = 25;

  addTamilText(doc, `மேனேஜிங் டிரஸ்ட்டி,`, contentLeft, yPos, 10);
  yPos += lineHeight;

  addTamilText(doc, `${record.mosque_to_submit},`, contentLeft, yPos, 10);
  yPos += lineHeight;

  addTamilText(doc, `${record.address_to_submit} அவர்களுக்கு,`, contentLeft, yPos, 10);

  // ==================== BODY TEXT ====================

  yPos += lineHeight + 8;

  // Build full paragraph text
  const groomOrBride = record.applicant_relationship === "மகன்" ? "மணமகனுக்கும்" : "மணமகளுக்கும்";
  
  const bodyText = `எங்களது I. N. P. T. ஜமாத்தைச் சேர்ந்த ${record.father_name} என்பவரது ${record.applicant_relationship} ${record.applicant_name} என்ற ${groomOrBride} தங்கள் முஹல்லாவைச் சேர்ந்த ${record.partner_father_name} என்பவரது ${record.partner_applicant_relationship || ""} ${record.partner_name} என்ற ${record.partner_category} ஷரியத் முறைப்படி திருமணம் செய்து வைப்பதற்கு எங்களுக்கு எவ்வித ஆட்சேபனையும் இல்லை என்பதை இதன் மூலம் தங்களுக்குத் தெரியப்படுத்திக்கொள்கிறோம்.`;

  // Render justified paragraph
  const contentWidth = pageWidth - contentLeft - 25; // margins on both sides
  yPos = addJustifiedTamilParagraph(doc, bodyText, contentLeft, yPos, contentWidth, 10);

  // ==================== SIGNATURE SECTION ====================

  const signatureY = yPos + 50;
  const signatureX = pageWidth - 30;
  const margin = 15;

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
      const sigWidth = 45;
      const sigHeight = (signatureImg.height / signatureImg.width) * sigWidth;
      doc.addImage(sigData, "JPEG", pageWidth - margin - sigWidth, signatureY - sigHeight - 2, sigWidth, sigHeight);
    }
  } catch {
    // Fallback: draw signature line if image fails
    doc.line(pageWidth - margin - 50, signatureY, pageWidth - margin, signatureY);
  }

  // Signature text
  addTamilText(doc, "மேனேஜிங் டிரஸ்ட்டி", signatureX, signatureY + 6, 10, {
    fontWeight: "bold",
    align: "right",
  });

  addTamilText(doc, "இளையான்குடி நெசவுப் பட்டடை", signatureX, signatureY + 14, 9, {
    align: "right",
  });

  addTamilText(doc, "தொழுகை மேடைப் பள்ளிவாசல்", signatureX, signatureY + 22, 9, {
    align: "right",
  });

  addTamilText(doc, "இளையான்குடி", signatureX, signatureY + 30, 9, {
    align: "right",
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
};

export const generateNocCertificatePdf = async (record: NocRecord): Promise<void> => {
  await ensureTamilFontsLoaded();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  await generateCertificateContent(doc, record);

  const fileName = `NOC_Certificate_${record.applicant_name}_${new Date().getFullYear()}.pdf`;
  doc.save(fileName.replace(/\s+/g, "_"));
};

export const printNocCertificate = async (record: NocRecord): Promise<void> => {
  await ensureTamilFontsLoaded();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  await generateCertificateContent(doc, record);

  doc.autoPrint();
  window.open(doc.output("bloburl"), "_blank");
};