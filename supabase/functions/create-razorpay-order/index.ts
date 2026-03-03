import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateOrderRequest {
  amount: number;
  bookingId?: string;
  subscriptionId?: string;
  certificatePaymentId?: string;
  nocCertificateId?: string;
  donationId?: string;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  type?: "booking" | "subscription" | "certificate" | "noc" | "donation";
}

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingId?: string;
  subscriptionId?: string;
  certificatePaymentId?: string;
  nocCertificateId?: string;
  donationId?: string;
  type?: "booking" | "subscription" | "certificate" | "noc" | "donation";
}

interface EnsureBookingIncomeRequest {
  bookingId?: string;
}

interface EnsureIncomeParams {
  referenceId: string;
  referenceType: string;
  receiptType: string;
  amount: number | null | undefined;
  category: string;
  source: string;
  description: string;
  paymentMethod?: string | null;
}

const getNumericSetting = async (
  supabase: ReturnType<typeof createClient>,
  key: string,
  defaultValue: number,
): Promise<number> => {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  const parsed = Number.parseFloat(data?.value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
};

const getSequentialReceiptNumber = async (
  supabase: ReturnType<typeof createClient>,
  receiptType: string,
): Promise<string | null> => {
  const { data: nextReceipt, error: receiptError } = await supabase.rpc("get_next_receipt_number", {
    p_receipt_type: receiptType,
  });

  if (receiptError || typeof nextReceipt !== "string") {
    console.error("Unable to generate sequential receipt number:", receiptError);
    return null;
  }

  return nextReceipt;
};

const ensureIncomeRecord = async (
  supabase: ReturnType<typeof createClient>,
  params: EnsureIncomeParams,
): Promise<string | null> => {
  const {
    referenceId,
    referenceType,
    receiptType,
    amount,
    category,
    source,
    description,
    paymentMethod,
  } = params;

  if (!amount || amount <= 0) {
    console.error("Invalid income amount for sync:", { referenceId, referenceType, amount });
    return null;
  }

  const { data: existingIncome } = await supabase
    .from("income")
    .select("id, receipt_number")
    .eq("reference_id", referenceId)
    .eq("reference_type", referenceType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasSequentialReceipt =
    typeof existingIncome?.receipt_number === "string" && /-\d{4}-\d{4}$/.test(existingIncome.receipt_number);

  let resolvedReceiptNumber: string | null = hasSequentialReceipt
    ? existingIncome!.receipt_number
    : await getSequentialReceiptNumber(supabase, receiptType);

  if (!resolvedReceiptNumber) return null;

  const payload = {
    amount,
    category,
    source,
    description,
    income_date: new Date().toISOString().slice(0, 10),
    payment_method: paymentMethod ?? "Online",
    receipt_number: resolvedReceiptNumber,
    reference_id: referenceId,
    reference_type: referenceType,
  };

  if (existingIncome?.id) {
    const { error: updateIncomeError } = await supabase
      .from("income")
      .update(payload)
      .eq("id", existingIncome.id);

    if (updateIncomeError) {
      console.error("Failed to update income record:", updateIncomeError);
      return null;
    }

    return resolvedReceiptNumber;
  }

  const { error: insertIncomeError } = await supabase.from("income").insert(payload);
  if (insertIncomeError) {
    console.error("Failed to insert income record:", insertIncomeError);
    return null;
  }

  return resolvedReceiptNumber;
};

const ensureBookingIncomeSync = async (supabase: ReturnType<typeof createClient>, bookingId: string): Promise<string | null> => {
  try {
    const { data: bookingData, error: bookingError } = await supabase
      .from("mahal_bookings")
      .select("id, booking_amount, applicant_name, event_type, event_date, payment_status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !bookingData) {
      console.error("Unable to fetch booking for income sync:", bookingError);
      return null;
    }

    return await ensureIncomeRecord(supabase, {
      referenceId: bookingId,
      referenceType: "booking",
      receiptType: "booking",
      amount: bookingData.booking_amount,
      category: "மஹால் முன்பதிவு (Mahal Booking)",
      source: bookingData.applicant_name,
      description: `${bookingData.event_type} - ${bookingData.event_date}`,
      paymentMethod: bookingData.payment_status === "completed" ? "Online" : "Cash",
    });
  } catch (e) {
    console.error("Unexpected error in ensureBookingIncomeSync:", e);
    return null;
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      console.error("Razorpay API keys not configured");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const url = new URL(req.url);
    let payload: any = {};
    if (req.method !== "GET") {
      try {
        payload = await req.json();
      } catch {
        payload = {};
      }
    }
    const action = (url.searchParams.get("action") || payload?.action || "create").toString();

    if (action === "ensure_booking_income") {
      const { bookingId }: EnsureBookingIncomeRequest = payload;
      if (!bookingId) {
        return new Response(
          JSON.stringify({ error: "bookingId is required", success: false }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      const receiptNumber = await ensureBookingIncomeSync(supabase, bookingId);

      if (!receiptNumber) {
        return new Response(
          JSON.stringify({ error: "Unable to sync booking income", success: false }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, bookingId, receiptNumber }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "create") {
      const { amount, bookingId, subscriptionId, certificatePaymentId, nocCertificateId, donationId, currency = "INR", receipt, notes, type = "booking" }: CreateOrderRequest = payload;

      // Input validation
      if (!amount || typeof amount !== "number" || amount <= 0 || amount > 10000000) {
        return new Response(
          JSON.stringify({ error: "Invalid amount" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Create Razorpay order
      const auth = btoa(`${keyId}:${keySecret}`);
      let receiptId: string;
      let orderNotes: Record<string, string>;

      const buildSafeReceiptId = (prefix: string, rawId?: string) => {
        const compactId = (rawId || `${Date.now()}`).replace(/[^a-zA-Z0-9]/g, "").slice(0, 24);
        return `${prefix}${compactId}`.slice(0, 40);
      };

      if (type === "donation") {
        receiptId = buildSafeReceiptId("don_", donationId);
        orderNotes = notes || { donationId: donationId || "" };
      } else if (type === "noc") {
        receiptId = buildSafeReceiptId("noc_", nocCertificateId);
        orderNotes = notes || { nocCertificateId: nocCertificateId || "" };
      } else if (type === "certificate") {
        receiptId = buildSafeReceiptId("cert_", certificatePaymentId);
        orderNotes = notes || { certificatePaymentId: certificatePaymentId || "" };
      } else if (type === "subscription") {
        receiptId = buildSafeReceiptId("sub_", subscriptionId);
        orderNotes = notes || { subscriptionId: subscriptionId || "" };
      } else {
        receiptId = buildSafeReceiptId("book_", bookingId);
        orderNotes = notes || { bookingId: bookingId || "" };
      }

      const finalReceipt = (receipt || receiptId).slice(0, 40);

      const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // Razorpay expects amount in paise
          currency,
          receipt: finalReceipt,
          notes: orderNotes,
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.text();
        console.error("Razorpay order creation failed:", errorData);
        return new Response(
          JSON.stringify({ error: "Failed to create payment order" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const order = await orderResponse.json();
      console.log("Razorpay order created:", order.id, "Type:", type);

      return new Response(
        JSON.stringify({
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else if (action === "verify") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, subscriptionId, certificatePaymentId, nocCertificateId, donationId, type = "booking" }: VerifyPaymentRequest = payload;

      // Verify signature
      const crypto = await import("https://deno.land/std@0.190.0/crypto/mod.ts");
      const encoder = new TextEncoder();
      const data = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);
      const key = encoder.encode(keySecret);
      
      const hmacKey = await crypto.crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      const signature = await crypto.crypto.subtle.sign("HMAC", hmacKey, data);
      const expectedSignature = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

      if (expectedSignature !== razorpay_signature) {
        console.error("Payment signature verification failed");
        return new Response(
          JSON.stringify({ error: "Payment verification failed", verified: false }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update payment status in database
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Helper to send admin notification for online payments
      const notifyAdmin = async (title: string, message: string, referenceId: string, referenceType: string) => {
        try {
          await supabase.from("admin_notifications").insert({
            type: "online_payment",
            title,
            message,
            reference_id: referenceId,
            reference_type: referenceType,
          });
        } catch (e) {
          console.error("Failed to create admin notification:", e);
        }
      };

      // Booking income sync is handled by shared ensureBookingIncomeSync helper.

      let verifiedReceiptNumber: string | null = null;

      if (type === "donation" && donationId) {
        const { error: updateError } = await supabase
          .from("donations")
          .update({
            payment_status: "completed",
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
            transaction_id: razorpay_payment_id,
          })
          .eq("id", donationId);

        if (updateError) {
          console.error("Failed to update donation payment:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update donation payment", verified: false }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data: donationData } = await supabase
          .from("donations")
          .select("donor_name, amount, purpose")
          .eq("id", donationId)
          .single();

        verifiedReceiptNumber = await ensureIncomeRecord(supabase, {
          referenceId: donationId,
          referenceType: "donation",
          receiptType: "donation",
          amount: donationData?.amount,
          category: "நன்கொடை (Donation)",
          source: donationData?.donor_name || "Anonymous",
          description: donationData?.purpose || "General Donation",
          paymentMethod: "Online",
        });

        if (!verifiedReceiptNumber) {
          return new Response(
            JSON.stringify({ error: "Payment verified but donation income sync failed", verified: false }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        await notifyAdmin(
          "புதிய ஆன்லைன் நன்கொடை (New Online Donation)",
          `${donationData?.donor_name || "Unknown"} அவர்களிடமிருந்து ₹${donationData?.amount || 0} நன்கொடை ஆன்லைன் மூலம் பெறப்பட்டது. Payment ID: ${razorpay_payment_id}`,
          donationId,
          "donations"
        );
      } else if (type === "noc" && nocCertificateId) {
        const { error: updateError } = await supabase
          .from("noc_certificates")
          .update({
            payment_status: "completed",
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
          })
          .eq("id", nocCertificateId);

        if (updateError) {
          console.error("Failed to update NOC certificate payment:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update NOC certificate payment", verified: false }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data: nocData } = await supabase
          .from("noc_certificates")
          .select("applicant_name")
          .eq("id", nocCertificateId)
          .single();

        const nocFee = await getNumericSetting(supabase, "certificate_fee_noc", 100);
        verifiedReceiptNumber = await ensureIncomeRecord(supabase, {
          referenceId: nocCertificateId,
          referenceType: "noc_certificate",
          receiptType: "certificate_noc",
          amount: nocFee,
          category: "ஆட்சேபனையின்மை சான்றிதழ் (NOC)",
          source: nocData?.applicant_name || "Unknown",
          description: `NOC சான்றிதழ் கட்டணம் - ${nocCertificateId}`,
          paymentMethod: "Online",
        });

        if (!verifiedReceiptNumber) {
          return new Response(
            JSON.stringify({ error: "Payment verified but NOC income sync failed", verified: false }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        await notifyAdmin(
          "புதிய ஆன்லைன் NOC கட்டணம் (New Online NOC Payment)",
          `${nocData?.applicant_name || "Unknown"} அவர்களிடமிருந்து NOC சான்றிதழ் கட்டணம் ஆன்லைன் மூலம் பெறப்பட்டது. Payment ID: ${razorpay_payment_id}`,
          nocCertificateId,
          "noc_certificates"
        );
      } else if (type === "certificate" && certificatePaymentId) {
        const { error: updateError } = await supabase
          .from("certificate_payments")
          .update({
            payment_status: "completed",
            payment_method: "online",
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
            transaction_id: razorpay_payment_id,
          })
          .eq("id", certificatePaymentId);

        if (updateError) {
          console.error("Failed to update certificate payment:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update certificate payment", verified: false }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data: certData } = await supabase
          .from("certificate_payments")
          .select("applicant_name, amount, certificate_type")
          .eq("id", certificatePaymentId)
          .single();

        verifiedReceiptNumber = await ensureIncomeRecord(supabase, {
          referenceId: certificatePaymentId,
          referenceType: "certificate_payment",
          receiptType: "certificate_general",
          amount: certData?.amount,
          category: "சான்றிதழ் கட்டணம் (Certificate Fee)",
          source: certData?.applicant_name || "Unknown",
          description: `${certData?.certificate_type || "certificate"} certificate payment`,
          paymentMethod: "Online",
        });

        if (!verifiedReceiptNumber) {
          return new Response(
            JSON.stringify({ error: "Payment verified but certificate income sync failed", verified: false }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        await notifyAdmin(
          "புதிய ஆன்லைன் சான்றிதழ் கட்டணம் (New Online Certificate Payment)",
          `${certData?.applicant_name || "Unknown"} அவர்களிடமிருந்து ${certData?.certificate_type || ""} சான்றிதழ் கட்டணம் ₹${certData?.amount || 0} ஆன்லைன் மூலம் பெறப்பட்டது. Payment ID: ${razorpay_payment_id}`,
          certificatePaymentId,
          "certificate_payments"
        );
      } else if (type === "subscription" && subscriptionId) {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({
            payment_status: "paid",
            razorpay_payment_id: razorpay_payment_id,
            razorpay_order_id: razorpay_order_id,
            transaction_id: razorpay_payment_id,
          })
          .eq("id", subscriptionId);

        if (updateError) {
          console.error("Failed to update subscription:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update subscription payment", verified: false }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data: subData } = await supabase
          .from("subscriptions")
          .select("member_name, total_amount, member_id, subscription_type, from_month, from_year, to_month, to_year")
          .eq("id", subscriptionId)
          .single();

        verifiedReceiptNumber = await ensureIncomeRecord(supabase, {
          referenceId: subscriptionId,
          referenceType: "subscription",
          receiptType: "subscription",
          amount: subData?.total_amount,
          category: "சந்தா (Subscription)",
          source: `${subData?.member_name || "Unknown"} (${subData?.member_id || ""})`,
          description: `${subData?.subscription_type || "subscription"} - ${subData?.from_month || ""}/${subData?.from_year || ""} to ${subData?.to_month || ""}/${subData?.to_year || ""}`,
          paymentMethod: "Online",
        });

        if (!verifiedReceiptNumber) {
          return new Response(
            JSON.stringify({ error: "Payment verified but subscription income sync failed", verified: false }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        await notifyAdmin(
          "புதிய ஆன்லைன் சந்தா கட்டணம் (New Online Subscription Payment)",
          `${subData?.member_name || "Unknown"} (${subData?.member_id || ""}) அவர்களிடமிருந்து ₹${subData?.total_amount || 0} சந்தா கட்டணம் ஆன்லைன் மூலம் பெறப்பட்டது. Payment ID: ${razorpay_payment_id}`,
          subscriptionId,
          "subscriptions"
        );
      } else if (bookingId) {
        // Update booking payment status - use "completed" for online payments
        const { error: updateError } = await supabase
          .from("mahal_bookings")
          .update({
            payment_status: "completed",
            admin_notes: `Online Payment - Payment ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}`,
          })
          .eq("id", bookingId);

        if (updateError) {
          console.error("Failed to update booking:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update booking payment", verified: false }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        console.log("Booking payment status updated to completed:", bookingId);
        verifiedReceiptNumber = await ensureBookingIncomeSync(supabase, bookingId);

        if (!verifiedReceiptNumber) {
          const { data: incomeRow } = await supabase
            .from("income")
            .select("receipt_number")
            .eq("reference_id", bookingId)
            .eq("reference_type", "booking")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          verifiedReceiptNumber = incomeRow?.receipt_number ?? null;
        }

        if (!verifiedReceiptNumber) {
          console.error("Booking income sync failed: missing sequential receipt number", bookingId);
          return new Response(
            JSON.stringify({ error: "Payment verified but income sync failed", verified: false }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const { data: bookingData } = await supabase.from("mahal_bookings").select("applicant_name, booking_amount, event_type").eq("id", bookingId).single();
        await notifyAdmin(
          "புதிய ஆன்லைன் முன்பதிவு கட்டணம் (New Online Booking Payment)",
          `${bookingData?.applicant_name || "Unknown"} அவர்களிடமிருந்து ${bookingData?.event_type || ""} முன்பதிவு கட்டணம் ₹${bookingData?.booking_amount || 0} ஆன்லைன் மூலம் பெறப்பட்டது. Payment ID: ${razorpay_payment_id}`,
          bookingId,
          "mahal_bookings"
        );
      }

      return new Response(
        JSON.stringify({
          verified: true,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          receiptNumber: verifiedReceiptNumber,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in razorpay function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
