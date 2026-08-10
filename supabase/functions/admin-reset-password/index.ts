import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";


// Initialize Resend for email
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Twilio credentials
const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
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
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the requesting user is an admin
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user: adminUser }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !adminUser) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .in("role", ["admin", "superadmin"])
      .maybeSingle();

    if (!roleData) {
      throw new Error("Only admins can reset passwords");
    }

    const { memberId, userId } = await req.json();

    if (!memberId && !userId) {
      throw new Error("Member ID or user ID is required");
    }

    console.log("Admin password reset requested for user:", memberId || userId);

    let account: {
      member_id: string | null;
      full_name: string;
      email: string | null;
      phone: string | null;
      auth_user_id: string;
    } | null = null;

    if (memberId) {
      const { data: member, error: memberError } = await supabase
        .from("gb_members")
        .select("member_id, full_name, email, phone, auth_user_id")
        .eq("member_id", memberId)
        .maybeSingle();

      if (memberError) {
        console.error("Error fetching member:", memberError);
        throw new Error("Failed to find member");
      }

      if (member?.auth_user_id) {
        account = {
          member_id: member.member_id,
          full_name: member.full_name,
          email: member.email,
          phone: member.phone,
          auth_user_id: member.auth_user_id,
        };
      }
    }

    if (!account && userId) {
      const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(userId);

      if (authUserError || !authUserData.user) {
        console.error("Error fetching auth user:", authUserError);
        throw new Error("User not found");
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      const metadata = authUserData.user.user_metadata ?? {};

      account = {
        member_id: typeof metadata.member_id === "string" ? metadata.member_id : null,
        full_name:
          profile?.full_name ||
          (typeof metadata.full_name === "string" ? metadata.full_name : null) ||
          authUserData.user.email ||
          "User",
        email: authUserData.user.email ?? null,
        phone:
          profile?.phone ||
          (typeof metadata.phone === "string" ? metadata.phone : null),
        auth_user_id: authUserData.user.id,
      };
    }

    if (!account?.auth_user_id) {
      throw new Error("User not found");
    }

    // Generate new password
    const newPassword = generatePassword();

    // Update the password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      account.auth_user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("Failed to reset password");
    }

    console.log("Password reset successful for user:", memberId || userId);

    // Send notifications with new password
    const resetMessage = `Assalamu Alaikum ${account.full_name}! Your password has been reset by the administrator. Your new temporary password is: ${newPassword}. Please login and change your password immediately.`;

    let notificationSent = false;

    // Try SMS first
    if (account.phone) {
      notificationSent = await sendSMS(account.phone, resetMessage);
    }

    // Also try email if available
    if (account.email) {
      const emailSent = await sendEmail(
        account.email,
        "Password Reset by Admin - Mosque Portal",
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">Password Reset</h2>
          <p>Assalamu Alaikum ${account.full_name},</p>
          <p>Your password has been reset by the administrator.</p>
          <p>Your new temporary password is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #16a34a;">${newPassword}</span>
          </div>
          <p><strong>Please login and change your password immediately.</strong></p>
          <p style="color: #666;">If you didn't expect this password reset, please contact the mosque administration.</p>
          <p>JazakAllah Khair,<br>Mosque Administration</p>
        </div>
        `
      );
      notificationSent = notificationSent || emailSent;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Password reset successful.`,
        newPassword,
        notificationSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in admin-reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
