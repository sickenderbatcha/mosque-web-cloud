import { useRef } from "react";
import { motion } from "framer-motion";
import { Download, Printer, X, Building2, Phone, Mail, Calendar, Clock, Users, IndianRupee, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    transactionId: string;
    services: { name: string; rate: number }[];
  };
  onClose: () => void;
}

const BookingReceipt = ({ booking, onClose }: BookingReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings: headerSettings } = useReceiptHeaderSettings();
  const { getReceiptNumber } = useReceiptNumberSettings();

  const formattedReceiptNumber = getReceiptNumber("booking", booking.transactionId);

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>மஹால் முன்பதிவு ரசீது - ${formattedReceiptNumber}</title>
          ${styles}
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="mosque-name-tamil">${headerSettings.organizationNameTa}</div>
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
            </div>

            <div class="footer">
              <p>உங்கள் முன்பதிவுக்கு நன்றி!</p>
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
    const printContent = receiptRef.current;
    if (!printContent) return;

    // Create a blob with HTML content for download with embedded Tamil font support
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>மஹால் முன்பதிவு ரசீது - ${formattedReceiptNumber}</title>
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
            .services-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .services-table th, .services-table td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
            .services-table th { background: #f5f5f5; color: #666; font-weight: 600; }
            .total-row { background: #1a5f4a; color: white; }
            .total-row td { font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px dashed #1a5f4a; color: #666; font-size: 12px; }
            .transaction-id { font-family: monospace; background: #f5f5f5; padding: 10px; text-align: center; margin-top: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="mosque-name-tamil">${headerSettings.organizationNameTa}</div>
              <div class="receipt-title">மஹால் முன்பதிவு ரசீது</div>
              <div class="success-badge">✓ பணம் செலுத்தப்பட்டது</div>
            </div>

            <div class="section">
              <div class="section-title">முன்பதிவு விவரங்கள்</div>
              <div class="info-row"><span class="info-label">விண்ணப்பதாரர் பெயர்</span><span class="info-value">${booking.applicantName}</span></div>
              <div class="info-row"><span class="info-label">தொலைபேசி</span><span class="info-value">${booking.applicantPhone}</span></div>
              ${booking.applicantEmail ? `<div class="info-row"><span class="info-label">மின்னஞ்சல்</span><span class="info-value">${booking.applicantEmail}</span></div>` : ''}
              <div class="info-row"><span class="info-label">நிகழ்வு வகை</span><span class="info-value">${getEventTypeTamil(booking.eventType)}</span></div>
              <div class="info-row"><span class="info-label">நிகழ்வு தேதி</span><span class="info-value">${format(new Date(booking.eventDate), "dd/MM/yyyy")}</span></div>
              <div class="info-row"><span class="info-label">நேர இடைவெளி</span><span class="info-value">${booking.startTime} - ${booking.endTime}</span></div>
              ${booking.expectedGuests ? `<div class="info-row"><span class="info-label">எதிர்பார்க்கப்படும் விருந்தினர்கள்</span><span class="info-value">${booking.expectedGuests}</span></div>` : ''}
            </div>

            <div class="section">
              <div class="section-title">சேவைகள்</div>
              <table class="services-table">
                <thead><tr><th>சேவை</th><th style="text-align: right;">தொகை</th></tr></thead>
                <tbody>
                  ${booking.services.map(s => `<tr><td>${getServiceNameTamil(s.name)}</td><td style="text-align: right;">₹${s.rate.toLocaleString()}</td></tr>`).join('')}
                  <tr class="total-row"><td>மொத்த தொகை</td><td style="text-align: right;">₹${booking.amount.toLocaleString()}</td></tr>
                </tbody>
              </table>
            </div>

            <div class="transaction-id">
              <div style="font-size: 10px; color: #666; margin-bottom: 5px;">ரசீது எண் / Receipt No.</div>
              <div style="font-weight: bold;">${formattedReceiptNumber}</div>
            </div>

            <div class="footer">
              <p>உங்கள் முன்பதிவுக்கு நன்றி!</p>
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
    a.download = `booking-receipt-${formattedReceiptNumber}.html`;
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
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                பின்செல்
              </Button>
              <h2 className="font-semibold font-tamil text-sm">மஹால் முன்பதிவு ரசீது</h2>
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
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pt-6 border-t-2 border-dashed border-primary/30">
              <p className="text-sm text-muted-foreground">உங்கள் முன்பதிவுக்கு நன்றி!</p>
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
