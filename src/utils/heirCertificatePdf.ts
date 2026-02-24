import jsPDF from "jspdf";
import { getCertificateImages } from "@/lib/certificateImages";
import { getCertificateHeaderSettings } from "@/lib/certificateHeaderSettings";
import type { Json } from "@/integrations/supabase/types";
import { addTamilText, loadTamilFont, getAutoShrinkFontSize } from "@/utils/pdf/tamilCanvasText";
import { getHeirCertificateFontSizes } from "@/components/admin/HeirCertificateFontSettings";
import { generateHeirCertificateNumber } from "@/components/admin/HeirCertificateNumberSettings";

export interface Heir {
  name: string;
  relationship: string;
  age: number | string;
  marriage_eligibility: string;
}

export interface HeirRecord {
  id: string;
  applicant_name: string;
  applicant_phone?: string | null;
  applicant_email?: string | null;
  applicant_relationship: string;
  deceased_member_id?: string | null;
  deceased_name: string;
  deceased_father_name: string;
  deceased_address: string;
  register_number?: string | null;
  certificate_date?: string | null;
  heirs: Heir[] | Json;
  status: string;
  payment_status?: string | null;
  admin_notes?: string | null;
  created_at?: string;
}

// Helper to parse heirs from JSON
export const parseHeirs = (heirs: Heir[] | Json): Heir[] => {
  if (Array.isArray(heirs)) {
    return heirs as Heir[];
  }
  if (typeof heirs === 'string') {
    try {
      return JSON.parse(heirs) as Heir[];
    } catch {
      return [];
    }
  }
  return [];
};

// (Tamil canvas helpers moved to src/utils/pdf/tamilCanvasText.ts)

export const generateHeirCertificatePdf = async (record: HeirRecord): Promise<void> => {
  await loadTamilFont();
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  // More compact layout to ensure everything fits the printable area.
  const margin = 16;
  let y = 12;

  // Fetch configurable font sizes and header settings from app_settings
  const FS = await getHeirCertificateFontSizes();
  const headerSettings = await getCertificateHeaderSettings();
  
  // Get certificate images
  const images = await getCertificateImages();
  
  addTamilText(doc, headerSettings.bismillah, pageWidth / 2, y, FS.bismillah, "normal", "center");
  y += 6;
  
  addTamilText(doc, headerSettings.titleTa, pageWidth / 2, y, FS.headerTa, "bold", "center");
  y += FS.headerSpacing; // Configurable spacing between Tamil and English titles
  
  // English header - use configured font size (multiply by ~1.3 to match Tamil canvas rendering scale)
  const englishHeaderSize = Math.round(FS.headerEn * 1.3);
  doc.setFontSize(englishHeaderSize);
  doc.setFont("helvetica", "bold");
  doc.text(headerSettings.titleEn, pageWidth / 2, y, { align: "center" });
  y += 6;
  
  // Header address - centered below the English title
  addTamilText(doc, headerSettings.addressTa, pageWidth / 2, y, FS.headerAddressTa, "normal", "center");
  y += 7.5;
  
  // Two column office address
  const leftX = margin;
  
  // Tamil office address on left, English office address right-aligned
  const rightEdge = pageWidth - margin;
  
  // Apply 1.3x multiplier to English office address font to match Tamil canvas rendering scale
  const englishOfficeAddressSize = Math.round(FS.officeAddressEn * 1.3);
  
  const officeLineSpacing = FS.officeAddressLineSpacing;
  
  // Render office address lines dynamically
  const officeLinesTa = headerSettings.officeAddressTa;
  const officeLinesEn = headerSettings.officeAddressEn;
  const maxLines = Math.max(officeLinesTa.length, officeLinesEn.length);
  
  for (let i = 0; i < maxLines; i++) {
    const tamilLine = officeLinesTa[i] || "";
    const englishLine = officeLinesEn[i] || "";
    const isBold = i === 0; // First line is bold (label)
    
    if (tamilLine) {
      addTamilText(doc, tamilLine, leftX, y, FS.officeAddressTa, isBold ? "bold" : "normal");
    }
    if (englishLine) {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(englishOfficeAddressSize);
      doc.text(englishLine, rightEdge, y + 3, { align: "right" });
    }
    y += officeLineSpacing;
  }
  y += 6.5 - officeLineSpacing; // Adjust for final spacing
  
  // Horizontal line - placed above certificate number and date
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  
  // Register number and date row
  // Use the configured certificate number, or fallback to register_number, or generate new
  const certNumber = record.register_number || await generateHeirCertificateNumber();
  const certDate = record.certificate_date 
    ? new Date(record.certificate_date).toLocaleDateString("ta-IN")
    : "...........................";
  
  addTamilText(doc, `எண்: ${certNumber}`, leftX, y, FS.regRow, "bold");
  addTamilText(doc, `நாள்: ${certDate}`, pageWidth - margin - 25, y, FS.regRow);
  y += 8;
  
  addTamilText(doc, "வாரிசு சான்றிதழ்", pageWidth / 2, y, FS.title, "bold", "center");
  y += 9;
  
  // Body text - wrapped paragraph with 1.5x line height
  const bodyText = `சிவகங்கை மாவட்டம், இளையான்குடி டவுன், ${record.deceased_address} தெருவில் வசித்து வந்த எங்கள் ஜமாஅத்தைச் சார்ந்த ${record.deceased_father_name} மகன்/மகள் ${record.deceased_name} அவர்களுக்கு கீழ்க்கண்ட நபர்கள் உறவு முறையில் உள்ளவர்கள் என சான்றளிக்கப்படுகிறது.`;
  
  y = addTamilText(doc, bodyText, margin, y, FS.body, "normal", "left", pageWidth - margin * 2, false, 1.5);
  y += 6;
  
  // Table
  const colWidths = [15, 55, 40, 20, 40];
  const tableStartX = margin;
  let tableY = y;
  const headerRowHeight = 8;
  const dataRowHeight = 6.5;
  
  // Draw table header background
  doc.setFillColor(245, 245, 245);
  doc.rect(tableStartX, tableY, pageWidth - margin * 2, headerRowHeight, "F");
  doc.setDrawColor(0);
  doc.rect(tableStartX, tableY, pageWidth - margin * 2, headerRowHeight, "S");
  
  // Header cells
  let cellX = tableStartX;
  const headers = ["வ.எண்", "பெயர்", "உறவுமுறை", "வயது", "திருமண தகுதி"];
  
  headers.forEach((header, i) => {
    doc.rect(cellX, tableY, colWidths[i], headerRowHeight, "S");
    addTamilText(doc, header, cellX + 2, tableY + 1.8, FS.tableHeader, "bold");
    cellX += colWidths[i];
  });
  
  tableY += headerRowHeight;
  
  // Table rows (10 rows as per template)
  const parsedHeirs = parseHeirs(record.heirs);
  for (let i = 0; i < 10; i++) {
    cellX = tableStartX;
    const heir = parsedHeirs[i];
    
    // Draw row border
    doc.rect(tableStartX, tableY, pageWidth - margin * 2, dataRowHeight, "S");
    
    // Cell values with column widths for auto-shrink
    const cellData = heir 
      ? [
          { val: (i + 1).toString(), width: colWidths[0], isTamil: false },
          { val: heir.name || "", width: colWidths[1] - 4, isTamil: true },
          { val: heir.relationship || "", width: colWidths[2] - 4, isTamil: true },
          { val: heir.age?.toString() || "", width: colWidths[3], isTamil: false },
          { val: heir.marriage_eligibility || "", width: colWidths[4] - 4, isTamil: true }
        ]
      : [
          { val: (i + 1).toString(), width: colWidths[0], isTamil: false },
          { val: "", width: colWidths[1], isTamil: true },
          { val: "", width: colWidths[2], isTamil: true },
          { val: "", width: colWidths[3], isTamil: false },
          { val: "", width: colWidths[4], isTamil: true }
        ];
    
    cellData.forEach((cell, j) => {
      doc.rect(cellX, tableY, colWidths[j], dataRowHeight, "S");
      if (cell.val) {
        if (!cell.isTamil) {
          // Row number or Age - use standard font centered
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(cell.val, cellX + colWidths[j] / 2, tableY + 4.6, { align: "center" });
        } else {
          // Tamil text with auto-shrink
          addTamilText(doc, cell.val, cellX + 2, tableY + 1.2, FS.tableCell, "normal", "left", cell.width, true);
        }
      }
      cellX += colWidths[j];
    });
    
    tableY += dataRowHeight;
  }
  
  y = tableY + 10;
  
  // Signature section - text-sm (14px)
  // Seal on left
  if (images.sealUrl) {
    try {
      doc.addImage(images.sealUrl, "JPEG", margin, y, 25, 25);
    } catch (e) {
      console.log("Could not add seal image");
    }
  }
  
  // Signature on right
  const signatureX = pageWidth - margin - 55;
  if (images.signatureUrl) {
    try {
      doc.addImage(images.signatureUrl, "JPEG", signatureX + 15, y, 35, 15);
    } catch (e) {
      console.log("Could not add signature image");
    }
  }
  
  y += 16;
  addTamilText(doc, "மேனேஜிங் டிரஸ்ட்டி", signatureX, y, FS.signature, "bold");
  y += 4.2;
  addTamilText(doc, "இளையான்குடி நெசவுப் பட்டடை", signatureX, y, FS.signature);
  y += 4.2;
  addTamilText(doc, "தொழுகை மேடைப் பள்ளிவாசல்", signatureX, y, FS.signature);
  y += 4.2;
  addTamilText(doc, "இளையான்குடி", signatureX, y, FS.signature);
  
  // Save PDF
  const deceasedName = record.deceased_name.replace(/\s+/g, "_");
  doc.save(`வாரிசு_சான்றிதழ்_${deceasedName}.pdf`);
};

export const printHeirCertificate = async (record: HeirRecord): Promise<void> => {
  await loadTamilFont();
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 12;

  const FS = await getHeirCertificateFontSizes();
  const headerSettings = await getCertificateHeaderSettings();
  const images = await getCertificateImages();
  
  addTamilText(doc, headerSettings.bismillah, pageWidth / 2, y, FS.bismillah, "normal", "center");
  y += 6;
  
  addTamilText(doc, headerSettings.titleTa, pageWidth / 2, y, FS.headerTa, "bold", "center");
  y += FS.headerSpacing; // Configurable spacing between Tamil and English titles
  
  // English header - use configured font size (multiply by ~1.3 to match Tamil canvas rendering scale)
  const englishHeaderSize = Math.round(FS.headerEn * 1.3);
  doc.setFontSize(englishHeaderSize);
  doc.setFont("helvetica", "bold");
  doc.text(headerSettings.titleEn, pageWidth / 2, y, { align: "center" });
  y += 6;
  
  // Header address - centered below the English title
  addTamilText(doc, headerSettings.addressTa, pageWidth / 2, y, FS.headerAddressTa, "normal", "center");
  y += 7.5;
  
  const leftX = margin;
  const rightEdge = pageWidth - margin;
  
  // Apply 1.3x multiplier to English office address font to match Tamil canvas rendering scale
  const englishOfficeAddressSize = Math.round(FS.officeAddressEn * 1.3);
  
  const officeLineSpacing = FS.officeAddressLineSpacing;
  
  // Render office address lines dynamically
  const officeLinesTa = headerSettings.officeAddressTa;
  const officeLinesEn = headerSettings.officeAddressEn;
  const maxLines = Math.max(officeLinesTa.length, officeLinesEn.length);
  
  for (let i = 0; i < maxLines; i++) {
    const tamilLine = officeLinesTa[i] || "";
    const englishLine = officeLinesEn[i] || "";
    const isBold = i === 0; // First line is bold (label)
    
    if (tamilLine) {
      addTamilText(doc, tamilLine, leftX, y, FS.officeAddressTa, isBold ? "bold" : "normal");
    }
    if (englishLine) {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(englishOfficeAddressSize);
      doc.text(englishLine, rightEdge, y + 3, { align: "right" });
    }
    y += officeLineSpacing;
  }
  y += 6.5 - officeLineSpacing; // Adjust for final spacing
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  
  const certNumber = record.register_number || await generateHeirCertificateNumber();
  const certDate = record.certificate_date 
    ? new Date(record.certificate_date).toLocaleDateString("ta-IN")
    : "...........................";
  
  addTamilText(doc, `எண்: ${certNumber}`, leftX, y, FS.regRow, "bold");
  addTamilText(doc, `நாள்: ${certDate}`, pageWidth - margin - 25, y, FS.regRow);
  y += 8;
  
  addTamilText(doc, "வாரிசு சான்றிதழ்", pageWidth / 2, y, FS.title, "bold", "center");
  y += 9;
  
  const bodyText = `சிவகங்கை மாவட்டம், இளையான்குடி டவுன், ${record.deceased_address} தெருவில் வசித்து வந்த எங்கள் ஜமாஅத்தைச் சார்ந்த ${record.deceased_father_name} மகன்/மகள் ${record.deceased_name} அவர்களுக்கு கீழ்க்கண்ட நபர்கள் உறவு முறையில் உள்ளவர்கள் என சான்றளிக்கப்படுகிறது.`;
  
  y = addTamilText(doc, bodyText, margin, y, FS.body, "normal", "left", pageWidth - margin * 2, false, 1.5);
  y += 6;
  
  const colWidths = [15, 55, 40, 20, 40];
  const tableStartX = margin;
  let tableY = y;
  const headerRowHeight = 8;
  const dataRowHeight = 6.5;
  
  doc.setFillColor(245, 245, 245);
  doc.rect(tableStartX, tableY, pageWidth - margin * 2, headerRowHeight, "F");
  doc.setDrawColor(0);
  doc.rect(tableStartX, tableY, pageWidth - margin * 2, headerRowHeight, "S");
  
  let cellX = tableStartX;
  const headers = ["வ.எண்", "பெயர்", "உறவுமுறை", "வயது", "திருமண தகுதி"];
  
  headers.forEach((header, i) => {
    doc.rect(cellX, tableY, colWidths[i], headerRowHeight, "S");
    addTamilText(doc, header, cellX + 2, tableY + 1.8, FS.tableHeader, "bold");
    cellX += colWidths[i];
  });
  
  tableY += headerRowHeight;
  
  const parsedHeirs = parseHeirs(record.heirs);
  for (let i = 0; i < 10; i++) {
    cellX = tableStartX;
    const heir = parsedHeirs[i];
    
    doc.rect(tableStartX, tableY, pageWidth - margin * 2, dataRowHeight, "S");
    
    const cellData = heir 
      ? [
          { val: (i + 1).toString(), width: colWidths[0], isTamil: false },
          { val: heir.name || "", width: colWidths[1] - 4, isTamil: true },
          { val: heir.relationship || "", width: colWidths[2] - 4, isTamil: true },
          { val: heir.age?.toString() || "", width: colWidths[3], isTamil: false },
          { val: heir.marriage_eligibility || "", width: colWidths[4] - 4, isTamil: true }
        ]
      : [
          { val: (i + 1).toString(), width: colWidths[0], isTamil: false },
          { val: "", width: colWidths[1], isTamil: true },
          { val: "", width: colWidths[2], isTamil: true },
          { val: "", width: colWidths[3], isTamil: false },
          { val: "", width: colWidths[4], isTamil: true }
        ];
    
    cellData.forEach((cell, j) => {
      doc.rect(cellX, tableY, colWidths[j], dataRowHeight, "S");
      if (cell.val) {
        if (!cell.isTamil) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(cell.val, cellX + colWidths[j] / 2, tableY + 4.6, { align: "center" });
        } else {
          addTamilText(doc, cell.val, cellX + 2, tableY + 1.2, FS.tableCell, "normal", "left", cell.width, true);
        }
      }
      cellX += colWidths[j];
    });
    
    tableY += dataRowHeight;
  }
  
  y = tableY + 10;
  
  if (images.sealUrl) {
    try {
      doc.addImage(images.sealUrl, "JPEG", margin, y, 25, 25);
    } catch (e) {
      console.log("Could not add seal image");
    }
  }
  
  const signatureX = pageWidth - margin - 55;
  if (images.signatureUrl) {
    try {
      doc.addImage(images.signatureUrl, "JPEG", signatureX + 15, y, 35, 15);
    } catch (e) {
      console.log("Could not add signature image");
    }
  }
  
  y += 16;
  addTamilText(doc, "மேனேஜிங் டிரஸ்ட்டி", signatureX, y, FS.signature, "bold");
  y += 4.2;
  addTamilText(doc, "இளையான்குடி நெசவுப் பட்டடை", signatureX, y, FS.signature);
  y += 4.2;
  addTamilText(doc, "தொழுகை மேடைப் பள்ளிவாசல்", signatureX, y, FS.signature);
  y += 4.2;
  addTamilText(doc, "இளையான்குடி", signatureX, y, FS.signature);
  
  // Open PDF in new window for printing
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(pdfUrl, "_blank");
  if (printWindow) {
    printWindow.addEventListener("load", () => {
      printWindow.print();
    });
  }
};
