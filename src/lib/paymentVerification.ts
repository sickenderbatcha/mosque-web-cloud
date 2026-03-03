import { supabase } from "@/integrations/supabase/client";

interface VerifyBookingPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingId: string;
  type: "booking";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const ensureBookingReceiptNumberWithRetry = async (
  bookingId: string,
  maxAttempts = 4
): Promise<string | null> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await supabase.functions.invoke("create-razorpay-order", {
      body: {
        action: "ensure_booking_income",
        bookingId,
      },
    });

    const receiptNumber = result.data?.receiptNumber;
    if (!result.error && typeof receiptNumber === "string" && receiptNumber.trim().length > 0) {
      return receiptNumber;
    }

    if (attempt < maxAttempts - 1) {
      await sleep(700 * (attempt + 1));
    }
  }

  return null;
};

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
      if (typeof result.data?.receiptNumber !== "string") {
        const ensuredReceipt = await ensureBookingReceiptNumberWithRetry(payload.bookingId);
        if (ensuredReceipt) {
          return {
            ...result,
            data: {
              ...result.data,
              receiptNumber: ensuredReceipt,
            },
          };
        }
      }
      return result;
    }

    lastError = result.error || new Error(result.data?.error || "Payment verification failed");

    if (attempt < maxAttempts - 1) {
      await sleep(700 * (attempt + 1));
    }
  }

  return { data: null, error: lastError };
};
