import { supabase } from "@/integrations/supabase/client";

interface VerifyBookingPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingId: string;
  type: "booking";
}

export const verifyRazorpayPaymentWithRetry = async (
  payload: VerifyBookingPaymentPayload,
  maxAttempts = 3
) => {
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await supabase.functions.invoke("create-razorpay-order", {
      body: {
        action: "verify",
        ...payload,
      },
    });

    if (!result.error && result.data?.verified) {
      return result;
    }

    lastError = result.error || new Error(result.data?.error || "Payment verification failed");

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
  }

  return { data: null, error: lastError };
};
