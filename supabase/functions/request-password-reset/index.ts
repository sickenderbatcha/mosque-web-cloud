import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Initialize Resend for email
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Twilio credentials
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

function generateToken(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

async function sendSMS(to: string, message: string) {
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log("Twilio credentials not configured, skipping SMS");
    return false;
  }

  try {
    let formattedPhone = to;
    if (!to.startsWith("+")) {
      formattedPhone = "+91" + to.replace(/^0+/, "");
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: twilioPhoneNumber,
          Body: message,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio SMS error:", errorText);
      return false;
    }
    
    console.log("SMS sent successfully to:", formattedPhone);
    return true;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    return false;
  }
}

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const { error } = await resend.emails.send({
      from: "Mosque <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend email error:", error);
      return false;
    }
    
    console.log("Email sent successfully to:", to);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { memberId } = await req.json();

    if (!memberId) {
      throw new Error("Membership number is required");
    }

    console.log("Password reset requested for member:", memberId);

    // Check if member exists and has an auth account
    const { data: member, error: memberError } = await supabase
      .from("gb_members")
      .select("member_id, full_name, email, phone, auth_user_id")
      .eq("member_id", memberId.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (memberError) {
      console.error("Error fetching member:", memberError);
      throw new Error("Failed to verify member");
    }

    if (!member) {
      // Don't reveal if member exists or not for security
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "If this membership number exists, a reset code will be sent to the registered contact." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!member.auth_user_id) {
      // Member exists but has no account
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "If this membership number exists, a reset code will be sent to the registered contact." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate reset token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Invalidate any existing tokens for this member
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("member_id", member.member_id);

    // Create new token
    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        member_id: member.member_id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error creating reset token:", insertError);
      throw new Error("Failed to create reset token");
    }

    // Send notifications
    const resetMessage = `Assalamu Alaikum ${member.full_name}! Your password reset code is: ${token}. This code expires in 30 minutes. If you didn't request this, please ignore.`;

    let notificationSent = false;

    // Try SMS first
    if (member.phone) {
      notificationSent = await sendSMS(member.phone, resetMessage);
    }

    // Also try email if available
    if (member.email) {
      const emailSent = await sendEmail(
        member.email,
        "Password Reset Code - Mosque Portal",
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Password Reset Request</h2>
          <p>Assalamu Alaikum ${member.full_name},</p>
          <p>Your password reset code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #16a34a;">${token}</span>
          </div>
          <p>This code expires in <strong>30 minutes</strong>.</p>
          <p style="color: #666;">If you didn't request this password reset, please ignore this email.</p>
          <p>JazakAllah Khair,<br>Mosque Administration</p>
        </div>
        `
      );
      notificationSent = notificationSent || emailSent;
    }

    if (!notificationSent) {
      console.warn("No notification could be sent for member:", member.member_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "If this membership number exists, a reset code will be sent to the registered contact.",
        // Only in development: show the token for testing
        // token: token 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in request-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
