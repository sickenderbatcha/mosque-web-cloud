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

function generateTempPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

async function sendSMS(to: string, message: string) {
  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.log("Twilio credentials not configured, skipping SMS");
    return;
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
    } else {
      console.log("SMS sent successfully to:", formattedPhone);
    }
  } catch (error) {
    console.error("Failed to send SMS:", error);
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
    } else {
      console.log("Email sent successfully to:", to);
    }
  } catch (error) {
    console.error("Failed to send email:", error);
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

    // Check if user is admin or superadmin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .in("role", ["admin", "superadmin"])
      .maybeSingle();

    if (!roleData) {
      throw new Error("Only admins can approve users");
    }

    const { pendingUserId, action, adminNotes } = await req.json();

    if (!pendingUserId || !action) {
      throw new Error("Missing required fields");
    }

    // Get pending user
    const { data: pendingUser, error: fetchError } = await supabase
      .from("pending_users")
      .select("*")
      .eq("id", pendingUserId)
      .single();

    if (fetchError || !pendingUser) {
      throw new Error("Pending user not found");
    }

    // Get member details for email
    const { data: member } = await supabase
      .from("gb_members")
      .select("email, phone")
      .eq("member_id", pendingUser.member_id)
      .maybeSingle();

    // Special accounts that bypass gb_members validation
    const specialAccounts = ["ADMIN", "SUPUSR"];
    const isSpecialAccount = specialAccounts.includes(pendingUser.member_id.toUpperCase());

    if (action === "approve") {
      // Verify member exists in gb_members (skip for special accounts)
      if (!member && !isSpecialAccount) {
        throw new Error("Member not found in records");
      }

      // Generate a secure temporary password (never store plaintext passwords)
      const tempPassword = generateTempPassword(12);

      // Create auth user with the generated temporary password
      const userEmail = `${pendingUser.member_id.toLowerCase()}@mosque.local`;
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: pendingUser.full_name,
          member_id: pendingUser.member_id,
        },
      });

      let userId: string;

      if (createError) {
        // If user already exists, find and update them instead
        if (createError.message.includes("already been registered")) {
          const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
          if (listError) throw new Error(`Failed to list users: ${listError.message}`);
          
          const existingUser = listData.users.find((u: any) => u.email === userEmail);
          if (!existingUser) throw new Error("User email conflict but user not found");
          
          // Update with new temporary password
          await supabase.auth.admin.updateUserById(existingUser.id, {
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: pendingUser.full_name,
              member_id: pendingUser.member_id,
            },
          });
          
          userId = existingUser.id;
        } else {
          throw new Error(`Failed to create user: ${createError.message}`);
        }
      } else {
        userId = authData.user.id;
      }

      // Link auth user to member
      await supabase
        .from("gb_members")
        .update({ auth_user_id: userId })
        .eq("member_id", pendingUser.member_id);

      // Update pending user status
      await supabase
        .from("pending_users")
        .update({
          status: "approved",
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser.id,
        })
        .eq("id", pendingUserId);

      // Create notification for approval
      await supabase
        .from("admin_notifications")
        .insert({
          type: "user_approved",
          title: "User Approved",
          message: `User ${pendingUser.full_name} (${pendingUser.member_id}) has been approved.`,
          reference_id: pendingUserId,
          reference_type: "pending_users",
          is_read: true,
        });

      // Send notifications with temp password to the user
      const safeName = pendingUser.full_name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const safeMemberId = pendingUser.member_id.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      const approvalMessage = `Assalamu Alaikum ${pendingUser.full_name}! Your account has been approved. Login with membership number: ${pendingUser.member_id} and temporary password: ${tempPassword} - Please change your password after first login.`;
      
      // Send SMS with temp password
      sendSMS(pendingUser.phone, approvalMessage);
      
      // Send email if available
      if (member?.email) {
        sendEmail(
          member.email,
          "Account Approved - Mosque Portal",
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Account Approved ✓</h2>
            <p>Assalamu Alaikum ${safeName},</p>
            <p>Your account registration has been <strong>approved</strong>.</p>
            <p>You can now login to the mosque portal using:</p>
            <ul>
              <li><strong>Membership Number:</strong> ${safeMemberId}</li>
              <li><strong>Temporary Password:</strong> ${tempPassword}</li>
            </ul>
            <p style="color: #dc2626; font-weight: bold;">⚠️ Please change your password immediately after your first login.</p>
            <p>JazakAllah Khair,<br>Mosque Administration</p>
          </div>
          `
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "User approved successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "reject") {
      // Update pending user status
      await supabase
        .from("pending_users")
        .update({
          status: "rejected",
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminUser.id,
        })
        .eq("id", pendingUserId);

      // Send rejection notifications
      const rejectionMessage = `Assalamu Alaikum ${pendingUser.full_name}, Your account registration was not approved. ${adminNotes ? "Reason: " + adminNotes : "Please contact the mosque administration for more details."}`;
      
      // Send SMS
      sendSMS(pendingUser.phone, rejectionMessage);
      
      // Send email if available
      if (member?.email) {
        const safeName = pendingUser.full_name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeNotes = adminNotes ? adminNotes.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
        sendEmail(
          member.email,
          "Account Registration Update - Mosque Portal",
          `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Registration Update</h2>
            <p>Assalamu Alaikum ${safeName},</p>
            <p>We regret to inform you that your account registration was not approved at this time.</p>
            ${safeNotes ? `<p><strong>Reason:</strong> ${safeNotes}</p>` : ""}
            <p>If you believe this is an error or need more information, please contact the mosque administration.</p>
            <p>JazakAllah Khair,<br>Mosque Administration</p>
          </div>
          `
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "User rejected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    console.error("Error in approve-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
