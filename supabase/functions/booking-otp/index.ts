import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Format phone number for Twilio (add +91 if needed for Indian numbers)
const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (!cleaned.startsWith("+")) {
    return `+${cleaned}`;
  }
  return cleaned;
};

// Send OTP via SMS using Twilio
const sendSMS = async (phone: string, otp: string): Promise<boolean> => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error("Twilio credentials not configured");
    return false;
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);
    const message = `Your Mahal Booking OTP is: ${otp}. Valid for 10 minutes. இளையான்குடி பள்ளிவாசல்`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: TWILIO_PHONE_NUMBER,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Twilio SMS error:", error);
      return false;
    }

    console.log(`SMS sent successfully to ${formattedPhone}`);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
};

// Send OTP via Email using Resend
const sendEmail = async (email: string, otp: string, recipientName: string): Promise<boolean> => {
  if (!RESEND_API_KEY) {
    console.error("Resend API key not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Masjid Portal <noreply@inpt-webportal-test.lovable.app>",
        to: [email],
        subject: `OTP for Mahal Booking - ${otp}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1a5f4a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0;">இளையான்குடி பள்ளிவாசல்</h2>
              <p style="margin: 5px 0 0 0;">Ilaiyankudi Pallivasal</p>
            </div>
            <div style="padding: 30px; background-color: #f9f9f9; border-radius: 0 0 8px 8px;">
              <p>Dear ${recipientName},</p>
              <p>Your One-Time Password (OTP) for Mahal Booking verification is:</p>
              <div style="background-color: #1a5f4a; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="color: #666; font-size: 14px;">This OTP is valid for 10 minutes. Do not share this code with anyone.</p>
              <p style="color: #666; font-size: 14px;">If you did not request this OTP, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="color: #999; font-size: 12px; text-align: center;">This is an automated email from Ilaiyankudi Pallivasal Masjid Portal.</p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend email error:", error);
      return false;
    }

    console.log(`Email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

interface SendOTPRequest {
  action: "send";
  phone: string;
  email?: string;
  recipientName: string;
}

interface VerifyOTPRequest {
  action: "verify";
  phone: string;
  otp: string;
}

type OTPRequest = SendOTPRequest | VerifyOTPRequest;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body: OTPRequest = await req.json();

    if (body.action === "send") {
      const { phone, email, recipientName } = body as SendOTPRequest;

      if (!phone) {
        return new Response(
          JSON.stringify({ success: false, error: "Phone number is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Clean up expired tokens
      try {
        await supabase.rpc("cleanup_expired_otp_tokens");
      } catch (e) {
        // Ignore cleanup errors
      }

      // Check if there's a recent OTP for this phone (rate limiting - 1 per minute)
      const { data: recentOtp } = await supabase
        .from("booking_otp_tokens")
        .select("created_at")
        .eq("phone", phone)
        .gte("created_at", new Date(Date.now() - 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentOtp) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Please wait 1 minute before requesting another OTP",
            rateLimited: true 
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Generate OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      const { error: insertError } = await supabase
        .from("booking_otp_tokens")
        .insert({
          phone,
          email: email || null,
          otp_code: otp,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Error storing OTP:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to generate OTP" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Try sending via SMS first
      let sentViaSMS = await sendSMS(phone, otp);
      let sentViaEmail = false;
      let deliveryMethod = "sms";

      // If SMS fails and email is provided, try email
      if (!sentViaSMS && email) {
        sentViaEmail = await sendEmail(email, otp, recipientName);
        deliveryMethod = "email";
      }

      if (!sentViaSMS && !sentViaEmail) {
        // Both failed - clean up the token
        await supabase
          .from("booking_otp_tokens")
          .delete()
          .eq("phone", phone)
          .eq("otp_code", otp);

        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Failed to send OTP. Please check your phone number and try again." 
          }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `OTP sent successfully via ${deliveryMethod}`,
          deliveryMethod,
          expiresIn: 600 // 10 minutes in seconds
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (body.action === "verify") {
      const { phone, otp } = body as VerifyOTPRequest;

      if (!phone || !otp) {
        return new Response(
          JSON.stringify({ success: false, error: "Phone and OTP are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Find the OTP token
      const { data: tokenData, error: findError } = await supabase
        .from("booking_otp_tokens")
        .select("*")
        .eq("phone", phone)
        .eq("otp_code", otp)
        .gt("expires_at", new Date().toISOString())
        .is("verified_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (findError) {
        console.error("Error finding OTP:", findError);
        return new Response(
          JSON.stringify({ success: false, error: "Verification failed" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!tokenData) {
        // Check if there's an expired or used token
        const { data: expiredToken } = await supabase
          .from("booking_otp_tokens")
          .select("*")
          .eq("phone", phone)
          .eq("otp_code", otp)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (expiredToken) {
          if (expiredToken.verified_at) {
            return new Response(
              JSON.stringify({ success: false, error: "This OTP has already been used" }),
              { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          if (new Date(expiredToken.expires_at) < new Date()) {
            return new Response(
              JSON.stringify({ success: false, error: "OTP has expired. Please request a new one." }),
              { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
        }

        // Increment attempt count for rate limiting
        await supabase
          .from("booking_otp_tokens")
          .update({ attempts: (tokenData?.attempts || 0) + 1 })
          .eq("phone", phone)
          .is("verified_at", null)
          .gt("expires_at", new Date().toISOString());

        return new Response(
          JSON.stringify({ success: false, error: "Invalid OTP. Please try again." }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check max attempts (5 attempts)
      if (tokenData.attempts >= 5) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Too many failed attempts. Please request a new OTP.",
            maxAttemptsReached: true
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Mark OTP as verified
      const { error: updateError } = await supabase
        .from("booking_otp_tokens")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", tokenData.id);

      if (updateError) {
        console.error("Error marking OTP as verified:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Verification failed" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "OTP verified successfully" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

  } catch (error: any) {
    console.error("Error in booking-otp function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
