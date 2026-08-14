export interface LetterheadBranding {
  organizationNameTa: string;
  organizationNameEn: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  footerTagline: string;
  footerTaglineEn: string;
}

export interface LetterheadFields {
  referenceNumber: string;
  date: string; // ISO yyyy-MM-dd
  recipientName: string;
  recipientAddress: string;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  signatoryName: string;
  designation: string;
}

export interface LetterheadLayout {
  topMarginMm: number;
  bottomMarginMm: number;
  bodyFontPx: number;
}

export const DEFAULT_LETTERHEAD_LAYOUT: LetterheadLayout = {
  topMarginMm: 18,
  bottomMarginMm: 18,
  bodyFontPx: 13.5,
};

export const EMPTY_LETTERHEAD_FIELDS: LetterheadFields = {
  referenceNumber: "",
  date: "",
  recipientName: "",
  recipientAddress: "",
  subject: "",
  salutation: "",
  body: "",
  closing: "",
  signatoryName: "",
  designation: "",
};

export const escapeHtml = (value: string): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const multiline = (value: string): string =>
  escapeHtml(value).replace(/\r\n|\r|\n/g, "<br/>");

/** ISO yyyy-MM-dd -> dd/mm/yyyy (returns the raw string if it is not ISO). */
export const formatDisplayDate = (iso: string): string => {
  if (!iso) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const trimmed = (value: string | undefined) => (value ?? "").trim();

export const isBodyOnly = (fields: LetterheadFields): boolean => {
  const others: (keyof LetterheadFields)[] = [
    "referenceNumber",
    "date",
    "recipientName",
    "recipientAddress",
    "subject",
    "salutation",
    "closing",
    "signatoryName",
    "designation",
  ];
  return trimmed(fields.body).length > 0 && others.every((k) => trimmed(fields[k]).length === 0);
};

const buildLetterBlocks = (fields: LetterheadFields): string => {
  if (isBodyOnly(fields)) {
    return `<div class="letter-body">${multiline(trimmed(fields.body))}</div>`;
  }

  const parts: string[] = [];

  const ref = trimmed(fields.referenceNumber);
  const date = formatDisplayDate(trimmed(fields.date));
  if (ref || date) {
    parts.push(
      `<div class="meta-row">` +
        `<div class="meta-left">${ref ? `Ref: ${escapeHtml(ref)}` : ""}</div>` +
        `<div class="meta-right">${date ? `Date: ${escapeHtml(date)}` : ""}</div>` +
        `</div>`
    );
  }

  const recipientName = trimmed(fields.recipientName);
  const recipientAddress = trimmed(fields.recipientAddress);
  if (recipientName || recipientAddress) {
    parts.push(
      `<div class="recipient">` +
        (recipientName ? `<div class="recipient-name">${escapeHtml(recipientName)}</div>` : "") +
        (recipientAddress ? `<div class="recipient-address">${multiline(recipientAddress)}</div>` : "") +
        `</div>`
    );
  }

  const subject = trimmed(fields.subject);
  if (subject) parts.push(`<div class="subject">${escapeHtml(subject)}</div>`);

  const salutation = trimmed(fields.salutation);
  if (salutation) parts.push(`<div class="salutation">${escapeHtml(salutation)}</div>`);

  const body = trimmed(fields.body);
  if (body) parts.push(`<div class="letter-body">${multiline(body)}</div>`);

  const closing = trimmed(fields.closing);
  if (closing) parts.push(`<div class="closing">${escapeHtml(closing)}</div>`);

  const signatoryName = trimmed(fields.signatoryName);
  const designation = trimmed(fields.designation);
  if (signatoryName || designation) {
    parts.push(
      `<div class="signature">` +
        (signatoryName ? `<div class="signatory-name">${escapeHtml(signatoryName)}</div>` : "") +
        (designation ? `<div class="designation">${escapeHtml(designation)}</div>` : "") +
        `</div>`
    );
  }

  return parts.join("\n");
};

export const buildLetterheadHtml = (
  branding: LetterheadBranding,
  fields: LetterheadFields,
  layout: LetterheadLayout
): string => {
  const footerTa = trimmed(branding.footerTagline);
  const footerEn = trimmed(branding.footerTaglineEn);

  return `<!doctype html>
<html lang="ta">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(branding.organizationNameEn || "Letterhead")}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #f1f1f1; }
  body {
    font-family: 'Noto Sans Tamil', 'Inter', system-ui, sans-serif;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .sheet {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    background: #fff;
    display: flex;
    flex-direction: column;
    padding: ${layout.topMarginMm}mm 16mm ${layout.bottomMarginMm}mm;
  }
  .lh-header {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 2px solid #0f5132;
    padding-bottom: 10px;
  }
  .lh-titles { flex: 1; text-align: center; }
  .org-ta { font-size: 10px; font-weight: 700; color: #0f5132; line-height: 1.3; }
  .org-en { font-size: 13px; font-weight: 600; color: #444; margin-top: 2px; }
  .addr { font-size: 11.5px; color: #555; margin-top: 4px; line-height: 1.5; }
  .lh-content { flex: 1 1 auto; font-size: ${layout.bodyFontPx}px; line-height: 1.65; padding-top: 12px; }
  .meta-row { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
  .recipient { margin-bottom: 14px; }
  .recipient-name { font-weight: 700; }
  .subject { font-weight: 700; text-decoration: underline; margin-bottom: 14px; }
  .salutation { margin-bottom: 10px; }
  .letter-body { white-space: normal; margin-bottom: 16px; text-align: justify; }
  .closing { margin-bottom: 28px; }
  .signature { margin-top: 8px; }
  .signatory-name { font-weight: 700; }
  .designation { font-size: 0.85em; color: #666; }
  .lh-footer {
    margin-top: auto;
    border-top: 1px solid #0f5132;
    padding-top: 8px;
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: #0f5132;
  }
  .lh-footer .footer-en { font-size: 11px; font-weight: 600; color: #666; margin-top: 2px; }
  @media (max-width: 640px) {
    .sheet { width: 100%; min-height: 0; }
    .lh-header { flex-direction: column; text-align: center; }
  }
  @media print {
    html, body { background: #fff; }
    .sheet { width: 210mm; min-height: 297mm; }
    .lh-header { flex-direction: row; text-align: left; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <header class="lh-header">
      ${logo ? `<img class="lh-logo" src="${escapeHtml(logo)}" alt="" onerror="this.style.display='none'" />` : ""}
      <div class="lh-titles">
        <div class="org-ta">${escapeHtml(branding.organizationNameTa)}</div>
        <div class="org-en">${escapeHtml(branding.organizationNameEn)}</div>
        <div class="addr">
          ${escapeHtml(branding.addressLine1)}${branding.addressLine2 ? `<br/>${escapeHtml(branding.addressLine2)}` : ""}
          ${branding.phone ? `<br/>${escapeHtml(branding.phone)}` : ""}
        </div>
      </div>
    </header>
    <main class="lh-content">
${buildLetterBlocks(fields)}
    </main>
    <footer class="lh-footer">
      ${footerTa ? `<div>${escapeHtml(footerTa)}</div>` : ""}
      ${footerEn ? `<div class="footer-en">${escapeHtml(footerEn)}</div>` : ""}
    </footer>
  </div>
</body>
</html>`;
};

export const printLetterheadHtml = (html: string) => {
  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
    }, 300);
  };
  return true;
};
