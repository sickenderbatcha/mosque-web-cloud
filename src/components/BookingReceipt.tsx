import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Printer, X, Building2, Phone, Mail, Calendar, Clock, Users, IndianRupee, CheckCircle2, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { useReceiptHeaderSettings } from "@/hooks/useReceiptHeaderSettings";
import { getLatestSequentialReceiptMap } from "@/lib/certificatePayments";

// Tamil translations for event types
const EVENT_TYPE_TAMIL: Record<string, string> = {
  "Wedding": "திருமணம்",
  "Nikkah": "நிக்காஹ்",
  "Walima": "வலீமா",
  "Engagement": "நிச்சயதார்த்தம்",
  "Other": "மற்றவை",
};

// Tamil translations for service names
const SERVICE_NAME_TAMIL: Record<string, string> = {
  "Nikkah Book": "நிக்காஹ் புத்தகம்",
  "Hall": "மண்டபம்",
  "Dining Hall": "உணவு இட வசதி",
};

const getEventTypeTamil = (eventType: string): string => {
  return EVENT_TYPE_TAMIL[eventType] || eventType;
};

const getServiceNameTamil = (serviceName: string): string => {
  return SERVICE_NAME_TAMIL[serviceName] || serviceName;
};

// Convert local font to base64 for embedding in print/download windows
const getTamilFontBase64 = async (): Promise<string> => {
  try {
    const response = await fetch("/fonts/NotoSansTamil-Regular.ttf");
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return "";
  }
};

const getTamilBoldFontBase64 = async (): Promise<string> => {
  try {
    const response = await fetch("/fonts/NotoSansTamil-Bold.ttf");
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return "";
  }
};

const buildFontCSS = (regularBase64: string, boldBase64: string) => `
  @font-face {
    font-family: 'NotoSansTamil';
    src: url(data:font/truetype;base64,${regularBase64}) format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  ${boldBase64 ? `
  @font-face {
    font-family: 'NotoSansTamil';
    src: url(data:font/truetype;base64,${boldBase64}) format('truetype');
    font-weight: 700;
    font-style: normal;
  }
  ` : ""}
`;

interface BookingReceiptProps {
  booking: {
    applicantName: string;
    applicantPhone: string;
    applicantEmail?: string;
    eventType: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    expectedGuests?: string;
    amount: number;
    bookingId: string; // The actual booking UUID
    services: { name: string; rate: number }[];
    razorpayPaymentId?: string;
    paymentMethod?: string;
  };
  onClose: () => void;
  requireAction?: boolean;
}

const getPaymentMethodTamil = (method?: string) => {
  if (!method) return 'ஆன்லைன்';
  if (method.toLowerCase() === 'cash') return 'ரொக்கம்';
  if (method.toLowerCase() === 'online') return 'ஆன்லைன்';
  return method;
};

const getPaymentMethodEnglish = (method?: string) => {
  if (!method) return 'Online';
  if (method.toLowerCase() === 'cash') return 'Cash';
  if (method.toLowerCase() === 'online') return 'Online';
  return method;
};

const BookingReceipt = ({ booking, onClose, requireAction = false }: BookingReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings: headerSettings } = useReceiptHeaderSettings();
  const [hasActioned, setHasActioned] = useState(false);
  const [receiptNumber, setReceiptNumber] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(true);

  // Fetch authoritative sequential receipt number from income table
  useEffect(() => {
    const fetchReceiptNumber = async () => {
      setReceiptLoading(true);
      try {
        const receiptMap = await getLatestSequentialReceiptMap({
          referenceIds: [booking.bookingId],
          referenceTypes: ["booking"],
          retries: 12,
          retryDelayMs: 1000,
        });

        setReceiptNumber(receiptMap[booking.bookingId] || null);
      } catch {
        setReceiptNumber(null);
      } finally {
        setReceiptLoading(false);
      }
    };

    fetchReceiptNumber();
  }, [booking.bookingId]);

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

  const formattedReceiptNumber = receiptLoading ? "Loading..." : receiptNumber || "Pending sync";

  const buildReceiptHTML = (fontCSS: string) => {
    const styles = `
      <style>
        ${fontCSS}
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'NotoSansTamil', 'Noto Sans Tamil', 'Latha', 'Vijaya', 'Arial Unicode MS', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #fff; }
        .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #1a5f4a; padding: 30px; }
        .header { text-align: center; border-bottom: 2px dashed #1a5f4a; padding-bottom: 20px; margin-bottom: 20px; }
        .mosque-name-tamil { font-size: 22px; font-weight: bold; color: #1a5f4a; margin-bottom: 4px; }
        .mosque-name-en { font-size: 16px; color: #1a5f4a; margin-bottom: 6px; }
        .header-address { font-size: 11px; color: #555; margin-bottom: 2px; }
        .header-phone { font-size: 11px; color: #555; margin-bottom: 10px; }
        .receipt-title { font-size: 18px; color: #333; text-transform: uppercase; letter-spacing: 2px; }
        .success-badge { background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; }
        .section { margin-bottom: 20px; }
        .section-title { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ddd; }
        .info-label { color: #666; }
        .info-value { font-weight: 600; color: #333; }
        .services-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .services-table th, .services-table td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
        .services-table th { background: #f5f5f5; color: #666; font-weight: 600; }
        .total-row { background: #1a5f4a; color: white; }
        .total-row td { font-weight: bold; font-size: 18px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px dashed #1a5f4a; color: #666; font-size: 12px; }
        .transaction-id { font-family: monospace; background: #f5f5f5; padding: 10px; text-align: center; margin-top: 15px; border-radius: 5px; }
        @media print { body { padding: 0; } .receipt { border: none; } }
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>மஹால் முன்பதிவு ரசீது - ${formattedReceiptNumber}</title>
          ${styles}
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="mosque-name-tamil">${headerSettings.organizationNameTa}</div>
              <div class="mosque-name-en">${headerSettings.organizationNameEn}</div>
              <div class="header-address">${headerSettings.addressLine1}</div>
              <div class="header-address">${headerSettings.addressLine2}</div>
              <div class="header-phone">📞 ${headerSettings.phone}</div>
              <div class="receipt-title">மஹால் முன்பதிவு ரசீது</div>
              <div class="success-badge">✓ பணம் செலுத்தப்பட்டது</div>
            </div>

            <div class="section">
              <div class="section-title">முன்பதிவு விவரங்கள்</div>
              <div class="info-row">
                <span class="info-label">விண்ணப்பதாரர் பெயர்</span>
                <span class="info-value">${booking.applicantName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">தொலைபேசி</span>
                <span class="info-value">${booking.applicantPhone}</span>
              </div>
              ${booking.applicantEmail ? `
              <div class="info-row">
                <span class="info-label">மின்னஞ்சல்</span>
                <span class="info-value">${booking.applicantEmail}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">நிகழ்வு வகை</span>
                <span class="info-value">${getEventTypeTamil(booking.eventType)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">நிகழ்வு தேதி</span>
                <span class="info-value">${format(new Date(booking.eventDate), "dd/MM/yyyy")}</span>
              </div>
              <div class="info-row">
                <span class="info-label">நேர இடைவெளி</span>
                <span class="info-value">${booking.startTime} - ${booking.endTime}</span>
              </div>
              ${booking.expectedGuests ? `
              <div class="info-row">
                <span class="info-label">எதிர்பார்க்கப்படும் விருந்தினர்கள்</span>
                <span class="info-value">${booking.expectedGuests}</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">செலுத்தும் முறை / Payment Method</span>
                <span class="info-value">${getPaymentMethodTamil(booking.paymentMethod)} (${getPaymentMethodEnglish(booking.paymentMethod)})</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">சேவைகள்</div>
              <table class="services-table">
                <thead>
                  <tr>
                    <th>சேவை</th>
                    <th style="text-align: right;">தொகை</th>
                  </tr>
                </thead>
                <tbody>
                  ${booking.services.map(s => `
                    <tr>
                      <td>${getServiceNameTamil(s.name)}</td>
                      <td style="text-align: right;">₹${s.rate.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td>மொத்த தொகை</td>
                    <td style="text-align: right;">₹${booking.amount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="transaction-id">
              <div style="font-size: 10px; color: #666; margin-bottom: 5px;">ரசீது எண் / Receipt No.</div>
              <div style="font-weight: bold;">${formattedReceiptNumber}</div>
              ${booking.razorpayPaymentId ? `<div style="font-size: 10px; color: #666; margin-top: 5px;">Razorpay Ref: ${booking.razorpayPaymentId}</div>` : ''}
            </div>

            ${booking.paymentMethod?.toLowerCase() !== 'cash' ? `<div style="background: #fff8e1; border: 1px solid #f9a825; padding: 10px; border-radius: 5px; margin-bottom: 15px; text-align: center;">
              <p style="color: #e65100; font-size: 13px; font-weight: 600; margin: 0;">குறிப்பு : தாங்கள் செலுத்திய பணம் எங்களுக்கு கிடைக்கப் பெற்றவுடன் முன் பதிவு உறுதி செய்யப்படும்</p>
            </div>` : ''}

            <div class="footer">
              <p>${headerSettings.footerMessage}</p>
              <p style="margin-top: 3px;">${headerSettings.footerMessageEn}</p>
              <p style="margin-top: 10px; font-size: 10px;">உருவாக்கப்பட்ட தேதி: ${format(new Date(), "dd/MM/yyyy")}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    const [regularBase64, boldBase64] = await Promise.all([
      getTamilFontBase64(),
      getTamilBoldFontBase64(),
    ]);
    const fontCSS = buildFontCSS(regularBase64, boldBase64);
    const html = buildReceiptHTML(fontCSS);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      setHasActioned(true);
    }, 500);
  };

  const handleDownload = async () => {
    const [regularBase64, boldBase64] = await Promise.all([
      getTamilFontBase64(),
      getTamilBoldFontBase64(),
    ]);
    const fontCSS = buildFontCSS(regularBase64, boldBase64);
    const html = buildReceiptHTML(fontCSS);

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `booking-receipt-${formattedReceiptNumber}.html`;
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
              <h2 className="font-semibold font-tamil text-sm">மஹால் முன்பதிவு ரசீது</h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant={requireAction && !hasActioned ? "default" : "outline"} size="sm" onClick={handlePrint} disabled={receiptLoading || !receiptNumber}>
                {receiptLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                அச்சிடு
              </Button>
              <Button variant={requireAction && !hasActioned ? "default" : "outline"} size="sm" onClick={handleDownload} disabled={receiptLoading || !receiptNumber}>
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
              <h3 className="text-lg text-primary leading-relaxed">{headerSettings.organizationNameTa}</h3>
              <p className="text-sm text-primary/80">{headerSettings.organizationNameEn}</p>
              <p className="text-xs text-muted-foreground mt-1">{headerSettings.addressLine1}</p>
              <p className="text-xs text-muted-foreground">{headerSettings.addressLine2}</p>
              <p className="text-xs text-muted-foreground">📞 {headerSettings.phone}</p>
              <p className="text-sm text-muted-foreground uppercase tracking-widest mt-2">மஹால் முன்பதிவு ரசீது</p>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full mt-4"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-semibold">பணம் செலுத்தப்பட்டது</span>
              </motion.div>
            </div>

            {/* Booking Details */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground border-b pb-2">முன்பதிவு விவரங்கள்</h4>
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" /> விண்ணப்பதாரர் பெயர்
                  </span>
                  <span className="font-medium">{booking.applicantName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" /> தொலைபேசி
                  </span>
                  <span className="font-medium">{booking.applicantPhone}</span>
                </div>
                {booking.applicantEmail && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" /> மின்னஞ்சல்
                    </span>
                    <span className="font-medium">{booking.applicantEmail}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> நிகழ்வு வகை
                  </span>
                  <span className="font-medium">{getEventTypeTamil(booking.eventType)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> நிகழ்வு தேதி
                  </span>
                  <span className="font-medium">{format(new Date(booking.eventDate), "dd/MM/yyyy")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" /> நேர இடைவெளி
                  </span>
                  <span className="font-medium">{booking.startTime} - {booking.endTime}</span>
                </div>
                {booking.expectedGuests && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" /> எதிர்பார்க்கப்படும் விருந்தினர்கள்
                    </span>
                    <span className="font-medium">{booking.expectedGuests}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    செலுத்தும் முறை
                  </span>
                  <span className="font-medium">{getPaymentMethodTamil(booking.paymentMethod)} ({getPaymentMethodEnglish(booking.paymentMethod)})</span>
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground border-b pb-2">சேவைகள்</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">சேவை</th>
                      <th className="px-4 py-2 text-right text-sm font-medium">தொகை</th>
                    </tr>
                  </thead>
                  <tbody>
                    {booking.services.map((service, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2 text-sm">{getServiceNameTamil(service.name)}</td>
                        <td className="px-4 py-2 text-sm text-right">₹{service.rate.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Amount */}
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-primary text-primary-foreground p-4 rounded-lg text-center mb-6"
            >
              <p className="text-sm opacity-90">மொத்த தொகை</p>
              <p className="text-3xl font-bold flex items-center justify-center gap-1">
                <IndianRupee className="h-6 w-6" />
                {booking.amount.toLocaleString()}
              </p>
            </motion.div>

            {/* Transaction ID */}
            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">ரசீது எண் / Receipt No.</p>
              <p className="font-mono font-bold">{formattedReceiptNumber}</p>
              {booking.razorpayPaymentId && (
                <p className="text-xs text-muted-foreground mt-2">Razorpay Ref: {booking.razorpayPaymentId}</p>
              )}
            </div>

            {/* Footer */}
            {/* Note */}
            {booking.paymentMethod?.toLowerCase() !== 'cash' && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-400 rounded-lg p-3 text-center mt-6">
                <p className="text-amber-800 dark:text-amber-300 text-sm font-semibold">
                  குறிப்பு : தாங்கள் செலுத்திய பணம் எங்களுக்கு கிடைக்கப் பெற்றவுடன் முன் பதிவு உறுதி செய்யப்படும்
                </p>
              </div>
            )}

            <div className="text-center mt-6 pt-6 border-t-2 border-dashed border-primary/30">
              <p className="text-sm text-muted-foreground">{headerSettings.footerMessage}</p>
              <p className="text-sm text-muted-foreground mt-1">{headerSettings.footerMessageEn}</p>
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

export default BookingReceipt;
