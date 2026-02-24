import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle, Send } from "lucide-react";

export type ServiceType = "booking" | "donation" | "certificate" | "subscription" | "noc" | "heir" | "outside_marriage_certificate";

interface CashPaymentRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceType: ServiceType;
  referenceId?: string;
  amount: number;
  applicantName: string;
  applicantPhone: string;
  applicantEmail?: string;
  failureReason?: string;
  serviceDetails?: Record<string, any>;
  onSuccess?: () => void;
  /** Called before submitting - allows parent to create booking first and return the reference ID */
  onBeforeSubmit?: () => Promise<string>;
}

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  booking: "மஹால் முன்பதிவு (Mahal Booking)",
  donation: "நன்கொடை (Donation)",
  certificate: "சான்றிதழ் (Certificate)",
  subscription: "சந்தா (Subscription)",
  noc: "ஆட்சேபனையின்மை சான்றிதழ் (NOC)",
  heir: "வாரிசு சான்றிதழ் (Heir)",
  outside_marriage_certificate: "வெளியூர் திருமணச் சான்றிதழ் (Outside Marriage Certificate)",
};

const CashPaymentRequestDialog = ({
  open,
  onOpenChange,
  serviceType,
  referenceId,
  amount,
  applicantName,
  applicantPhone,
  applicantEmail,
  failureReason,
  serviceDetails,
  onSuccess,
  onBeforeSubmit,
}: CashPaymentRequestDialogProps) => {
  const { user } = useAuth();
  const [userNotes, setUserNotes] = useState("");

  // Check if a request already exists for this reference
  const { data: existingRequest, isLoading: checkingExisting } = useQuery({
    queryKey: ["cash-payment-request-exists", serviceType, referenceId],
    queryFn: async () => {
      if (!referenceId) return null;
      
      const { data, error } = await supabase
        .from("cash_payment_requests")
        .select("id, status, created_at")
        .eq("service_type", serviceType)
        .eq("reference_id", referenceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error("Error checking existing request:", error);
        return null;
      }
      return data;
    },
    enabled: open && !!referenceId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      // If onBeforeSubmit is provided, call it first to create the booking/record
      let finalReferenceId = referenceId;
      if (onBeforeSubmit) {
        finalReferenceId = await onBeforeSubmit();
      }
      
      const { error } = await supabase.from("cash_payment_requests").insert({
        service_type: serviceType,
        reference_id: finalReferenceId && finalReferenceId.trim() !== "" ? finalReferenceId : null,
        user_id: user?.id || null,
        amount,
        applicant_name: applicantName,
        applicant_phone: applicantPhone,
        applicant_email: applicantEmail || null,
        failure_reason: failureReason || null,
        user_notes: userNotes || null,
        service_details: serviceDetails || null,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        "ரொக்க செலுத்துதல் கோரிக்கை சமர்ப்பிக்கப்பட்டது (Cash payment request submitted)",
        {
          description: "நிர்வாகி விரைவில் உங்களை தொடர்பு கொள்வார் (Admin will contact you soon)",
        }
      );
      setUserNotes("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Error submitting request:", error);
      toast.error("கோரிக்கை சமர்ப்பிப்பதில் பிழை (Error submitting request)");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            ரொக்க செலுத்துதல் கோரிக்கை
          </DialogTitle>
          <DialogDescription>
            Cash Payment Request
          </DialogDescription>
        </DialogHeader>

        {checkingExisting ? (
          <div className="py-8 text-center text-muted-foreground">
            சரிபார்க்கிறது... (Checking...)
          </div>
        ) : existingRequest ? (
          <div className="space-y-4">
            <div className="bg-muted/50 border border-border rounded-lg p-4 text-center min-w-0">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-semibold text-foreground text-lg break-words">
                கோரிக்கை ஏற்கனவே அனுப்பப்பட்டுள்ளது
              </p>
              <p className="text-muted-foreground text-sm mt-1 break-words">
                இந்த சான்றிதழுக்கான ரொக்க செலுத்துதல் கோரிக்கை ஏற்கனவே சமர்ப்பிக்கப்பட்டுள்ளது.
              </p>
              <p className="text-muted-foreground text-xs mt-2 break-words">
                நிலை: {existingRequest.status === "pending" ? "நிலுவையில் உள்ளது (Pending)" : 
                       existingRequest.status === "approved" ? "ஏற்றுக்கொள்ளப்பட்டது (Approved)" :
                       existingRequest.status === "paid" ? "செலுத்தப்பட்டது (Paid)" : existingRequest.status}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                மூடு (Close)
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 min-w-0">
          {failureReason && (
            <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm min-w-0">
              <p className="font-medium text-foreground">ஆன்லைன் செலுத்துதல் தோல்வி</p>
              <p className="text-muted-foreground break-words">{failureReason}</p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-3 space-y-2 min-w-0">
            <div className="flex justify-between gap-3 sm:grid sm:grid-cols-[auto,minmax(0,1fr)] sm:items-start">
              <span className="text-sm text-muted-foreground shrink-0">சேவை:</span>
              <span className="text-sm font-medium text-right break-words min-w-0 sm:justify-self-end">
                {SERVICE_TYPE_LABELS[serviceType]}
              </span>
            </div>

            <div className="flex justify-between gap-3 sm:grid sm:grid-cols-[auto,minmax(0,1fr)] sm:items-start">
              <span className="text-sm text-muted-foreground shrink-0">தொகை:</span>
              <span className="text-sm font-bold text-right min-w-0 sm:justify-self-end">
                ₹{amount.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between gap-3 sm:grid sm:grid-cols-[auto,minmax(0,1fr)] sm:items-start">
              <span className="text-sm text-muted-foreground shrink-0">பெயர்:</span>
              <span className="text-sm text-right break-words min-w-0 sm:justify-self-end">{applicantName}</span>
            </div>

            <div className="flex justify-between gap-3 sm:grid sm:grid-cols-[auto,minmax(0,1fr)] sm:items-start">
              <span className="text-sm text-muted-foreground shrink-0">தொலைபேசி:</span>
              <span className="text-sm text-right break-words min-w-0 sm:justify-self-end">{applicantPhone}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="userNotes">
              கூடுதல் குறிப்புகள் (Additional Notes) <span className="text-muted-foreground">(விருப்பம்)</span>
            </Label>
            <Textarea
              id="userNotes"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="செலுத்துதல் தோல்வியின் காரணத்தை விளக்கவும்..."
              rows={3}
              className="mt-1"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            இந்த கோரிக்கை நிர்வாகிக்கு அனுப்பப்படும். அவர்கள் உங்களை தொடர்பு கொண்டு ரொக்க செலுத்துதலை ஏற்பாடு செய்வார்கள்.
          </p>

        {/*
          Desktop fix: allow footer content (especially the bilingual submit label) to wrap
          instead of forcing the dialog to overflow horizontally.
        */}
        <DialogFooter className="flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-2 sm:space-x-0 w-full min-w-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto min-w-0">
            ரத்து (Cancel)
          </Button>
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="w-full sm:w-auto sm:max-w-[18rem] sm:whitespace-normal sm:h-auto min-w-0"
          >
            <Send className="h-4 w-4 mr-1 shrink-0" />
            <span className="min-w-0 break-words">கோரிக்கை அனுப்பு (Submit Request)</span>
          </Button>
        </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CashPaymentRequestDialog;
