import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


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


type RefIds = {
  type?: string;
  bookingId?: string;
  subscriptionId?: string;
  certificatePaymentId?: string;
  nocCertificateId?: string;
  donationId?: string;
};

/** Look up the real amount owed for the referenced record. Never trust the client. */
async function resolveExpectedAmount(
  svc: ReturnType<typeof createClient>,
  refs: RefIds,
): Promise<number | null> {
  const { type = "booking", bookingId, subscriptionId, certificatePaymentId, nocCertificateId, donationId } = refs;

  const fetchAmount = async (table: string, column: string, id?: string) => {
    if (!id) return null;
    const { data, error } = await svc.from(table).select(column).eq("id", id).maybeSingle();
    if (error || !data) return null;
    const value = Number((data as Record<string, unknown>)[column]);
    return Number.isFinite(value) && value > 0 ? value : null;
  };

  if (type === "donation") return await fetchAmount("donations", "amount", donationId);
  if (type === "noc") {
    const direct = await fetchAmount("noc_certificates", "amount", nocCertificateId);
    if (direct !== null) return direct;
    return await fetchAmount("certificate_payments", "amount", certificatePaymentId);
  }
  if (type === "certificate") return await fetchAmount("certificate_payments", "amount", certificatePaymentId);
  if (type === "subscription") return await fetchAmount("subscriptions", "total_amount", subscriptionId);
  return await fetchAmount("mahal_bookings", "booking_amount", bookingId);
}

/**
 * Mahal bookings are created only after payment succeeds, so no record exists yet at
 * order-creation time. Validate the requested amount against the configured service
 * rates: it must equal the sum of a non-empty subset of the configured services.
 */
async function resolveBookingComboAmount(
  svc: ReturnType<typeof createClient>,
  requestedAmount: number,
): Promise<number | null> {
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) return null;

  const legacyDefaults: Record<string, number> = {
    booking_rate_nikkah_book: 3000,
    booking_rate_hall: 15000,
    booking_rate_food_facility: 7000,
  };
  const legacyKeys = Object.keys(legacyDefaults);
  const SERVICES_KEY = "mahal_booking_services";

  const { data } = await svc
    .from("app_settings")
    .select("key, value")
    .in("key", [SERVICES_KEY, ...legacyKeys]);
  const rows = (data as Array<{ key: string; value: string }> | null) || [];
  const valueOf = (key: string) => rows.find((r) => r.key === key)?.value;

  let rates: number[] = [];

  const rawServices = valueOf(SERVICES_KEY);
  if (rawServices) {
    try {
      const parsed = JSON.parse(rawServices);
      if (Array.isArray(parsed)) {
        rates = parsed
          .map((item: any) => Number(item?.rate))
          .filter((rate: number) => Number.isFinite(rate) && rate > 0);
      }
    } catch (_error) {
      rates = [];
    }
  }

  if (rates.length === 0) {
    rates = legacyKeys.map((key) => {
      const parsed = Number(valueOf(key));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : legacyDefaults[key];
    });
  }

  if (rates.length === 0) return null;

  const target = Math.round(requestedAmount * 100);

  if (rates.length <= 20) {
    // Enumerate every non-empty subset total
    for (let mask = 1; mask < 1 << rates.length; mask++) {
      let total = 0;
      for (let i = 0; i < rates.length; i++) {
        if (mask & (1 << i)) total += rates[i];
      }
      if (Math.round(total * 100) === target) return total;
    }
    return null;
  }

  // Bounded subset-sum over cent totals for larger service lists
  const cents = rates.map((rate) => Math.round(rate * 100));
  let reachable = new Set<number>([0]);
  for (const cent of cents) {
    const next = new Set<number>(reachable);
    for (const sum of reachable) {
      const candidate = sum + cent;
      if (candidate <= target) next.add(candidate);
    }
    reachable = next;
    if (reachable.size > 200000) break;
  }

  return reachable.has(target) && target > 0 ? requestedAmount : null;
}



const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
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
    const action = url.searchParams.get("action") || "create";

    if (action === "create") {
      const { amount, bookingId, subscriptionId, certificatePaymentId, nocCertificateId, donationId, currency = "INR", receipt, notes, type = "booking" }: CreateOrderRequest = await req.json();

      // Resolve the authoritative amount server-side from the referenced record.
      const svcUrl = Deno.env.get("SUPABASE_URL")!;
      const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const svc = createClient(svcUrl, svcKey);

      const expected = (type === "booking" && !bookingId)
        ? await resolveBookingComboAmount(svc, Number(amount))
        : await resolveExpectedAmount(svc, {
          type,
          bookingId,
          subscriptionId,
          certificatePaymentId,
          nocCertificateId,
          donationId,
        });



      if (expected === null) {
        return new Response(
          JSON.stringify({ error: "Unable to determine amount for this request" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const authoritativeAmount = expected;

      if (!authoritativeAmount || authoritativeAmount <= 0 || authoritativeAmount > 10000000) {
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
          amount: Math.round(authoritativeAmount * 100), // Razorpay expects amount in paise (server-derived)
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
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, subscriptionId, certificatePaymentId, nocCertificateId, donationId, type = "booking" }: VerifyPaymentRequest = await req.json();

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

      // Confirm the amount actually captured by Razorpay matches what is owed.
      const expectedAmount = await resolveExpectedAmount(supabase, {
        type,
        bookingId,
        subscriptionId,
        certificatePaymentId,
        nocCertificateId,
        donationId,
      });

      if (expectedAmount === null) {
        console.error("Could not resolve expected amount during verification");
        return new Response(
          JSON.stringify({ error: "Payment verification failed", verified: false }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const orderLookup = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
      });

      if (!orderLookup.ok) {
        console.error("Failed to fetch Razorpay order for verification");
        return new Response(
          JSON.stringify({ error: "Payment verification failed", verified: false }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const orderData = await orderLookup.json();
      const paidPaise = Number(orderData?.amount_paid ?? 0);
      const expectedPaise = Math.round(expectedAmount * 100);

      if (paidPaise < expectedPaise) {
        console.error("Underpayment detected during verification");
        return new Response(
          JSON.stringify({ error: "Paid amount does not match the amount due", verified: false }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

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

      if (type === "donation" && donationId) {
        // Update donation payment status
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
        } else {
          console.log("Donation payment status updated:", donationId);
          // Fetch donor info for notification
          const { data: donationData } = await supabase.from("donations").select("donor_name, amount").eq("id", donationId).single();
          await notifyAdmin(
            "புதிய ஆன்லைன் நன்கொடை (New Online Donation)",
            `${donationData?.donor_name || "Unknown"} அவர்களிடமிருந்து ₹${donationData?.amount || 0} நன்கொடை ஆன்லைன் மூலம் பெறப்பட்டது. Payment ID: ${razorpay_payment_id}`,
            donationId,
            "donations"
          );
        }
      } else if (type === "noc" && nocCertificateId) {
        // Update NOC certificate payment status
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
        } else {
          console.log("NOC certificate payment status updated:", nocCertificateId);
          const { data: nocData } = await supabase.from("noc_certificates").select("applicant_name").eq("id", nocCertificateId).single();
          await notifyAdmin(
            "புதிய ஆன்லைன் NOC கட்டணம் (New Online NOC Payment)",
            `${nocData?.applicant_name || "Unknown"} அவர்களிடமிருந்து NOC சான்றிதழ் கட்டணம் ஆன்லைன் மூலம் பெறப்பட்டது. Payment ID: ${razorpay_payment_id}`,
            nocCertificateId,
            "noc_certificates"
          );
        }
      } else if (type === "certificate" && certificatePaymentId) {
        // Update certificate payment status
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
        } else {
          console.log("Certificate payment status updated:", certificatePaymentId);
          const { data: certData } = await supabase.from("certificate_payments").select("applicant_name, amount, certificate_type, reference_id").eq("id", certificatePaymentId).single();
          
          // Also update the source certificate table's payment status
          if (certData?.certificate_type && certData?.reference_id) {
            const certTableMap: Record<string, string> = {
              noc: "noc_certificates",
              heir: "heir_certificates",
            };
            const sourceTable = certTableMap[certData.certificate_type];
            if (sourceTable) {
              const { error: sourceUpdateError } = await supabase
                .from(sourceTable)
                .update({
                  payment_status: "completed",
                  razorpay_order_id: razorpay_order_id,
                  razorpay_payment_id: razorpay_payment_id,
                })
                .eq("id", certData.reference_id);
              if (sourceUpdateError) {
                console.error(`Failed to update ${sourceTable} payment status:`, sourceUpdateError);
              } else {
                console.log(`${sourceTable} payment status updated for:`, certData.reference_id);
              }
            }
          }

          await notifyAdmin(
            "புதிய ஆன்லைன் சான்றிதழ் கட்டணம் (New Online Certificate Payment)",
            `${certData?.applicant_name || "Unknown"} அவர்களிடமிருந்து ${certData?.certificate_type || ""} சான்றிதழ் கட்டணம் ₹${certData?.amount || 0} ஆன்லைன் மூலம் பெறப்பட்டது. Payment ID: ${razorpay_payment_id}`,
            certificatePaymentId,
            "certificate_payments"
          );
        }
      } else if (type === "subscription" && subscriptionId) {
        // Update subscription payment status
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
        } else {
          console.log("Subscription payment status updated:", subscriptionId);
          const { data: subData } = await supabase.from("subscriptions").select("member_name, total_amount, member_id").eq("id", subscriptionId).single();
          await notifyAdmin(
            "புதிய ஆன்லைன் சந்தா கட்டணம் (New Online Subscription Payment)",
            `${subData?.member_name || "Unknown"} (${subData?.member_id || ""}) அவர்களிடமிருந்து ₹${subData?.total_amount || 0} சந்தா கட்டணம் ஆன்லைன் மூலம் பெறப்பட்டது. Payment ID: ${razorpay_payment_id}`,
            subscriptionId,
            "subscriptions"
          );
        }
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
        } else {
          console.log("Booking payment status updated to completed:", bookingId);
          const { data: bookingData } = await supabase.from("mahal_bookings").select("applicant_name, booking_amount, event_type").eq("id", bookingId).single();
          await notifyAdmin(
            "புதிய ஆன்லைன் முன்பதிவு கட்டணம் (New Online Booking Payment)",
            `${bookingData?.applicant_name || "Unknown"} அவர்களிடமிருந்து ${bookingData?.event_type || ""} முன்பதிவு கட்டணம் ₹${bookingData?.booking_amount || 0} ஆன்லைன் மூலம் பெறப்பட்டது. Payment ID: ${razorpay_payment_id}`,
            bookingId,
            "mahal_bookings"
          );
        }
      }

      return new Response(
        JSON.stringify({
          verified: true,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
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
