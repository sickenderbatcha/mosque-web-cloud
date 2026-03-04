import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Save, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SequenceRow {
  id: string;
  receipt_type: string;
  year: number;
  last_number: number;
  updated_at: string;
}

const RECEIPT_TYPE_LABELS: Record<string, string> = {
  booking: "முன்பதிவு (Booking)",
  donation: "நன்கொடை (Donation)",
  subscription: "சந்தா (Subscription)",
  cash_payment: "ரொக்க செலுத்துதல் (Cash Payment)",
  certificate_general: "சான்றிதழ் பொது (Certificate General - Marriage/Death/NOC/Heir)",
  certificate_heir: "வாரிசு சான்றிதழ் (Heir Certificate)",
};

const ReceiptSequenceResetSettings = () => {
  const [sequences, setSequences] = useState<SequenceRow[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: string; value: number } | null>(null);
  const { toast } = useToast();

  const ALL_RECEIPT_TYPES = Object.keys(RECEIPT_TYPE_LABELS);

  useEffect(() => {
    fetchSequences();
  }, []);

  const fetchSequences = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("receipt_sequences")
        .select("*")
        .order("receipt_type")
        .order("year", { ascending: false });

      if (error) throw error;

      const rows = (data as SequenceRow[]) || [];
      const currentYear = new Date().getFullYear();

      // Build virtual rows for missing receipt types in current year
      const existingKeys = new Set(rows.map(r => `${r.receipt_type}_${r.year}`));
      const virtualRows: SequenceRow[] = ALL_RECEIPT_TYPES
        .filter(type => !existingKeys.has(`${type}_${currentYear}`))
        .map(type => ({
          id: `virtual_${type}_${currentYear}`,
          receipt_type: type,
          year: currentYear,
          last_number: 0,
          updated_at: new Date().toISOString(),
        }));

      const allRows = [...rows, ...virtualRows].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return a.receipt_type.localeCompare(b.receipt_type);
      });

      setSequences(allRows);
      const vals: Record<string, string> = {};
      allRows.forEach((row) => {
        vals[`${row.receipt_type}_${row.year}`] = row.last_number.toString();
      });
      setEditValues(vals);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (receiptType: string, year: number) => {
    const key = `${receiptType}_${year}`;
    const newVal = parseInt(editValues[key] || "0", 10);
    if (isNaN(newVal) || newVal < 0) {
      toast({ title: "Invalid Value", description: "Please enter a valid number (0 or above).", variant: "destructive" });
      return;
    }
    setConfirmDialog({ open: true, type: receiptType, value: newVal });
  };

  const confirmSave = async () => {
    if (!confirmDialog) return;
    const { type, value } = confirmDialog;
    const seq = sequences.find(s => s.receipt_type === type);
    const year = seq?.year || new Date().getFullYear();

    setSaving(type);
    setConfirmDialog(null);
    try {
      const { error } = await supabase
        .from("receipt_sequences")
        .upsert(
          { receipt_type: type, year, last_number: value, updated_at: new Date().toISOString() },
          { onConflict: "receipt_type,year" }
        );

      if (error) throw error;

      toast({
        title: "Sequence Updated",
        description: `${RECEIPT_TYPE_LABELS[type] || type} next number set to ${value + 1}.`,
      });
      fetchSequences();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const handleReset = (receiptType: string, year: number) => {
    const key = `${receiptType}_${year}`;
    setEditValues(prev => ({ ...prev, [key]: "0" }));
    setConfirmDialog({ open: true, type: receiptType, value: 0 });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Receipt Sequence Reset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (sequences.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Receipt Sequence Reset
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No receipt sequences found. Sequences are created automatically when receipts are generated.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by year
  const years = [...new Set(sequences.map(s => s.year))].sort((a, b) => b - a);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            ரசீது வரிசை எண் மீட்டமைப்பு (Receipt Sequence Reset)
          </CardTitle>
          <CardDescription>
            View and reset the sequential counter for each receipt type. The "Last Number" is the most recently issued number.
            Setting it to 0 will restart numbering from 0001.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {years.map(year => (
            <div key={year} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Year: {year}</h3>
              <div className="space-y-3">
                {sequences
                  .filter(s => s.year === year)
                  .map(seq => {
                    const key = `${seq.receipt_type}_${seq.year}`;
                    const currentVal = parseInt(editValues[key] || "0", 10);
                    const hasChanged = currentVal !== seq.last_number;

                    return (
                      <div key={seq.id} className="flex flex-col sm:flex-row sm:items-end gap-2 p-3 rounded-lg border bg-card">
                        <div className="flex-1 space-y-1">
                          <Label className="text-sm font-medium">
                            {RECEIPT_TYPE_LABELS[seq.receipt_type] || seq.receipt_type}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              value={editValues[key] || "0"}
                              onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                              className="max-w-[120px]"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              Next: <code className="bg-muted px-1 py-0.5 rounded">{String(currentVal + 1).padStart(4, "0")}</code>
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(seq.receipt_type, seq.year)}
                            disabled={!hasChanged || saving === seq.receipt_type}
                            className="h-auto py-1.5"
                          >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            {saving === seq.receipt_type ? "Saving..." : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReset(seq.receipt_type, seq.year)}
                            disabled={saving === seq.receipt_type}
                            className="h-auto py-1.5"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Reset to 0
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={confirmDialog?.open || false} onOpenChange={open => { if (!open) setConfirmDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Sequence Change
            </DialogTitle>
            <DialogDescription>
              {confirmDialog && (
                <>
                  You are about to set the <strong>{RECEIPT_TYPE_LABELS[confirmDialog.type] || confirmDialog.type}</strong> sequence to <strong>{confirmDialog.value}</strong>.
                  The next receipt will be numbered <strong>{String(confirmDialog.value + 1).padStart(4, "0")}</strong>.
                  <br /><br />
                  <span className="text-destructive font-medium">⚠️ This may cause duplicate receipt numbers if set lower than the current value. Proceed with caution.</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmSave}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReceiptSequenceResetSettings;
