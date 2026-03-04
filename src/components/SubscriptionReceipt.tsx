import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Printer, ArrowLeft, Building2, Phone, User, Calendar, IndianRupee, CheckCircle2, CreditCard, MapPin, AlertCircle, Loader2 } from "lucide-react";
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

const MONTHS_TAMIL = [
  "ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்",
  "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"
];

interface SubscriptionReceiptProps {
  subscription: {
    id: string;
    member_id: string;
    member_name: string;
    member_phone: string;
    member_address?: string | null;
    subscription_type: string;
    amount: number;
    total_amount: number;
    from_month?: number | null;
    from_year?: number | null;
    to_month?: number | null;
    to_year?: number | null;
    number_of_months?: number | null;
    subscription_year?: number | null;
    payment_status: string | null;
    payment_method?: string | null;
    razorpay_payment_id?: string | null;
    transaction_id?: string | null;
    created_at: string;
  };
  onClose: () => void;
  requireAction?: boolean;
}

const getPaymentMethodTamil = (method?: string | null) => {
  if (!method) return 'ஆன்லைன்';
  if (method.toLowerCase() === 'cash') return 'ரொக்கம்';
  if (method.toLowerCase() === 'online') return 'ஆன்லைன்';
  return method;
};

const getPaymentMethodEnglish = (method?: string | null) => {
  if (!method) return 'Online';
  if (method.toLowerCase() === 'cash') return 'Cash';
  if (method.toLowerCase() === 'online') return 'Online';
  return method;
};

const SubscriptionReceipt = ({ subscription, onClose, requireAction = false }: SubscriptionReceiptProps) => {
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
        const { data } = await supabase
          .from("income")
          .select("receipt_number")
          .eq("reference_id", subscription.id)
          .eq("reference_type", "subscription")
          .maybeSingle();

        if (data?.receipt_number) {
          setReceiptNumber(data.receipt_number);
          setReceiptLoading(false);
          return;
        }
        // Wait 1s before retry
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      // Fallback: use UUID slice
      setReceiptNumber(`SUB-${subscription.id.slice(0, 8).toUpperCase()}`);
      setReceiptLoading(false);
    };
    fetchReceiptNumber();
  }, [subscription.id]);

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
  const razorpayRef = subscription.razorpay_payment_id || null;

  const getPeriodText = () => {
    if (subscription.subscription_type === "yearly") {
      return `ஆண்டு ${subscription.subscription_year}`;
    }
    if (subscription.from_month && subscription.from_year && subscription.to_month && subscription.to_year) {
      const fromMonth = MONTHS_TAMIL[subscription.from_month - 1];
      const toMonth = MONTHS_TAMIL[subscription.to_month - 1];
      if (subscription.from_month === subscription.to_month && subscription.from_year === subscription.to_year) {
        return `${fromMonth} ${subscription.from_year}`;
      }
      return `${fromMonth} ${subscription.from_year} - ${toMonth} ${subscription.to_year}`;
    }
    return "N/A";
  };

  const getSubscriptionTypeTamil = () => {
    return subscription.subscription_type === 'monthly' ? 'மாதாந்திர' : 'வருடாந்திர';
  };

  const handlePrint = () => {
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
        .transaction-id { font-family: monospace; background: #f5f5f5; padding: 10px; text-align: center; margin-top: 15px; border-radius: 5px; }
        @media print { body { padding: 0; } .receipt { border: none; } }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>சந்தா ரசீது - ${formattedReceiptNumber}</title>
          ${styles}
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="mosque-name-tamil">${headerSettings.organizationNameTa}</div>
              <div class="receipt-title">சந்தா ரசீது</div>
              <div class="success-badge">✓ பணம் செலுத்தப்பட்டது</div>
            </div>

            <div class="section">
              <div class="section-title">உறுப்பினர் விவரங்கள்</div>
              <div class="info-row">
                <span class="info-label">உறுப்பினர் எண்</span>
                <span class="info-value">${subscription.member_id}</span>
              </div>
              <div class="info-row">
                <span class="info-label">உறுப்பினர் பெயர்</span>
                <span class="info-value">${subscription.member_name}</span>
              </div>
              <div class="info-row">
                <span class="info-label">தொலைபேசி</span>
                <span class="info-value">${subscription.member_phone}</span>
              </div>
              ${subscription.member_address ? `
              <div class="info-row">
                <span class="info-label">முகவரி</span>
                <span class="info-value">${subscription.member_address}</span>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">சந்தா விவரங்கள்</div>
              <div class="info-row">
                <span class="info-label">சந்தா வகை</span>
                <span class="info-value">${getSubscriptionTypeTamil()}</span>
              </div>
              <div class="info-row">
                <span class="info-label">சந்தா காலம்</span>
                <span class="info-value">${getPeriodText()}</span>
              </div>
              ${subscription.number_of_months ? `
              <div class="info-row">
                <span class="info-label">கால அளவு</span>
                <span class="info-value">${subscription.number_of_months} மாதம்(கள்)</span>
              </div>
              ` : ''}
              <div class="info-row">
                <span class="info-label">பணம் செலுத்திய தேதி</span>
                <span class="info-value">${format(new Date(subscription.created_at), "dd/MM/yyyy")}</span>
              </div>
              <div class="info-row">
                <span class="info-label">செலுத்தும் முறை / Payment Method</span>
                <span class="info-value">${getPaymentMethodTamil(subscription.payment_method)} (${getPaymentMethodEnglish(subscription.payment_method)})</span>
              </div>
            </div>

            <div class="amount-box">
              <div class="amount-label">மொத்த தொகை</div>
              <div class="amount-value">₹${subscription.total_amount.toLocaleString()}</div>
            </div>

            <div class="transaction-id">
              <div style="font-size: 10px; color: #666; margin-bottom: 5px;">ரசீது எண் / Receipt No.</div>
              <div style="font-weight: bold;">${formattedReceiptNumber}</div>
              ${razorpayRef ? `<div style="font-size: 10px; color: #666; margin-top: 5px;">Razorpay Ref: ${razorpayRef}</div>` : ''}
            </div>

            <div class="footer">
              <p>உங்கள் சந்தாவுக்கு நன்றி!</p>
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
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>சந்தா ரசீது - ${formattedReceiptNumber}</title>
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
            .transaction-id { font-family: monospace; background: #f5f5f5; padding: 10px; text-align: center; margin-top: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="mosque-name-tamil">${headerSettings.organizationNameTa}</div>
              <div class="receipt-title">சந்தா ரசீது</div>
              <div class="success-badge">✓ பணம் செலுத்தப்பட்டது</div>
            </div>

            <div class="section">
              <div class="section-title">உறுப்பினர் விவரங்கள்</div>
              <div class="info-row"><span class="info-label">உறுப்பினர் எண்</span><span class="info-value">${subscription.member_id}</span></div>
              <div class="info-row"><span class="info-label">உறுப்பினர் பெயர்</span><span class="info-value">${subscription.member_name}</span></div>
              <div class="info-row"><span class="info-label">தொலைபேசி</span><span class="info-value">${subscription.member_phone}</span></div>
              ${subscription.member_address ? `<div class="info-row"><span class="info-label">முகவரி</span><span class="info-value">${subscription.member_address}</span></div>` : ''}
            </div>

            <div class="section">
              <div class="section-title">சந்தா விவரங்கள்</div>
              <div class="info-row"><span class="info-label">சந்தா வகை</span><span class="info-value">${getSubscriptionTypeTamil()}</span></div>
              <div class="info-row"><span class="info-label">சந்தா காலம்</span><span class="info-value">${getPeriodText()}</span></div>
              ${subscription.number_of_months ? `<div class="info-row"><span class="info-label">கால அளவு</span><span class="info-value">${subscription.number_of_months} மாதம்(கள்)</span></div>` : ''}
              <div class="info-row"><span class="info-label">பணம் செலுத்திய தேதி</span><span class="info-value">${format(new Date(subscription.created_at), "dd/MM/yyyy")}</span></div>
              <div class="info-row"><span class="info-label">செலுத்தும் முறை</span><span class="info-value">${getPaymentMethodTamil(subscription.payment_method)} (${getPaymentMethodEnglish(subscription.payment_method)})</span></div>
            </div>

            <div class="amount-box">
              <div class="amount-label">மொத்த தொகை</div>
              <div class="amount-value">₹${subscription.total_amount.toLocaleString()}</div>
            </div>

            <div class="transaction-id">
              <div style="font-size: 10px; color: #666; margin-bottom: 5px;">ரசீது எண் / Receipt No.</div>
              <div style="font-weight: bold;">${formattedReceiptNumber}</div>
              ${razorpayRef ? `<div style="font-size: 10px; color: #666; margin-top: 5px;">Razorpay Ref: ${razorpayRef}</div>` : ''}
            </div>

            <div class="footer">
              <p>உங்கள் சந்தாவுக்கு நன்றி!</p>
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
    a.download = `subscription-receipt-${formattedReceiptNumber}.html`;
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
              <h2 className="font-semibold font-tamil">சந்தா ரசீது</h2>
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
              <h3 className="text-lg text-primary leading-relaxed">{headerSettings.organizationNameTa}</h3>
              <p className="text-sm text-muted-foreground uppercase tracking-widest mt-2">சந்தா ரசீது</p>
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

            {/* Member Details */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground border-b pb-2">உறுப்பினர் விவரங்கள்</h4>
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> உறுப்பினர் எண்
                  </span>
                  <span className="font-medium font-mono">{subscription.member_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" /> உறுப்பினர் பெயர்
                  </span>
                  <span className="font-medium">{subscription.member_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" /> தொலைபேசி
                  </span>
                  <span className="font-medium">{subscription.member_phone}</span>
                </div>
                {subscription.member_address && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> முகவரி
                    </span>
                    <span className="font-medium text-right max-w-[200px]">{subscription.member_address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Details */}
            <div className="space-y-4 mb-6">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground border-b pb-2">சந்தா விவரங்கள்</h4>
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> சந்தா வகை
                  </span>
                  <span className="font-medium">{getSubscriptionTypeTamil()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> சந்தா காலம்
                  </span>
                  <span className="font-medium">{getPeriodText()}</span>
                </div>
                {subscription.number_of_months && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">கால அளவு</span>
                    <span className="font-medium">{subscription.number_of_months} மாதம்(கள்)</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> பணம் செலுத்திய தேதி
                  </span>
                  <span className="font-medium">{format(new Date(subscription.created_at), "dd/MM/yyyy")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2">
                    செலுத்தும் முறை
                  </span>
                  <span className="font-medium">{getPaymentMethodTamil(subscription.payment_method)} ({getPaymentMethodEnglish(subscription.payment_method)})</span>
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
              <p className="text-sm opacity-90">மொத்த தொகை</p>
              <p className="text-3xl font-bold flex items-center justify-center gap-1">
                <IndianRupee className="h-6 w-6" />
                {subscription.total_amount.toLocaleString()}
              </p>
            </motion.div>

            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">ரசீது எண் / Receipt No.</p>
              <p className="font-mono font-bold">{formattedReceiptNumber}</p>
              {razorpayRef && (
                <p className="text-xs text-muted-foreground mt-2">Razorpay Ref: {razorpayRef}</p>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pt-6 border-t-2 border-dashed border-primary/30">
              <p className="text-sm text-muted-foreground">உங்கள் சந்தாவுக்கு நன்றி!</p>
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

export default SubscriptionReceipt;
