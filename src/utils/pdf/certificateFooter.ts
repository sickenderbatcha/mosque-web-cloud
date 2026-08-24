import jsPDF from "jspdf";
import { addTamilText } from "@/utils/pdf/tamilCanvasText";
import {
  getCertificateFooter,
  type CertificateFooterType,
} from "@/lib/certificateFooterSettings";

/**
 * Draws the configurable footer (Tamil and/or English) at the bottom of the page.
 * Nothing is drawn when both footer texts are empty.
 */
export const drawCertificateFooter = async (
  doc: jsPDF,
  type: CertificateFooterType
): Promise<void> => {
  const footer = await getCertificateFooter(type);
  const ta = (footer.ta || "").trim();
  const en = (footer.en || "").trim();
  if (!ta && !en) return;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - 30;

  let y = pageHeight - (ta && en ? 16 : 12);

  if (ta) {
    addTamilText(doc, ta, 15, y, 8, "normal", "center", maxWidth);
    y += 5;
  }

  if (en) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    const lines = doc.splitTextToSize(en, maxWidth) as string[];
    lines.forEach((line, i) => {
      doc.text(line, pageWidth / 2, y + i * 4, { align: "center" });
    });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
  }
};

/** HTML footer markup for the print-window certificates. */
export const certificateFooterHtml = (ta: string, en: string): string => {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const taText = (ta || "").trim();
  const enText = (en || "").trim();
  if (!taText && !enText) return "";
  return `
        <div class="footer">
          ${taText ? `<p style="font-family:'Noto Sans Tamil',sans-serif;">${esc(taText)}</p>` : ""}
          ${enText ? `<p>${esc(enText)}</p>` : ""}
        </div>`;
};
