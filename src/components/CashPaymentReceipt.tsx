import { useRef, useState, useEffect } from "react";
 import { motion } from "framer-motion";
 import { Download, Printer, ArrowLeft, Building2, CheckCircle2, Banknote, Calendar, User, Phone, Mail } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Card } from "@/components/ui/card";
 import { format } from "date-fns";
 import { useReceiptHeaderSettings } from "@/hooks/useReceiptHeaderSettings";
 import { getLatestSequentialReceiptNumber, isSequentialReceiptNumber } from "@/lib/certificatePayments";
 import { CERTIFICATE_SERVICE_TYPES, ensureCompletedCashCertificatePayment } from "@/lib/cashPaymentReceipts";
 import { supabase } from "@/integrations/supabase/client";
 
 const SERVICE_TYPE_LABELS_TAMIL: Record<string, string> = {
   booking: "மஹால் முன்பதிவு",
   donation: "நன்கொடை",
   certificate: "சான்றிதழ்",
   subscription: "சந்தா",
   noc: "ஆட்சேபனையின்மை சான்றிதழ்",
   heir: "வாரிசு சான்றிதழ்",
   outside_marriage_certificate: "வெளியூர் திருமணச் சான்றிதழ்",
 };
 
 const SERVICE_TYPE_LABELS_EN: Record<string, string> = {
   booking: "Mahal Booking",
   donation: "Donation",
   certificate: "Certificate",
   subscription: "Subscription",
   noc: "NOC Certificate",
   heir: "Heir Certificate",
   outside_marriage_certificate: "Outside Marriage Certificate",
 };

 // Map service_type to the reference_type used in the income table
 const SERVICE_TO_INCOME_REF_TYPE: Record<string, string[]> = {
   booking: ["booking"],
   donation: ["donation"],
   subscription: ["subscription"],
   certificate: ["certificate_payment"],
   noc: ["noc_certificate", "certificate_payment"],
   heir: ["heir_certificate", "certificate_payment"],
   outside_marriage_certificate: ["certificate_payment"],
 };
 
 interface CashPaymentReceiptProps {
   request: {
     id: string;
     service_type: string;
     reference_id: string | null;
     amount: number;
     applicant_name: string;
     applicant_phone: string;
     applicant_email: string | null;
     service_details: Record<string, any> | null;
     created_at: string;
     processed_at: string | null;
     admin_notes: string | null;
     status?: string;
   };
   onClose: () => void;
   onPrinted?: (requestId: string) => void;
 }
 
 const CashPaymentReceipt = ({ request, onClose, onPrinted }: CashPaymentReceiptProps) => {
   const receiptRef = useRef<HTMLDivElement>(null);
   const { settings: headerSettings } = useReceiptHeaderSettings();
  const [hasTriggeredCallback, setHasTriggeredCallback] = useState(false);
  const [sequentialReceiptNumber, setSequentialReceiptNumber] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(true);

  // Try to fetch the actual sequential receipt number from the income table
    // Uses retries to handle the case where DB trigger hasn't fired yet
   useEffect(() => {
      const fetchSequentialReceipt = async () => {
        let refId = request.reference_id;
        if (!refId) {
          const { data: freshReq } = await supabase
            .from("cash_payment_requests")
            .select("reference_id")
            .eq("id", request.id)
            .maybeSingle();
          if (freshReq?.reference_id) {
            refId = freshReq.reference_id;
          }
        }

        if (!refId) return;

        // Bookings: resolve the running number issued into the income ledger
        if (request.service_type === "booking") {
          for (let attempt = 0; attempt < 12; attempt++) {
            const { data } = await supabase.rpc("get_booking_receipt_number", {
              _booking_id: refId,
            });
            if (isSequentialReceiptNumber(data as string | null)) {
              setSequentialReceiptNumber(data as string);
              return;
            }
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
          return;
        }

        // Certificate-style services: income is keyed by certificate_payments.id
        let lookupId = refId;
        let refTypes = SERVICE_TO_INCOME_REF_TYPE[request.service_type] || [];

        if (CERTIFICATE_SERVICE_TYPES.includes(request.service_type)) {
          const paymentId = await ensureCompletedCashCertificatePayment({
            id: request.id,
            service_type: request.service_type,
            reference_id: refId,
            amount: request.amount,
            applicant_name: request.applicant_name,
            applicant_phone: request.applicant_phone,
            applicant_email: request.applicant_email,
            service_details: request.service_details,
          });
          if (paymentId) {
            lookupId = paymentId;
            refTypes = ["certificate_payment"];
          }
        }

        if (refTypes.length === 0) return;

        // Retry (income record is created by DB trigger with slight delay)
        const resolvedReceiptNumber = await getLatestSequentialReceiptNumber({
          referenceId: lookupId,
          referenceTypes: refTypes,
          retries: 12,
          retryDelayMs: 800,
        });

        setSequentialReceiptNumber(resolvedReceiptNumber);
       };
       fetchSequentialReceipt()
         .catch((error) => {
           console.error("Failed to resolve cash receipt number", error);
           setSequentialReceiptNumber(null);
         })
         .finally(() => setReceiptLoading(false));
     }, [request.id, request.reference_id, request.service_type]);


   const receiptNumber = sequentialReceiptNumber;
   const serviceTypeTamil = SERVICE_TYPE_LABELS_TAMIL[request.service_type] || request.service_type;
   const serviceTypeEn = SERVICE_TYPE_LABELS_EN[request.service_type] || request.service_type;
 
   const handlePrint = () => {
      if (!receiptNumber) return;
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
         .mosque-name-tamil { font-size: 20px; color: #1a5f4a; margin-bottom: 5px; font-weight: bold; }
         .mosque-name-en { font-size: 14px; color: #1a5f4a; margin-bottom: 10px; }
         .receipt-title { font-size: 16px; color: #333; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; }
         .success-badge { background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; }
         .section { margin-bottom: 20px; }
         .section-title { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
         .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ddd; }
         .info-label { color: #666; }
         .info-value { font-weight: 600; color: #333; }
         .amount-box { background: #1a5f4a; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
         .amount-label { font-size: 12px; opacity: 0.9; }
         .amount-value { font-size: 28px; font-weight: bold; margin-top: 5px; }
         .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px dashed #1a5f4a; color: #666; font-size: 12px; }
         .receipt-number { font-family: monospace; background: #f5f5f5; padding: 10px; text-align: center; margin-top: 15px; border-radius: 5px; }
         @media print { body { padding: 0; } .receipt { border: none; } }
       </style>
     `;
 
     printWindow.document.write(`
       <!DOCTYPE html>
       <html>
         <head>
           <title>ரொக்க செலுத்துதல் ரசீது - ${receiptNumber}</title>
           ${styles}
         </head>
         <body>
           <div class="receipt">
             <div class="header">
               <div class="mosque-name-tamil">${headerSettings.organizationNameTa}</div>
               <div class="mosque-name-en">${headerSettings.organizationNameEn}</div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">${headerSettings.addressLine1}</div>
              <div style="font-size: 12px; color: #666;">${headerSettings.addressLine2}</div>
               <div style="font-size: 12px; color: #666;">📞 ${headerSettings.phone}</div>
               <div class="receipt-title">ரொக்க செலுத்துதல் ரசீது</div>
               <div style="font-size: 12px; color: #666;">Cash Payment Receipt</div>
               <div class="success-badge">✓ பணம் பெறப்பட்டது / Payment Received</div>
             </div>
 
             <div class="section">
               <div class="section-title">விண்ணப்பதாரர் விவரங்கள் / Applicant Details</div>
               <div class="info-row">
                 <span class="info-label">பெயர் / Name</span>
                 <span class="info-value">${request.applicant_name}</span>
               </div>
               <div class="info-row">
                 <span class="info-label">தொலைபேசி / Phone</span>
                 <span class="info-value">${request.applicant_phone}</span>
               </div>
               ${request.applicant_email ? `
               <div class="info-row">
                 <span class="info-label">மின்னஞ்சல் / Email</span>
                 <span class="info-value">${request.applicant_email}</span>
               </div>
               ` : ''}
             </div>
 
             <div class="section">
               <div class="section-title">சேவை விவரங்கள் / Service Details</div>
               <div class="info-row">
                 <span class="info-label">சேவை வகை / Service Type</span>
                 <span class="info-value">${serviceTypeTamil} (${serviceTypeEn})</span>
               </div>
               <div class="info-row">
                 <span class="info-label">கோரிக்கை தேதி / Request Date</span>
                 <span class="info-value">${format(new Date(request.created_at), "dd/MM/yyyy")}</span>
               </div>
               <div class="info-row">
                 <span class="info-label">செலுத்திய தேதி / Payment Date</span>
                 <span class="info-value">${request.processed_at ? format(new Date(request.processed_at), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}</span>
               </div>
               <div class="info-row">
                 <span class="info-label">செலுத்தும் முறை / Payment Method</span>
                 <span class="info-value">ரொக்கம் (Cash)</span>
               </div>
             </div>
 
             <div class="amount-box">
               <div class="amount-label">செலுத்திய தொகை / Amount Paid</div>
               <div class="amount-value">₹${request.amount.toLocaleString()}</div>
             </div>
 
             <div class="receipt-number">
               <div style="font-size: 10px; color: #666; margin-bottom: 5px;">ரசீது எண் / Receipt Number</div>
               <div style="font-weight: bold;">${receiptNumber}</div>
             </div>
 
             <div class="footer">
               <p>உங்கள் செலுத்துதலுக்கு நன்றி!</p>
               <p>Thank you for your payment!</p>
               <p style="margin-top: 10px;">${headerSettings.footerMessage}</p>
               <p style="margin-top: 10px; font-size: 10px;">உருவாக்கப்பட்ட தேதி / Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
             </div>
           </div>
         </body>
       </html>
     `);
 
     printWindow.document.close();
     printWindow.focus();
     setTimeout(() => {
       printWindow.print();
      // Mark as paid after printing (only if status is approved and not already triggered)
      if (request.status === "approved" && onPrinted && !hasTriggeredCallback) {
        setHasTriggeredCallback(true);
         onPrinted(request.id);
       }
     }, 250);
   };
 
   const handleDownload = () => {
      if (!receiptNumber) return;
     const htmlContent = `
       <!DOCTYPE html>
       <html>
         <head>
           <meta charset="UTF-8">
           <title>ரொக்க செலுத்துதல் ரசீது - ${receiptNumber}</title>
           <style>
             @font-face {
               font-family: 'Tamil';
               src: local('Noto Sans Tamil'), local('Latha'), local('Vijaya'), local('Arial Unicode MS');
               unicode-range: U+0B80-0BFF;
             }
             * { margin: 0; padding: 0; box-sizing: border-box; }
             body { font-family: 'Tamil', 'Noto Sans Tamil', 'Segoe UI', sans-serif; padding: 40px; background: #fff; }
             .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #1a5f4a; padding: 30px; border-radius: 10px; }
             .header { text-align: center; border-bottom: 2px dashed #1a5f4a; padding-bottom: 20px; margin-bottom: 20px; }
             .mosque-name-tamil { font-size: 20px; color: #1a5f4a; font-weight: bold; }
             .mosque-name-en { font-size: 14px; color: #1a5f4a; margin-bottom: 10px; }
             .receipt-title { font-size: 16px; color: #333; text-transform: uppercase; letter-spacing: 2px; margin-top: 10px; }
             .success-badge { background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; }
             .section { margin-bottom: 20px; }
             .section-title { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
             .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ddd; }
             .info-label { color: #666; }
             .info-value { font-weight: 600; color: #333; }
             .amount-box { background: #1a5f4a; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
             .amount-label { font-size: 12px; opacity: 0.9; }
             .amount-value { font-size: 28px; font-weight: bold; margin-top: 5px; }
             .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px dashed #1a5f4a; color: #666; font-size: 12px; }
             .receipt-number { font-family: monospace; background: #f5f5f5; padding: 10px; text-align: center; margin-top: 15px; border-radius: 5px; }
           </style>
         </head>
         <body>
           <div class="receipt">
             <div class="header">
               <div class="mosque-name-tamil">${headerSettings.organizationNameTa}</div>
               <div class="mosque-name-en">${headerSettings.organizationNameEn}</div>
              <div style="font-size: 12px; color: #666; margin-top: 5px;">${headerSettings.addressLine1}</div>
              <div style="font-size: 12px; color: #666;">${headerSettings.addressLine2}</div>
               <div style="font-size: 12px; color: #666;">📞 ${headerSettings.phone}</div>
               <div class="receipt-title">ரொக்க செலுத்துதல் ரசீது</div>
               <div style="font-size: 12px; color: #666;">Cash Payment Receipt</div>
               <div class="success-badge">✓ பணம் பெறப்பட்டது / Payment Received</div>
             </div>
 
             <div class="section">
               <div class="section-title">விண்ணப்பதாரர் விவரங்கள் / Applicant Details</div>
               <div class="info-row"><span class="info-label">பெயர் / Name</span><span class="info-value">${request.applicant_name}</span></div>
               <div class="info-row"><span class="info-label">தொலைபேசி / Phone</span><span class="info-value">${request.applicant_phone}</span></div>
               ${request.applicant_email ? `<div class="info-row"><span class="info-label">மின்னஞ்சல் / Email</span><span class="info-value">${request.applicant_email}</span></div>` : ''}
             </div>
 
             <div class="section">
               <div class="section-title">சேவை விவரங்கள் / Service Details</div>
               <div class="info-row"><span class="info-label">சேவை வகை / Service Type</span><span class="info-value">${serviceTypeTamil} (${serviceTypeEn})</span></div>
               <div class="info-row"><span class="info-label">கோரிக்கை தேதி / Request Date</span><span class="info-value">${format(new Date(request.created_at), "dd/MM/yyyy")}</span></div>
               <div class="info-row"><span class="info-label">செலுத்திய தேதி / Payment Date</span><span class="info-value">${request.processed_at ? format(new Date(request.processed_at), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}</span></div>
               <div class="info-row"><span class="info-label">செலுத்தும் முறை / Payment Method</span><span class="info-value">ரொக்கம் (Cash)</span></div>
             </div>
 
             <div class="amount-box">
               <div class="amount-label">செலுத்திய தொகை / Amount Paid</div>
               <div class="amount-value">₹${request.amount.toLocaleString()}</div>
             </div>
 
             <div class="receipt-number">
               <div style="font-size: 10px; color: #666; margin-bottom: 5px;">ரசீது எண் / Receipt Number</div>
               <div style="font-weight: bold;">${receiptNumber}</div>
             </div>
 
             <div class="footer">
               <p>உங்கள் செலுத்துதலுக்கு நன்றி!</p>
               <p>Thank you for your payment!</p>
               <p style="margin-top: 10px;">${headerSettings.footerMessage}</p>
               <p style="margin-top: 10px; font-size: 10px;">உருவாக்கப்பட்ட தேதி / Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
             </div>
           </div>
         </body>
       </html>
     `;
 
     const blob = new Blob([htmlContent], { type: "text/html" });
     const url = URL.createObjectURL(blob);
     const a = document.createElement("a");
     a.href = url;
     a.download = `cash-receipt-${receiptNumber}.html`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
    // Mark as paid after download (only if status is approved and not already triggered)
    if (request.status === "approved" && onPrinted && !hasTriggeredCallback) {
      setHasTriggeredCallback(true);
       onPrinted(request.id);
     }
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
           {/* Actions Bar */}
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted/50 border-b">
             <div className="flex items-center gap-2">
               <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
                 <ArrowLeft className="h-4 w-4" />
                 பின்செல்
               </Button>
               <h2 className="font-semibold text-sm sm:text-base">ரசீது</h2>
             </div>
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                 <Button variant="outline" size="sm" onClick={handlePrint} disabled={receiptLoading || !receiptNumber}>
                   <Printer className="h-4 w-4 mr-2" />
                   அச்சிடு
                 </Button>
                 <Button variant="outline" size="sm" onClick={handleDownload} disabled={receiptLoading || !receiptNumber}>
                   <Download className="h-4 w-4 mr-2" />
                   பதிவிறக்கம்
                 </Button>
              </div>
           </div>
 
           {/* Receipt Content */}
           <div ref={receiptRef} className="p-6">
             {/* Header */}
             <div className="text-center border-b-2 border-dashed border-primary/30 pb-6 mb-6">
               <Building2 className="h-10 w-10 mx-auto mb-2 text-primary" />
               <h3 className="text-lg text-primary font-bold leading-relaxed">{headerSettings.organizationNameTa}</h3>
               <p className="text-sm text-primary">{headerSettings.organizationNameEn}</p>
              <p className="text-xs text-muted-foreground mt-1">{headerSettings.addressLine1}</p>
              <p className="text-xs text-muted-foreground">{headerSettings.addressLine2}</p>
               <p className="text-xs text-muted-foreground">📞 {headerSettings.phone}</p>
               <p className="text-sm text-muted-foreground uppercase tracking-widest mt-3">ரொக்க செலுத்துதல் ரசீது</p>
               <p className="text-xs text-muted-foreground">Cash Payment Receipt</p>
               <motion.div
                 initial={{ scale: 0 }}
                 animate={{ scale: 1 }}
                 transition={{ delay: 0.3, type: "spring" }}
                 className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full mt-4"
               >
                 <CheckCircle2 className="h-4 w-4" />
                 <span className="font-semibold text-sm">பணம் பெறப்பட்டது</span>
               </motion.div>
             </div>
 
             {/* Applicant Details */}
             <div className="space-y-4 mb-6">
               <h4 className="text-xs uppercase tracking-wider text-muted-foreground border-b pb-2">
                 விண்ணப்பதாரர் விவரங்கள் / Applicant Details
               </h4>
               <div className="grid gap-3">
                 <div className="flex justify-between items-center">
                   <span className="text-muted-foreground flex items-center gap-2">
                     <User className="h-4 w-4" />
                     பெயர் / Name
                   </span>
                   <span className="font-semibold">{request.applicant_name}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-muted-foreground flex items-center gap-2">
                     <Phone className="h-4 w-4" />
                     தொலைபேசி / Phone
                   </span>
                   <span className="font-semibold">{request.applicant_phone}</span>
                 </div>
                 {request.applicant_email && (
                   <div className="flex justify-between items-center">
                     <span className="text-muted-foreground flex items-center gap-2">
                       <Mail className="h-4 w-4" />
                       மின்னஞ்சல் / Email
                     </span>
                     <span className="font-semibold">{request.applicant_email}</span>
                   </div>
                 )}
               </div>
             </div>
 
             {/* Service Details */}
             <div className="space-y-4 mb-6">
               <h4 className="text-xs uppercase tracking-wider text-muted-foreground border-b pb-2">
                 சேவை விவரங்கள் / Service Details
               </h4>
               <div className="grid gap-3">
                 <div className="flex justify-between items-center">
                   <span className="text-muted-foreground flex items-center gap-2">
                     <Banknote className="h-4 w-4" />
                     சேவை வகை / Service
                   </span>
                   <span className="font-semibold">{serviceTypeTamil}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-muted-foreground flex items-center gap-2">
                     <Calendar className="h-4 w-4" />
                     கோரிக்கை தேதி / Request
                   </span>
                   <span className="font-semibold">{format(new Date(request.created_at), "dd/MM/yyyy")}</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-muted-foreground flex items-center gap-2">
                     <Calendar className="h-4 w-4" />
                     செலுத்திய தேதி / Paid
                   </span>
                   <span className="font-semibold">
                     {request.processed_at ? format(new Date(request.processed_at), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy")}
                   </span>
                 </div>
               </div>
             </div>
 
             {/* Amount Box */}
             <div className="bg-primary text-primary-foreground rounded-lg p-4 text-center mb-6">
               <p className="text-sm opacity-90">செலுத்திய தொகை / Amount Paid</p>
               <p className="text-3xl font-bold mt-1">₹{request.amount.toLocaleString()}</p>
             </div>
 
             {/* Receipt Number */}
             <div className="bg-muted rounded-lg p-3 text-center">
               <p className="text-xs text-muted-foreground">ரசீது எண் / Receipt Number</p>
                <p className="font-mono font-bold text-lg">{receiptLoading ? "Loading..." : receiptNumber || "Pending sync"}</p>
             </div>
 
             {/* Footer */}
             <div className="text-center mt-6 pt-4 border-t-2 border-dashed border-primary/30">
               <p className="text-sm">உங்கள் செலுத்துதலுக்கு நன்றி!</p>
               <p className="text-xs text-muted-foreground">Thank you for your payment!</p>
               <p className="text-xs text-muted-foreground mt-2">{headerSettings.footerMessage}</p>
               <p className="text-xs text-muted-foreground mt-2">
                 உருவாக்கப்பட்ட தேதி: {format(new Date(), "dd/MM/yyyy HH:mm")}
               </p>
             </div>
           </div>
         </Card>
       </motion.div>
     </motion.div>
   );
 };
 
 export default CashPaymentReceipt;