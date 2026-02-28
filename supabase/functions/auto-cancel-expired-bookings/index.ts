import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const DEFAULT_TIMEOUT_HOURS = 24;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const sendSms = async (to: string, message: string) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Twilio credentials not configured");
    return { success: false, error: "SMS service not configured" };
  }

  // Format phone number for Twilio (add country code if needed)
  let formattedPhone = to.replace(/\s/g, "");
  if (!formattedPhone.startsWith("+")) {
    formattedPhone = formattedPhone.startsWith("91") ? `+${formattedPhone}` : `+91${formattedPhone}`;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: TWILIO_PHONE_NUMBER,
        Body: message,
      }),
    });

    const response = await res.json();

    if (!res.ok) {
      console.error("Twilio API error:", response);
      return { success: false, error: response };
    }

    return { success: true, data: response };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return { success: false, error };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch configurable timeout from app_settings
    let timeoutHours = DEFAULT_TIMEOUT_HOURS;
    const { data: timeoutSetting, error: timeoutError } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "booking_payment_timeout_hours")
      .single();
    
    if (timeoutSetting && !timeoutError) {
      const parsedHours = parseInt(timeoutSetting.value, 10);
      if (!isNaN(parsedHours) && parsedHours >= 1 && parsedHours <= 168) {
        timeoutHours = parsedHours;
      }
    }
    console.log(`Using timeout of ${timeoutHours} hours for auto-cancellation`);

    const timeoutMs = timeoutHours * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - timeoutMs).toISOString();

    const results = {
      processed: 0,
      cancelled: 0,
      notificationsSent: 0,
      errors: [] as string[],
    };

    // ========================================
    // PART 1: Cancel expired cash payment requests for bookings
    // (Only cash payment requests - online paid bookings are excluded)
    // ========================================
    const { data: expiredRequests, error: fetchError } = await supabase
      .from("cash_payment_requests")
      .select("*")
      .eq("status", "pending")
      .eq("service_type", "booking")
      .lt("created_at", cutoffTime);

    if (fetchError) {
      console.error("Error fetching expired requests:", fetchError);
      results.errors.push(`Failed to fetch expired requests: ${fetchError.message}`);
    } else {
      console.log(`Found ${expiredRequests?.length || 0} expired booking payment requests`);

      if (expiredRequests && expiredRequests.length > 0) {
        for (const request of expiredRequests) {
          results.processed++;
          
          try {
            // Update cash payment request status to expired
            const { error: updateRequestError } = await supabase
              .from("cash_payment_requests")
              .update({
                status: "expired",
                admin_notes: `Auto-cancelled due to ${timeoutHours}-hour payment timeout`,
                processed_at: new Date().toISOString(),
              })
              .eq("id", request.id);

            if (updateRequestError) {
              console.error(`Error updating request ${request.id}:`, updateRequestError);
              results.errors.push(`Failed to update request ${request.id}`);
              continue;
            }

            // Cancel the associated booking if reference_id exists
            // BUT skip if the booking already has a completed online payment
            if (request.reference_id) {
              // Check if booking has completed online payment
              const { data: bookingData } = await supabase
                .from("mahal_bookings")
                .select("payment_status")
                .eq("id", request.reference_id)
                .single();

              if (bookingData?.payment_status === "completed") {
                console.log(`Skipping booking ${request.reference_id} - online payment already completed`);
                continue;
              }

              const { error: cancelBookingError } = await supabase
                .from("mahal_bookings")
                .update({
                  status: "cancelled",
                  payment_status: "expired",
                  admin_notes: `Auto-cancelled: Payment not received within ${timeoutHours} hours`,
                })
                .eq("id", request.reference_id);

              if (cancelBookingError) {
                console.error(`Error cancelling booking ${request.reference_id}:`, cancelBookingError);
                results.errors.push(`Failed to cancel booking ${request.reference_id}`);
              } else {
                results.cancelled++;
                console.log(`Cancelled booking ${request.reference_id}`);
              }
            }

            // Send SMS notification to the applicant
            if (request.applicant_phone) {
              const smsMessage = `Payment is not done, your booking has been cancelled. உங்கள் பணம் செலுத்தப்படவில்லை, உங்கள் முன்பதிவு ரத்து செய்யப்பட்டது. - இளையான்குடி பள்ளிவாசல்`;
              
              const smsResult = await sendSms(request.applicant_phone, smsMessage);
              
              if (smsResult.success) {
                results.notificationsSent++;
                console.log(`SMS sent to ${request.applicant_phone}`);
              } else {
                console.error(`Failed to send SMS to ${request.applicant_phone}:`, smsResult.error);
                results.errors.push(`Failed to send SMS to ${request.applicant_phone}`);
              }
            }

            // Create admin notification
            await supabase.from("admin_notifications").insert({
              type: "booking_auto_cancelled",
              title: "முன்பதிவு தானியங்கி ரத்து (Booking Auto-Cancelled)",
              message: `${request.applicant_name} அவர்களின் முன்பதிவு ${timeoutHours} மணி நேரத்திற்குள் பணம் செலுத்தப்படாததால் ரத்து செய்யப்பட்டது. (Booking by ${request.applicant_name} auto-cancelled due to ${timeoutHours}-hour payment timeout)`,
              reference_id: request.reference_id,
              reference_type: "booking",
            });

          } catch (error) {
            console.error(`Error processing request ${request.id}:`, error);
            results.errors.push(`Error processing request ${request.id}: ${error}`);
          }
        }
      }
    }

    // ========================================
    // PART 2: Cancel pending bookings that haven't been approved within timeout
    // (Only bookings WITHOUT completed online payment)
    // ========================================
    const { data: expiredBookings, error: bookingFetchError } = await supabase
      .from("mahal_bookings")
      .select("*")
      .eq("status", "pending")
      .neq("payment_status", "completed")
      .lt("created_at", cutoffTime);

    if (bookingFetchError) {
      console.error("Error fetching expired bookings:", bookingFetchError);
      results.errors.push(`Failed to fetch expired bookings: ${bookingFetchError.message}`);
    } else {
      console.log(`Found ${expiredBookings?.length || 0} expired pending bookings`);

      if (expiredBookings && expiredBookings.length > 0) {
        for (const booking of expiredBookings) {
          results.processed++;
          
          try {
            // Cancel the booking
            const { error: cancelError } = await supabase
              .from("mahal_bookings")
              .update({
                status: "cancelled",
                payment_status: "expired",
                admin_notes: `Auto-cancelled: Booking not approved within ${timeoutHours} hours`,
              })
              .eq("id", booking.id);

            if (cancelError) {
              console.error(`Error cancelling booking ${booking.id}:`, cancelError);
              results.errors.push(`Failed to cancel booking ${booking.id}`);
              continue;
            }

            results.cancelled++;
            console.log(`Cancelled pending booking ${booking.id}`);

            // Also expire any associated pending cash payment requests
            await supabase
              .from("cash_payment_requests")
              .update({
                status: "expired",
                admin_notes: `Auto-cancelled: Booking not approved within ${timeoutHours} hours`,
                processed_at: new Date().toISOString(),
              })
              .eq("reference_id", booking.id)
              .eq("status", "pending");

            // Send SMS notification to the applicant
            if (booking.applicant_phone) {
              const smsMessage = `Payment is not done, your booking has been cancelled. உங்கள் பணம் செலுத்தப்படவில்லை, உங்கள் முன்பதிவு ரத்து செய்யப்பட்டது. - இளையான்குடி பள்ளிவாசல்`;
              
              const smsResult = await sendSms(booking.applicant_phone, smsMessage);
              
              if (smsResult.success) {
                results.notificationsSent++;
                console.log(`SMS sent to ${booking.applicant_phone}`);
              } else {
                console.error(`Failed to send SMS to ${booking.applicant_phone}:`, smsResult.error);
                results.errors.push(`Failed to send SMS to ${booking.applicant_phone}`);
              }
            }

            // Create admin notification
            await supabase.from("admin_notifications").insert({
              type: "booking_auto_cancelled",
              title: "முன்பதிவு தானியங்கி ரத்து (Booking Auto-Cancelled)",
              message: `${booking.applicant_name} அவர்களின் முன்பதிவு ${timeoutHours} மணி நேரத்திற்குள் அங்கீகரிக்கப்படாததால் ரத்து செய்யப்பட்டது. (Booking by ${booking.applicant_name} auto-cancelled: not approved within ${timeoutHours} hours)`,
              reference_id: booking.id,
              reference_type: "booking",
            });

          } catch (error) {
            console.error(`Error processing booking ${booking.id}:`, error);
            results.errors.push(`Error processing booking ${booking.id}: ${error}`);
          }
        }
      }
    }

    console.log("Auto-cancel results:", results);

    return new Response(
      JSON.stringify({ message: "Auto-cancel process completed", results }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in auto-cancel function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
