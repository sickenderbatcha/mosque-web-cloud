import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ServiceType = "booking" | "donation" | "certificate" | "subscription" | "noc" | "heir" | "outside_marriage_certificate";

interface CashPaymentRequestParams {
  serviceType: ServiceType;
  referenceId?: string;
  amount: number;
  applicantName: string;
  applicantPhone: string;
  applicantEmail?: string;
  failureReason?: string;
  serviceDetails?: Record<string, any>;
}

export const useCashPaymentRequest = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitCashPaymentRequest = useCallback(
    async (params: CashPaymentRequestParams): Promise<boolean> => {
      setIsSubmitting(true);
      try {
        const { error } = await supabase.from("cash_payment_requests").insert({
          service_type: params.serviceType,
          reference_id: params.referenceId,
          user_id: user?.id,
          amount: params.amount,
          applicant_name: params.applicantName,
          applicant_phone: params.applicantPhone,
          applicant_email: params.applicantEmail,
          failure_reason: params.failureReason,
          service_details: params.serviceDetails,
          status: "pending",
        });

        if (error) throw error;

        toast.success(
          "ரொக்க செலுத்துதல் கோரிக்கை சமர்ப்பிக்கப்பட்டது",
          {
            description: "நிர்வாகி விரைவில் உங்களை தொடர்பு கொள்வார்",
          }
        );
        return true;
      } catch (error) {
        console.error("Error submitting cash payment request:", error);
        toast.error("கோரிக்கை சமர்ப்பிப்பதில் பிழை");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user]
  );

  // Auto-submit on payment failure (can be called directly after Razorpay failure)
  const handlePaymentFailure = useCallback(
    async (
      params: Omit<CashPaymentRequestParams, "failureReason"> & {
        razorpayError?: { code?: string; description?: string; reason?: string };
      }
    ): Promise<boolean> => {
      const failureReason = params.razorpayError
        ? `${params.razorpayError.description || params.razorpayError.reason || "Payment failed"} (Code: ${params.razorpayError.code || "UNKNOWN"})`
        : "Payment failed or cancelled by user";

      return submitCashPaymentRequest({
        ...params,
        failureReason,
      });
    },
    [submitCashPaymentRequest]
  );

  return {
    submitCashPaymentRequest,
    handlePaymentFailure,
    isSubmitting,
  };
};
