
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Printer } from "lucide-react";
import RentalReceipt from "@/components/admin/RentalReceipt";

const TAMIL_MONTHS = [
  "", "ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்",
  "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"
];

interface RentalAgreement {
  id: string;
  tenant_name: string;
  father_name: string;
  shop_premises: string | null;
  shop_number: string | null;
  shop_address: string | null;
}

interface RentalPayment {
  id: string;
  receipt_number: string | null;
  payment_month: number;
  payment_year: number;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  remarks: string | null;
  created_by: string | null;
}

interface Props {
  agreement: RentalAgreement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RentalPaymentHistoryDialog = ({ agreement, open, onOpenChange }: Props) => {
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    if (open && agreement) {
      fetchPayments();
      setReceiptData(null);
    }
  }, [open, agreement]);

  const fetchPayments = async () => {
    if (!agreement) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("rental_payments")
      .select("*")
      .eq("agreement_id", agreement.id)
      .order("payment_year", { ascending: false })
      .order("payment_month", { ascending: false }) as any;

    if (error) {
      console.error(error);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  const handleReprint = (receiptNumber: string) => {
    if (!agreement) return;

    // Group payments by receipt number
    const grouped = payments.filter(p => p.receipt_number === receiptNumber);
    if (grouped.length === 0) return;

    const totalAmount = grouped.reduce((sum, p) => sum + p.amount, 0);
    const months = grouped.map(p => `${TAMIL_MONTHS[p.payment_month]} ${p.payment_year}`);
    const first = grouped[0];

    setReceiptData({
      tenant_name: agreement.tenant_name,
      father_name: agreement.father_name,
      shop_premises: agreement.shop_premises,
      shop_number: agreement.shop_number,
      shop_address: agreement.shop_address,
      months,
      totalAmount,
      receiptNumber: receiptNumber,
      date: new Date(first.payment_date).toLocaleDateString("ta-IN"),
      agreementId: agreement.id,
      createdBy: first.created_by,
      paymentMethod: first.payment_method || "Cash",
      remarks: first.remarks || "",
    });
  };

  if (receiptData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <RentalReceipt
            data={receiptData}
            onClose={() => setReceiptData(null)}
            isReprint
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Group by receipt number for display
  const receiptGroups = new Map<string, RentalPayment[]>();
  payments.forEach(p => {
    const key = p.receipt_number || p.id;
    if (!receiptGroups.has(key)) receiptGroups.set(key, []);
    receiptGroups.get(key)!.push(p);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>செலுத்திய வாடகை வரலாறு - {agreement?.tenant_name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : receiptGroups.size === 0 ? (
          <p className="text-center py-8 text-muted-foreground">இதுவரை செலுத்தப்படவில்லை</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>இரசீது எண்</TableHead>
                  <TableHead>மாதங்கள்</TableHead>
                  <TableHead>தொகை</TableHead>
                  <TableHead>தேதி</TableHead>
                  <TableHead>முறை</TableHead>
                  <TableHead>அச்சிடு</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(receiptGroups.entries()).map(([receiptNum, group]) => {
                  const totalAmount = group.reduce((s, p) => s + p.amount, 0);
                  const monthLabels = group.map(p => `${TAMIL_MONTHS[p.payment_month]} ${p.payment_year}`).join(", ");
                  const first = group[0];
                  return (
                    <TableRow key={receiptNum}>
                      <TableCell className="font-mono text-xs">{first.receipt_number || "-"}</TableCell>
                      <TableCell className="text-xs">{monthLabels}</TableCell>
                      <TableCell>₹{totalAmount.toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{first.payment_date}</TableCell>
                      <TableCell className="text-xs">{first.payment_method || "-"}</TableCell>
                      <TableCell>
                        {first.receipt_number && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReprint(first.receipt_number!)}
                            title="மறு அச்சிடு"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RentalPaymentHistoryDialog;
