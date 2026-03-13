
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import RentalReceipt from "@/components/admin/RentalReceipt";

interface RentalAgreement {
  id: string;
  tenant_name: string;
  father_name: string;
  shop_premises: string | null;
  shop_number: string | null;
  shop_address: string | null;
  rent_amount: number;
  rent_calculate_from: string | null;
}

interface PendingMonth {
  month: number;
  year: number;
  label: string;
  selected: boolean;
}

interface RentCollectionDialogProps {
  agreement: RentalAgreement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TAMIL_MONTHS = [
  "", "ஜனவரி", "பிப்ரவரி", "மார்ச்", "ஏப்ரல்", "மே", "ஜூன்",
  "ஜூலை", "ஆகஸ்ட்", "செப்டம்பர்", "அக்டோபர்", "நவம்பர்", "டிசம்பர்"
];

const parseRentCalculateFrom = (val: string | null): { month: number; year: number } | null => {
  if (!val || val.length < 6) return null;
  const month = parseInt(val.substring(0, 2), 10);
  const year = parseInt(val.substring(2), 10);
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return null;
  return { month, year };
};

const RentCollectionDialog = ({ agreement, open, onOpenChange }: RentCollectionDialogProps) => {
  const { user } = useAuth();
  const [pendingMonths, setPendingMonths] = useState<PendingMonth[]>([]);
  const [editableAmount, setEditableAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const fetchPaidMonths = useCallback(async () => {
    if (!agreement) return;
    setLoading(true);
    
    const { data: paidData } = await supabase
      .from("rental_payments")
      .select("payment_month, payment_year")
      .eq("agreement_id", agreement.id) as any;

    const paidSet = new Set(
      (paidData || []).map((p: any) => `${p.payment_month}-${p.payment_year}`)
    );

    const start = parseRentCalculateFrom(agreement.rent_calculate_from);
    if (!start) {
      setPendingMonths([]);
      setLoading(false);
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const pending: PendingMonth[] = [];
    let m = start.month;
    let y = start.year;

    while (y < currentYear || (y === currentYear && m <= currentMonth)) {
      const key = `${m}-${y}`;
      if (!paidSet.has(key)) {
        pending.push({
          month: m,
          year: y,
          label: `${TAMIL_MONTHS[m]} ${y}`,
          selected: false,
        });
      }
      m++;
      if (m > 12) { m = 1; y++; }
    }

    setPendingMonths(pending);
    setEditableAmount(pending.length > 0 ? 0 : 0);
    setLoading(false);
  }, [agreement]);

  useEffect(() => {
    if (open && agreement) {
      fetchPaidMonths();
      setReceiptData(null);
    }
  }, [open, agreement, fetchPaidMonths]);

  const selectedCount = pendingMonths.filter(p => p.selected).length;

  useEffect(() => {
    if (agreement) {
      setEditableAmount(selectedCount * agreement.rent_amount);
    }
  }, [selectedCount, agreement]);

  const handleToggleMonth = (index: number) => {
    // Don't allow skipping - can only select contiguous from start
    setPendingMonths(prev => {
      const updated = [...prev];
      if (updated[index].selected) {
        // Deselecting - deselect this and all after it
        for (let i = index; i < updated.length; i++) {
          updated[i] = { ...updated[i], selected: false };
        }
      } else {
        // Selecting - must select all before it too
        for (let i = 0; i <= index; i++) {
          updated[i] = { ...updated[i], selected: true };
        }
      }
      return updated;
    });
  };

  const handleCollectRent = async () => {
    if (!agreement || selectedCount === 0) return;
    setSaving(true);

    const selectedMonths = pendingMonths.filter(p => p.selected);
    const receiptNum = `RENT-${Date.now()}`;

    const payments = selectedMonths.map(m => ({
      agreement_id: agreement.id,
      payment_month: m.month,
      payment_year: m.year,
      amount: editableAmount / selectedCount,
      receipt_number: receiptNum,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "Cash",
      created_by: user?.id || null,
    }));

    const { error } = await supabase.from("rental_payments").insert(payments) as any;

    if (error) {
      toast.error("வாடகை சேமிக்க முடியவில்லை");
      console.error(error);
    } else {
      toast.success("வாடகை வெற்றிகரமாக பெறப்பட்டது");
      setReceiptData({
        tenant_name: agreement.tenant_name,
        father_name: agreement.father_name,
        shop_premises: agreement.shop_premises,
        shop_number: agreement.shop_number,
        shop_address: agreement.shop_address,
        months: selectedMonths.map(m => m.label),
        totalAmount: editableAmount,
        receiptNumber: receiptNum,
        date: new Date().toLocaleDateString("ta-IN"),
        agreementId: agreement.id,
        createdBy: user?.id || null,
      });
    }
    setSaving(false);
  };

  if (receiptData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <RentalReceipt data={receiptData} onClose={() => onOpenChange(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>வாடகை பெறு (Collect Rent)</DialogTitle>
        </DialogHeader>

        {agreement && (
          <div className="space-y-4">
            {/* Tenant Info */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-md border bg-muted/30">
              <div>
                <Label className="text-xs text-muted-foreground">வாடகைதாரர்</Label>
                <p className="font-medium text-sm">{agreement.tenant_name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">வளாகம்</Label>
                <p className="text-sm">{agreement.shop_premises || "-"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">கடை எண்</Label>
                <p className="text-sm">{agreement.shop_number || "-"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">கடை முகவரி</Label>
                <p className="text-sm">{agreement.shop_address || "-"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">மாத வாடகை</Label>
                <p className="text-sm font-medium">₹{agreement.rent_amount.toLocaleString()}</p>
              </div>
            </div>

            {/* Pending Months */}
            {loading ? (
              <p className="text-center text-muted-foreground py-4">Loading...</p>
            ) : pendingMonths.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                {agreement.rent_calculate_from
                  ? "நிலுவை மாதங்கள் இல்லை (No pending months)"
                  : "வாடகை கணக்கிட தேதி அமைக்கவும்"}
              </p>
            ) : (
              <>
                <div>
                  <Label className="text-sm font-medium mb-2 block">நிலுவை மாதங்கள் (Pending Months)</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                    {pendingMonths.map((pm, idx) => (
                      <div key={`${pm.month}-${pm.year}`} className="flex items-center gap-2">
                        <Checkbox
                          checked={pm.selected}
                          onCheckedChange={() => handleToggleMonth(idx)}
                          id={`month-${idx}`}
                        />
                        <label htmlFor={`month-${idx}`} className="text-sm cursor-pointer flex-1">
                          {pm.label}
                        </label>
                        <span className="text-xs text-muted-foreground">
                          ₹{agreement.rent_amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>தேர்ந்தெடுத்த மாதங்கள்: {selectedCount}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="whitespace-nowrap">மொத்த தொகை:</Label>
                      <Input
                        type="number"
                        value={editableAmount}
                        onChange={(e) => setEditableAmount(Number(e.target.value))}
                        className="w-32"
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCollectRent}
                  disabled={saving || selectedCount === 0}
                  className="w-full"
                >
                  {saving ? "சேமிக்கிறது..." : "இரசீது உருவாக்கு"}
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RentCollectionDialog;
