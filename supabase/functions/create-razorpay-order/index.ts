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
    const action = url.searchParams.get("action") || "create";

    if (action === "create") {
      const { amount, bookingId, subscriptionId, certificatePaymentId, nocCertificateId, donationId, currency = "INR", receipt, notes, type = "booking" }: CreateOrderRequest = await req.json();

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
