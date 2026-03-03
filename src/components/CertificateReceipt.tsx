import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Printer, ArrowLeft, Building2, FileText, IndianRupee, CheckCircle2, User, Phone, Mail, Calendar, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { useReceiptHeaderSettings } from "@/hooks/useReceiptHeaderSettings";
import { supabase } from "@/integrations/supabase/client";

// Tamil Unicode font CSS - embedded for offline support
const getTamilFontCSS = () => `
  @font-face {
    font-family: 'Tamil';
    src: local('Noto Sans Tamil'), local('Latha'), local('Vijaya'), local('Arial Unicode MS');
    unicode-range: U+0B80-0BFF;
  }
`;

// Certificate type translations
const CERTIFICATE_TYPE_TAMIL: Record<string, string> = {
  marriage: "திருமண சான்றிதழ்",
  death: "இறப்பு சான்றிதழ்",
  noc: "ஆட்சேபனையின்மை சான்றிதழ்",
  heir: "வாரிசு சான்றிதழ்",
};

const CERTIFICATE_TYPE_ENGLISH: Record<string, string> = {
  marriage: "Marriage Certificate",
  death: "Death Certificate",
  noc: "NOC Certificate",
  heir: "Heir Certificate",
};

export interface CertificateReceiptData {
  certificateType: "marriage" | "death" | "noc" | "heir" | "outside_marriage";
  applicantName: string;
  applicantPhone?: string;
  applicantEmail?: string;
  subjectName?: string;
  amount: number;
  receiptNumber: string;
  referenceId: string;
  referenceType: string;
  paymentMethod: string;
  transactionId?: string;
  createdAt: string;
  additionalInfo?: Record<string, string>;
}

interface CertificateReceiptProps {
  data: CertificateReceiptData;
  onClose: () => void;
  requireAction?: boolean;
}

const CertificateReceipt = ({ data, onClose, requireAction = false }: CertificateReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings: headerSettings } = useReceiptHeaderSettings();
  const [hasActioned, setHasActioned] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [receiptLoading, setReceiptLoading] = useState(true);

  // Fetch sequential receipt number from income table
  useEffect(() => {
    const fetchReceiptNumber = async () => {
      setReceiptLoading(true);
      const maxRetries = 5;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const { data: incomeData } = await supabase
          .from("income")
          .select("receipt_number")
          .eq("reference_id", data.referenceId)
          .eq("reference_type", data.referenceType)
          .maybeSingle();

        if (incomeData?.receipt_number) {
          setReceiptNumber(incomeData.receipt_number);
          setReceiptLoading(false);
          return;
        }
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      // Fallback
      setReceiptNumber(data.receiptNumber);
      setReceiptLoading(false);
    };
    fetchReceiptNumber();
  }, [data.referenceId, data.referenceType, data.receiptNumber]);

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

  const formattedReceiptNumber = receiptNumber;

  const getPaymentMethodTamil = (method: string) => {
    if (method.toLowerCase() === "cash") return "ரொக்கம்";
    if (method.toLowerCase() === "online") return "ஆன்லைன்";
    return method;
  };

  const certificateTypeTamil = CERTIFICATE_TYPE_TAMIL[data.certificateType] || data.certificateType;
  const certificateTypeEnglish = CERTIFICATE_TYPE_ENGLISH[data.certificateType] || data.certificateType;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const additionalRows = data.additionalInfo
      ? Object.entries(data.additionalInfo)
          .map(
            ([label, value]) => `
            <div class="info-row">
              <span class="info-label">${label}</span>
              <span class="info-value">${value}</span>
            </div>
          `
          )
          .join("")
      : "";

    const styles = `
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans Tamil', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; }
        .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #1a5f4a; padding: 30px; }
        .header { text-align: center; border-bottom: 2px dashed #1a5f4a; padding-bottom: 20px; margin-bottom: 20px; }
        .mosque-name-tamil { font-size: 20px; color: #1a5f4a; margin-bottom: 10px; }
        .receipt-title { font-size: 18px; color: #333; text-transform: uppercase; letter-spacing: 2px; }
        .receipt-title-tamil { font-size: 16px; color: #1a5f4a; margin-top: 5px; }
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
          <title>${certificateTypeTamil} கட்டண ரசீது - ${formattedReceiptNumber}</title>
          ${styles}
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="mosque-name-tamil">${headerSettings.organizationNameTa}</div>
              <div class="receipt-title">${certificateTypeEnglish} Fee Receipt</div>
              <div class="receipt-title-tamil">${certificateTypeTamil} கட்டண ரசீது</div>
              <div class="success-badge">✓ ${getPaymentMethodTamil(data.paymentMethod)} பணம் பெறப்பட்டது</div>
            </div>

            <div class="section">
              <div class="section-title">விண்ணப்பதாரர் விவரங்கள்</div>
              <div class="info-row">
                <span class="info-label">விண்ணப்பதாரர் பெயர்</span>
                <span class="info-value">${data.applicantName}</span>
              </div>
              ${data.applicantPhone ? `
              <div class="info-row">
                <span class="info-label">தொலைபேசி</span>
                <span class="info-value">${data.applicantPhone}</span>
              </div>
              ` : ""}
              ${data.applicantEmail ? `
              <div class="info-row">
                <span class="info-label">மின்னஞ்சல்</span>
                <span class="info-value">${data.applicantEmail}</span>
              </div>
              ` : ""}
            </div>

            <div class="section">
              <div class="section-title">சான்றிதழ் விவரங்கள்</div>
              <div class="info-row">
                <span class="info-label">சான்றிதழ் வகை</span>
                <span class="info-value">${certificateTypeTamil}</span>
              </div>
              ${data.subjectName ? `
              <div class="info-row">
                <span class="info-label">${data.certificateType === "death" || data.certificateType === "heir" ? "இறந்தவர் பெயர்" : "சம்பந்தப்பட்டவர் பெயர்"}</span>
                <span class="info-value">${data.subjectName}</span>
              </div>
              ` : ""}
              ${additionalRows}
              <div class="info-row">
                <span class="info-label">பணம் செலுத்தும் முறை</span>
                <span class="info-value">${getPaymentMethodTamil(data.paymentMethod)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">தேதி</span>
                <span class="info-value">${format(new Date(data.createdAt), "dd/MM/yyyy")}</span>
              </div>
            </div>

            <div class="amount-box">
              <div class="amount-label">கட்டணத் தொகை</div>
              <div class="amount-value">₹${data.amount.toLocaleString()}</div>
            </div>

            <div class="receipt-number">
              <div style="font-size: 10px; color: #666; margin-bottom: 5px;">ரசீது எண் / Receipt No.</div>
              <div style="font-weight: bold;">${formattedReceiptNumber}</div>
              ${data.transactionId ? `<div style="font-size: 10px; color: #666; margin-top: 5px;">Razorpay Ref: ${data.transactionId}</div>` : ""}
            </div>

            <div class="footer">
              <p>உங்கள் பணம் செலுத்தியதற்கு நன்றி!</p>
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
      setHasActioned(true);
    }, 250);
  };

  const handleDownload = () => {
    const additionalRows = data.additionalInfo
      ? Object.entries(data.additionalInfo)
          .map(
            ([label, value]) =>
              `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`
          )
          .join("")
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${certificateTypeTamil} கட்டண ரசீது - ${formattedReceiptNumber}</title>
          <style>
            ${getTamilFontCSS()}
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Tamil', 'Noto Sans Tamil', 'Latha', 'Vijaya', 'Arial Unicode MS', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #fff; }
            .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #1a5f4a; padding: 30px; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px dashed #1a5f4a; padding-bottom: 20px; margin-bottom: 20px; }
            .mosque-name-tamil { font-size: 20px; color: #1a5f4a; margin-bottom: 5px; }
            .receipt-title { font-size: 16px; color: #333; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; }
            .receipt-title-tamil { font-size: 14px; color: #1a5f4a; margin-top: 5px; }
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
              <div class="receipt-title">${certificateTypeEnglish} Fee Receipt</div>
              <div class="receipt-title-tamil">${certificateTypeTamil} கட்டண ரசீது</div>
              <div class="success-badge">✓ ${getPaymentMethodTamil(data.paymentMethod)} பணம் பெறப்பட்டது</div>
            </div>

            <div class="section">
              <div class="section-title">விண்ணப்பதாரர் விவரங்கள்</div>
              <div class="info-row"><span class="info-label">விண்ணப்பதாரர் பெயர்</span><span class="info-value">${data.applicantName}</span></div>
              ${data.applicantPhone ? `<div class="info-row"><span class="info-label">தொலைபேசி</span><span class="info-value">${data.applicantPhone}</span></div>` : ""}
              ${data.applicantEmail ? `<div class="info-row"><span class="info-label">மின்னஞ்சல்</span><span class="info-value">${data.applicantEmail}</span></div>` : ""}
            </div>

            <div class="section">
              <div class="section-title">சான்றிதழ் விவரங்கள்</div>
              <div class="info-row"><span class="info-label">சான்றிதழ் வகை</span><span class="info-value">${certificateTypeTamil}</span></div>
              ${data.subjectName ? `<div class="info-row"><span class="info-label">${data.certificateType === "death" || data.certificateType === "heir" ? "இறந்தவர் பெயர்" : "சம்பந்தப்பட்டவர் பெயர்"}</span><span class="info-value">${data.subjectName}</span></div>` : ""}
              ${additionalRows}
              <div class="info-row"><span class="info-label">பணம் செலுத்தும் முறை</span><span class="info-value">${getPaymentMethodTamil(data.paymentMethod)}</span></div>
              <div class="info-row"><span class="info-label">தேதி</span><span class="info-value">${format(new Date(data.createdAt), "dd/MM/yyyy")}</span></div>
            </div>

            <div class="amount-box">
              <div class="amount-label">கட்டணத் தொகை</div>
              <div class="amount-value">₹${data.amount.toLocaleString()}</div>
            </div>

            <div class="receipt-number">
              <div style="font-size: 10px; color: #666; margin-bottom: 5px;">ரசீது எண் / Receipt No.</div>
              <div style="font-weight: bold;">${formattedReceiptNumber}</div>
              ${data.transactionId ? `<div style="font-size: 10px; color: #666; margin-top: 5px;">Razorpay Ref: ${data.transactionId}</div>` : ""}
            </div>

            <div class="footer">
              <p>உங்கள் பணம் செலுத்தியதற்கு நன்றி!</p>
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
    a.download = `${data.certificateType}-certificate-receipt-${formattedReceiptNumber}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setHasActioned(true);
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
          {/* Mandatory action warning */}
          {requireAction && !hasActioned && (
            <div className="px-4 pt-3 pb-0">
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-300 font-tamil text-sm">
                  தயவுசெய்து ரசீதை அச்சிடவும் அல்லது பதிவிறக்கம் செய்யவும். / Please print or download the receipt before proceeding.
                </AlertDescription>
              </Alert>
            </div>
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
                {requireAction && !hasActioned ? "ரசீதை அச்சிடவும்" : "பின்செல்"}
              </Button>
              <h2 className="font-semibold font-tamil text-sm">{certificateTypeTamil} கட்டண ரசீது</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant={requireAction && !hasActioned ? "default" : "outline"} size="sm" onClick={handlePrint} disabled={receiptLoading}>
                {receiptLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                அச்சிடு
              </Button>
              <Button variant={requireAction && !hasActioned ? "default" : "outline"} size="sm" onClick={handleDownload} disabled={receiptLoading}>
                {receiptLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                பதிவிறக்கம்
              </Button>
            </div>
          </div>

          {/* Receipt Content */}
          <div ref={receiptRef} className="p-6 font-tamil">
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-primary/30 pb-6 mb-6">
              <Building2 className="h-10 w-10 mx-auto mb-2 text-primary" />
              <h3 className="text-lg text-primary leading-relaxed">
                {headerSettings.organizationNameTa}
              </h3>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2">
                {certificateTypeEnglish} Fee Receipt
              </p>
              <p className="text-sm text-primary mt-1">{certificateTypeTamil} கட்டண ரசீது</p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full mt-4"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-semibold">{getPaymentMethodTamil(data.paymentMethod)} பணம் பெறப்பட்டது</span>
              </motion.div>
            </div>

            {/* Applicant Details */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm text-muted-foreground uppercase tracking-wide border-b pb-2">
                விண்ணப்பதாரர் விவரங்கள்
              </h4>
              <div className="flex items-center justify-between py-2 border-b border-dotted">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  விண்ணப்பதாரர் பெயர்
                </span>
                <span className="font-semibold">{data.applicantName}</span>
              </div>
              {data.applicantPhone && (
                <div className="flex items-center justify-between py-2 border-b border-dotted">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    தொலைபேசி
                  </span>
                  <span className="font-semibold">{data.applicantPhone}</span>
                </div>
              )}
              {data.applicantEmail && (
                <div className="flex items-center justify-between py-2 border-b border-dotted">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    மின்னஞ்சல்
                  </span>
                  <span className="font-semibold text-sm">{data.applicantEmail}</span>
                </div>
              )}
            </div>

            {/* Certificate Details */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm text-muted-foreground uppercase tracking-wide border-b pb-2">
                சான்றிதழ் விவரங்கள்
              </h4>
              <div className="flex items-center justify-between py-2 border-b border-dotted">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  சான்றிதழ் வகை
                </span>
                <span className="font-semibold">{certificateTypeTamil}</span>
              </div>
              {data.subjectName && (
                <div className="flex items-center justify-between py-2 border-b border-dotted">
                  <span className="text-muted-foreground">
                    {data.certificateType === "death" || data.certificateType === "heir"
                      ? "இறந்தவர் பெயர்"
                      : "சம்பந்தப்பட்டவர்"}
                  </span>
                  <span className="font-semibold">{data.subjectName}</span>
                </div>
              )}
              {data.additionalInfo &&
                Object.entries(data.additionalInfo).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-dotted">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              <div className="flex items-center justify-between py-2 border-b border-dotted">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  தேதி
                </span>
                <span className="font-semibold">{format(new Date(data.createdAt), "dd/MM/yyyy")}</span>
              </div>
            </div>

            {/* Amount Box */}
            <div className="bg-primary text-primary-foreground rounded-lg p-4 text-center mb-6">
              <p className="text-sm opacity-90">கட்டணத் தொகை</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-3xl font-bold flex items-center justify-center gap-1"
              >
                <IndianRupee className="h-6 w-6" />
                {data.amount.toLocaleString()}
              </motion.p>
            </div>

            {/* Receipt Number */}
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">ரசீது எண் / Receipt No.</p>
              <p className="font-mono font-bold text-lg">{formattedReceiptNumber}</p>
              {data.transactionId && (
                <p className="text-xs text-muted-foreground mt-2">Razorpay Ref: {data.transactionId}</p>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pt-6 border-t-2 border-dashed border-primary/30 text-sm text-muted-foreground">
              <p>உங்கள் பணம் செலுத்தியதற்கு நன்றி!</p>
              <p className="mt-1">ஏதேனும் கேள்விகளுக்கு, பள்ளிவாசல் நிர்வாகத்தை தொடர்பு கொள்ளவும்.</p>
              <p className="mt-2 text-xs">உருவாக்கப்பட்ட தேதி: {format(new Date(), "dd/MM/yyyy")}</p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default CertificateReceipt;
