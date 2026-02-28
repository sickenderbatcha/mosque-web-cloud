import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Printer, ArrowLeft, Building2, Phone, User, Heart, IndianRupee, CheckCircle2, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { useReceiptHeaderSettings } from "@/hooks/useReceiptHeaderSettings";
import { useReceiptNumberSettings } from "@/hooks/useReceiptNumberSettings";

// Tamil Unicode font CSS - embedded for offline support
const getTamilFontCSS = () => `
  @font-face {
    font-family: 'Tamil';
    src: local('Noto Sans Tamil'), local('Latha'), local('Vijaya'), local('Arial Unicode MS');
    unicode-range: U+0B80-0BFF;
  }
`;

interface DonationReceiptProps {
  donation: {
    donorName: string;
    donorPhone: string;
    donorEmail?: string;
    amount: number;
    purpose: string;
    receiptNumber: string;
    paymentMethod: string;
    isAnonymous: boolean;
    createdAt: string;
  };
  onClose: () => void;
  requireAction?: boolean;
}

// Tamil translations for common donation purposes
const DONATION_PURPOSE_TAMIL: Record<string, string> = {
  'Nonbu Kanji': 'நோன்புக் கஞ்சி',
  'nonbu kanji': 'நோன்புக் கஞ்சி',
  'General Donation': 'பொது நன்கொடை',
  'general donation': 'பொது நன்கொடை',
  'Mosque Maintenance': 'பள்ளிவாசல் பராமரிப்பு',
  'mosque maintenance': 'பள்ளிவாசல் பராமரிப்பு',
  'Building Fund': 'கட்டிட நிதி',
  'building fund': 'கட்டிட நிதி',
  'Mahal Construction': 'மஹால் கட்டுமானம்',
  'mahal construction': 'மஹால் கட்டுமானம்',
  'Zakat': 'ஜக்காத்',
  'zakat': 'ஜக்காத்',
  'Sadaqah': 'ஸதக்கா',
  'sadaqah': 'ஸதக்கா',
  'Fitrah': 'ஃபித்ரா',
  'fitrah': 'ஃபித்ரா',
  'Eid Fund': 'பெருநாள் நிதி',
  'eid fund': 'பெருநாள் நிதி',
  'Ramadan Fund': 'ரமலான் நிதி',
  'ramadan fund': 'ரமலான் நிதி',
  'Education Fund': 'கல்வி நிதி',
  'education fund': 'கல்வி நிதி',
  'Orphan Support': 'அநாதை உதவி',
  'orphan support': 'அநாதை உதவி',
  'Widow Support': 'விதவை உதவி',
  'widow support': 'விதவை உதவி',
  'Medical Aid': 'மருத்துவ உதவி',
  'medical aid': 'மருத்துவ உதவி',
  'Food Distribution': 'உணவு விநியோகம்',
  'food distribution': 'உணவு விநியோகம்',
  'Water Project': 'நீர் திட்டம்',
  'water project': 'நீர் திட்டம்',
  'Electricity Bill': 'மின்சார கட்டணம்',
  'electricity bill': 'மின்சார கட்டணம்',
  'Staff Salary': 'ஊழியர் சம்பளம்',
  'staff salary': 'ஊழியர் சம்பளம்',
  'Imam Salary': 'இமாம் சம்பளம்',
  'imam salary': 'இமாம் சம்பளம்',
  'Muazzin Salary': 'முஅத்தின் சம்பளம்',
  'muazzin salary': 'முஅத்தின் சம்பளம்',
  'Quran Classes': 'குர்ஆன் வகுப்புகள்',
  'quran classes': 'குர்ஆன் வகுப்புகள்',
  'Islamic Education': 'இஸ்லாமிய கல்வி',
  'islamic education': 'இஸ்லாமிய கல்வி',
  'Funeral Expenses': 'இறுதி சடங்கு செலவுகள்',
  'funeral expenses': 'இறுதி சடங்கு செலவுகள்',
  'Marriage Support': 'திருமண உதவி',
  'marriage support': 'திருமண உதவி',
  'Prayer Mats': 'தொழுகை விரிப்புகள்',
  'prayer mats': 'தொழுகை விரிப்புகள்',
  'Sound System': 'ஒலி அமைப்பு',
  'sound system': 'ஒலி அமைப்பு',
  'AC/Fan Maintenance': 'ஏசி/மின்விசிறி பராமரிப்பு',
  'ac/fan maintenance': 'ஏசி/மின்விசிறி பராமரிப்பு',
  'Renovation': 'புனரமைப்பு',
  'renovation': 'புனரமைப்பு',
  'Other': 'மற்றவை',
  'other': 'மற்றவை',
};

const getPurposeTamil = (purpose: string): string => {
  // Check for exact match first
  if (DONATION_PURPOSE_TAMIL[purpose]) {
    return DONATION_PURPOSE_TAMIL[purpose];
  }
  // Check for case-insensitive match
  const lowerPurpose = purpose.toLowerCase();
  if (DONATION_PURPOSE_TAMIL[lowerPurpose]) {
    return DONATION_PURPOSE_TAMIL[lowerPurpose];
  }
  // Return original purpose if no translation found (could be Tamil or custom text)
  return purpose;
};

const DonationReceipt = ({ donation, onClose, requireAction = false }: DonationReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings: headerSettings } = useReceiptHeaderSettings();
  const { getReceiptNumber } = useReceiptNumberSettings();
  const [hasActioned, setHasActioned] = useState(false);

  // Strictly prevent navigation until user prints/downloads at least once
  useEffect(() => {
    if (!requireAction || hasActioned) return;

    const lockedUrl = window.location.href;
    window.history.pushState({ receiptActionLocked: true }, "", lockedUrl);

    const handlePopState = () => {
      window.history.pushState({ receiptActionLocked: true }, "", lockedUrl);
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingField =
        !!target &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);

      const isBackNavigationKey =
        (event.altKey && event.key === "ArrowLeft") || (!isTypingField && event.key === "Backspace");

      if (isBackNavigationKey) {
        event.preventDefault();
        window.history.pushState({ receiptActionLocked: true }, "", lockedUrl);
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [requireAction, hasActioned]);

  const formattedReceiptNumber = getReceiptNumber("donation", donation.receiptNumber);

  const getPaymentMethodTamil = (method: string) => {
    if (method.toLowerCase() === 'cash') return 'ரொக்கம்';
    if (method.toLowerCase() === 'online') return 'ஆன்லைன்';
    return method;
  };

  const handlePrint = () => {
    setHasActioned(true);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const styles = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans Tamil', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; }
        .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #1a5f4a; padding: 30px; }
        .header { text-align: center; border-bottom: 2px dashed #1a5f4a; padding-bottom: 20px; margin-bottom: 20px; }
        .mosque-name { font-size: 24px; font-weight: bold; color: #1a5f4a; margin-bottom: 5px; }
        .mosque-name-tamil { font-size: 20px; color: #1a5f4a; margin-bottom: 10px; }
        .receipt-title { font-size: 18px; color: #333; text-transform: uppercase; letter-spacing: 2px; }
        .success-badge { background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ddd; }
        .info-label { color: #666; }
        .info-value { font-weight: 600; color: #333; }
        .amount-box { background: #1a5f4a; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .amount-label { font-size: 12px; opacity: 0.9; }
        .amount-value { font-size: 28px; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px dashed #1a5f4a; color: #666; font-size: 12px; }
        .receipt-number { font-family: monospace; background: #f5f5f5; padding: 10px; text-align: center; margin-top: 15px; border-radius: 5px; }
        @media print { body { padding: 0; } .receipt { border: none; } }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>நன்கொடை ரசீது - ${formattedReceiptNumber}</title>
          ${styles}
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="mosque-name-tamil">${headerSettings.organizationNameTa}</div>
              <div class="receipt-title">நன்கொடை ரசீது</div>
              <div class="success-badge">✓ ${getPaymentMethodTamil(donation.paymentMethod)} பணம் பெறப்பட்டது</div>
            </div>

            <div class="section">
              <div class="section-title">நன்கொடையாளர் விவரங்கள்</div>
              <div class="info-row">
                <span class="info-label">நன்கொடையாளர் பெயர்</span>
                <span class="info-value">${donation.isAnonymous ? "அநாமதேய நன்கொடையாளர்" : donation.donorName}</span>
              </div>
              ${!donation.isAnonymous ? `
              <div class="info-row">
                <span class="info-label">தொலைபேசி</span>
                <span class="info-value">${donation.donorPhone}</span>
              </div>
              ` : ''}
              ${donation.donorEmail && !donation.isAnonymous ? `
              <div class="info-row">
                <span class="info-label">மின்னஞ்சல்</span>
                <span class="info-value">${donation.donorEmail}</span>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">நன்கொடை விவரங்கள்</div>
              <div class="info-row">
                <span class="info-label">நோக்கம்</span>
                <span class="info-value">${getPurposeTamil(donation.purpose)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">பணம் செலுத்தும் முறை</span>
                <span class="info-value">${getPaymentMethodTamil(donation.paymentMethod)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">தேதி</span>
                <span class="info-value">${format(new Date(donation.createdAt), "dd/MM/yyyy")}</span>
              </div>
            </div>

            <div class="amount-box">
              <div class="amount-label">நன்கொடை தொகை</div>
              <div class="amount-value">₹${donation.amount.toLocaleString()}</div>
            </div>

            <div class="receipt-number">
              <div style="font-size: 10px; color: #666; margin-bottom: 5px;">ரசீது எண்</div>
              <div style="font-weight: bold;">${formattedReceiptNumber}</div>
            </div>

            <div class="footer">
              <p>ஜஸாக் அல்லாஹு கைரன் - அல்லாஹ் உங்களுக்கு நற்கூலி அளிப்பானாக!</p>
              <p style="margin-top: 5px;">${headerSettings.footerMessage}</p>
              <p style="margin-top: 10px; font-size: 10px;">உருவாக்கப்பட்ட தேதி: ${format(new Date(), "dd/MM/yyyy")}</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDownload = () => {
    setHasActioned(true);
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>நன்கொடை ரசீது - ${formattedReceiptNumber}</title>
          <style>
            ${getTamilFontCSS()}
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Tamil', 'Noto Sans Tamil', 'Latha', 'Vijaya', 'Arial Unicode MS', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #fff; }
            .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #1a5f4a; padding: 30px; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px dashed #1a5f4a; padding-bottom: 20px; margin-bottom: 20px; }
            .mosque-name { font-size: 24px; font-weight: bold; color: #1a5f4a; }
            .mosque-name-tamil { font-size: 20px; color: #1a5f4a; margin-bottom: 5px; }
            .receipt-title { font-size: 16px; color: #333; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; }
            .success-badge { background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; font-weight: bold; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ddd; }
            .info-label { color: #666; }
            .info-value { font-weight: 600; color: #333; }
            .amount-box { background: #1a5f4a; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .amount-label { font-size: 12px; opacity: 0.9; }
            .amount-value { font-size: 28px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px dashed #1a5f4a; color: #666; font-size: 12px; }
            .receipt-number { font-family: monospace; background: #f5f5f5; padding: 10px; text-align: center; margin-top: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="mosque-name-tamil">${headerSettings.organizationNameTa}</div>
              <div class="receipt-title">நன்கொடை ரசீது</div>
              <div class="success-badge">✓ ${getPaymentMethodTamil(donation.paymentMethod)} பணம் பெறப்பட்டது</div>
            </div>

            <div class="section">
              <div class="section-title">நன்கொடையாளர் விவரங்கள்</div>
              <div class="info-row"><span class="info-label">நன்கொடையாளர் பெயர்</span><span class="info-value">${donation.isAnonymous ? "அநாமதேய நன்கொடையாளர்" : donation.donorName}</span></div>
              ${!donation.isAnonymous ? `<div class="info-row"><span class="info-label">தொலைபேசி</span><span class="info-value">${donation.donorPhone}</span></div>` : ''}
              ${donation.donorEmail && !donation.isAnonymous ? `<div class="info-row"><span class="info-label">மின்னஞ்சல்</span><span class="info-value">${donation.donorEmail}</span></div>` : ''}
            </div>

            <div class="section">
              <div class="section-title">நன்கொடை விவரங்கள்</div>
              <div class="info-row"><span class="info-label">நோக்கம்</span><span class="info-value">${getPurposeTamil(donation.purpose)}</span></div>
              <div class="info-row"><span class="info-label">பணம் செலுத்தும் முறை</span><span class="info-value">${getPaymentMethodTamil(donation.paymentMethod)}</span></div>
              <div class="info-row"><span class="info-label">தேதி</span><span class="info-value">${format(new Date(donation.createdAt), "dd/MM/yyyy")}</span></div>
            </div>

            <div class="amount-box">
              <div class="amount-label">நன்கொடை தொகை</div>
              <div class="amount-value">₹${donation.amount.toLocaleString()}</div>
            </div>

            <div class="receipt-number">
              <div style="font-size: 10px; color: #666; margin-bottom: 5px;">ரசீது எண்</div>
              <div style="font-weight: bold;">${formattedReceiptNumber}</div>
            </div>

            <div class="footer">
              <p>ஜஸாக் அல்லாஹு கைரன் - அல்லாஹ் உங்களுக்கு நற்கூலி அளிப்பானாக!</p>
              <p style="margin-top: 5px;">${headerSettings.footerMessage}</p>
              <p style="margin-top: 10px; font-size: 10px;">உருவாக்கப்பட்ட தேதி: ${format(new Date(), "dd/MM/yyyy")}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `donation-receipt-${formattedReceiptNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-auto"
      >
        <Card className="p-0 overflow-hidden shadow-lg">
          {/* Receipt action required alert */}
          {requireAction && !hasActioned && (
            <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-tamil">
                தயவுசெய்து ரசீதை அச்சிடவும் அல்லது பதிவிறக்கம் செய்யவும். இதை செய்யாமல் திரும்ப செல்ல முடியாது.
                <br />
                <span className="text-xs">Please print or download the receipt before going back.</span>
              </AlertDescription>
            </Alert>
          )}
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={requireAction && !hasActioned}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                பின்செல்
              </Button>
              <h2 className="font-semibold font-tamil">நன்கொடை ரசீது</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                அச்சிடு
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                பதிவிறக்கம்
              </Button>
            </div>
          </div>

          {/* Receipt Content */}
          <div ref={receiptRef} className="p-6 font-tamil">
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-primary/30 pb-6 mb-6">
              <Building2 className="h-10 w-10 mx-auto mb-2 text-primary" />
              <h3 className="text-lg text-primary leading-relaxed">{headerSettings.organizationNameTa}</h3>
              <p className="text-sm text-muted-foreground uppercase tracking-widest mt-2">நன்கொடை ரசீது</p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full mt-4"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-semibold">{getPaymentMethodTamil(donation.paymentMethod)} பணம் பெறப்பட்டது</span>
              </motion.div>
            </div>

            {/* Donor Details */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground border-b pb-2">நன்கொடையாளர் விவரங்கள்</h4>
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> நன்கொடையாளர் பெயர்
                  </span>
                  <span className="font-medium">{donation.isAnonymous ? "அநாமதேய நன்கொடையாளர்" : donation.donorName}</span>
                </div>
                {!donation.isAnonymous && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" /> தொலைபேசி
                    </span>
                    <span className="font-medium">{donation.donorPhone}</span>
                  </div>
                )}
                {donation.donorEmail && !donation.isAnonymous && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" /> மின்னஞ்சல்
                    </span>
                    <span className="font-medium">{donation.donorEmail}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Donation Details */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground border-b pb-2">நன்கொடை விவரங்கள்</h4>
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Heart className="h-4 w-4" /> நோக்கம்
                  </span>
                  <span className="font-medium">{getPurposeTamil(donation.purpose)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">பணம் செலுத்தும் முறை</span>
                  <span className="font-medium">{getPaymentMethodTamil(donation.paymentMethod)}</span>
                </div>
              </div>
            </div>

            {/* Total Amount */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-primary text-primary-foreground p-4 rounded-lg text-center mb-6"
            >
              <p className="text-sm opacity-90">நன்கொடை தொகை</p>
              <p className="text-3xl font-bold flex items-center justify-center gap-1">
                <IndianRupee className="h-6 w-6" />
                {donation.amount.toLocaleString()}
              </p>
            </motion.div>

            {/* Receipt Number */}
            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">ரசீது எண்</p>
              <p className="font-mono font-bold">{formattedReceiptNumber}</p>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pt-6 border-t-2 border-dashed border-primary/30">
              <p className="text-sm text-muted-foreground">ஜஸாக் அல்லாஹு கைரன் - அல்லாஹ் உங்களுக்கு நற்கூலி அளிப்பானாக!</p>
              <p className="text-xs text-muted-foreground mt-2">
                உருவாக்கப்பட்ட தேதி: {format(new Date(), "dd/MM/yyyy")}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default DonationReceipt;
