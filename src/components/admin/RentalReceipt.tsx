
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, Download, X } from "lucide-react";
import { useReceiptHeaderSettings } from "@/hooks/useReceiptHeaderSettings";
import { toast } from "sonner";

interface RentalReceiptData {
  tenant_name: string;
  father_name: string;
  shop_premises: string | null;
  shop_number: string | null;
  shop_address: string | null;
  months: string[];
  totalAmount: number;
  receiptNumber: string;
  date: string;
  agreementId: string;
  createdBy: string | null;
  paymentMethod: string;
  remarks: string;
}

interface RentalReceiptProps {
  data: RentalReceiptData;
  onClose: () => void;
}

const RentalReceipt = ({ data, onClose }: RentalReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings } = useReceiptHeaderSettings();
  const [incomeCreated, setIncomeCreated] = useState(false);

  const createIncomeEntry = async () => {
    if (incomeCreated) return;

    const monthsDesc = data.months.join(", ");
    const descParts = [`கடை எண்: ${data.shop_number || "-"}`, `வளாகம்: ${data.shop_premises || "-"}`, `மாதங்கள்: ${monthsDesc}`];
    if (data.remarks) descParts.push(`குறிப்பு: ${data.remarks}`);
    
    const { error } = await supabase.from("income").insert({
      amount: data.totalAmount,
      category: "வாடகை வருமானம் (Rental Income)",
      source: data.tenant_name,
      description: descParts.join(" | "),
      income_date: new Date().toISOString().split("T")[0],
      payment_method: data.paymentMethod,
      receipt_number: data.receiptNumber,
      reference_type: "rental",
      created_by: data.createdBy,
    }) as any;

    if (error) {
      console.error("Failed to create income entry:", error);
      toast.error("வருமான பதிவு உருவாக்க முடியவில்லை");
    } else {
      setIncomeCreated(true);
    }
  };

  const handlePrint = async () => {
    await createIncomeEntry();

    const printContent = receiptRef.current;
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>வாடகை இரசீது - ${data.receiptNumber}</title>
          <style>
            body { font-family: 'Noto Sans Tamil', Arial, sans-serif; margin: 20px; color: #000; }
            .receipt { max-width: 400px; margin: 0 auto; border: 2px solid #000; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .header h2 { margin: 0; font-size: 16px; }
            .header p { margin: 2px 0; font-size: 11px; }
            .title { text-align: center; font-weight: bold; font-size: 16px; margin: 10px 0; text-decoration: underline; }
            .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
            .row .label { font-weight: bold; }
            .months { margin: 8px 0; padding: 8px; border: 1px solid #ccc; }
            .months-title { font-weight: bold; font-size: 13px; margin-bottom: 4px; }
            .month-item { font-size: 12px; padding: 2px 0; }
            .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 8px; font-size: 16px; font-weight: bold; text-align: right; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px solid #ccc; padding-top: 8px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = async () => {
    await createIncomeEntry();

    const printContent = receiptRef.current;
    if (!printContent) return;

    const blob = new Blob([`
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .receipt { max-width: 400px; margin: 0 auto; border: 2px solid #000; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .header h2 { margin: 0; font-size: 16px; }
            .header p { margin: 2px 0; font-size: 11px; }
            .title { text-align: center; font-weight: bold; font-size: 16px; margin: 10px 0; text-decoration: underline; }
            .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
            .row .label { font-weight: bold; }
            .months { margin: 8px 0; padding: 8px; border: 1px solid #ccc; }
            .months-title { font-weight: bold; font-size: 13px; margin-bottom: 4px; }
            .month-item { font-size: 12px; padding: 2px 0; }
            .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 8px; font-size: 16px; font-weight: bold; text-align: right; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px solid #ccc; padding-top: 8px; }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `], { type: "text/html" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rent-receipt-${data.receiptNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end flex-wrap">
        <Button size="sm" variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> அச்சிடு
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" /> பதிவிறக்கு
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-1" /> மூடு
        </Button>
      </div>

      <div ref={receiptRef}>
        <div className="receipt" style={{ maxWidth: 400, margin: "0 auto", border: "2px solid", padding: 20 }}>
          <div className="header" style={{ textAlign: "center", borderBottom: "2px solid", paddingBottom: 10, marginBottom: 15 }}>
            <h2 style={{ margin: 0, fontSize: 16 }}>{settings.organizationNameTa}</h2>
            <p style={{ margin: "2px 0", fontSize: 11 }}>{settings.organizationNameEn}</p>
            <p style={{ margin: "2px 0", fontSize: 11 }}>{settings.addressLine1}</p>
            <p style={{ margin: "2px 0", fontSize: 11 }}>{settings.addressLine2}</p>
            <p style={{ margin: "2px 0", fontSize: 11 }}>தொலைபேசி: {settings.phone}</p>
          </div>

          <div className="title" style={{ textAlign: "center", fontWeight: "bold", fontSize: 16, margin: "10px 0", textDecoration: "underline" }}>
            வாடகை இரசீது
          </div>

          <div style={{ fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontWeight: "bold" }}>இரசீது எண்:</span>
              <span>{data.receiptNumber}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontWeight: "bold" }}>தேதி:</span>
              <span>{data.date}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontWeight: "bold" }}>வாடகைதாரர்:</span>
              <span>{data.tenant_name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontWeight: "bold" }}>தந்தை:</span>
              <span>{data.father_name}</span>
            </div>
            {data.shop_premises && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ fontWeight: "bold" }}>வளாகம்:</span>
                <span>{data.shop_premises}</span>
              </div>
            )}
            {data.shop_number && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ fontWeight: "bold" }}>கடை எண்:</span>
                <span>{data.shop_number}</span>
              </div>
            )}
            {data.shop_address && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ fontWeight: "bold" }}>கடை முகவரி:</span>
                <span>{data.shop_address}</span>
              </div>
            )}
          </div>

          <div style={{ margin: "8px 0", padding: 8, border: "1px solid #ccc" }}>
            <div style={{ fontWeight: "bold", fontSize: 13, marginBottom: 4 }}>
              செலுத்திய மாதங்கள்:
            </div>
            {data.months.map((m: string, i: number) => (
              <div key={i} style={{ fontSize: 12, padding: "2px 0" }}>• {m}</div>
            ))}
          </div>

          <div style={{ borderTop: "2px solid", marginTop: 10, paddingTop: 8, fontSize: 16, fontWeight: "bold", textAlign: "right" }}>
            மொத்தம்: ₹{data.totalAmount.toLocaleString()}
          </div>

          <div style={{ fontSize: 13, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontWeight: "bold" }}>செலுத்தும் முறை:</span>
              <span>{data.paymentMethod === "Cash" ? "ரொக்கம் (Cash)" : data.paymentMethod === "Cheque" ? "காசோலை (Cheque)" : data.paymentMethod === "UPI" ? "UPI" : "வங்கி பரிமாற்றம் (Bank Transfer)"}</span>
            </div>
            {data.remarks && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ fontWeight: "bold" }}>குறிப்பு:</span>
                <span>{data.remarks}</span>
              </div>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: 15, fontSize: 10, borderTop: "1px solid #ccc", paddingTop: 8 }}>
            <p>{settings.footerMessage}</p>
            <p>{settings.footerMessageEn}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalReceipt;
