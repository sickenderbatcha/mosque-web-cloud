import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Must be an authenticated superadmin (in addition to the shared secret)
    const { caller, error: authError } = await requireAdmin(req, corsHeaders, true);
    if (authError) return authError;

    const { userId, newPassword, secretKey } = await req.json();

    // Second factor: shared break-glass secret
    const expectedKey = Deno.env.get("EMERGENCY_RESET_SECRET_KEY");
    if (!expectedKey || secretKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: "Invalid secret key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId || typeof userId !== "string" || !newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "A valid user ID and a password of at least 8 characters are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Emergency password reset failed");
      return new Response(
        JSON.stringify({ error: "Failed to reset password" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audit trail
    try {
      await supabase.from("admin_audit_logs").insert({
        performed_by: caller.userId,
        action_type: "emergency_password_reset",
        action_description: "Emergency password reset performed via break-glass endpoint",
        target_table: "auth.users",
        target_id: userId,
        target_details: {},
      });
    } catch (e) {
      console.error("Failed to write audit log for emergency reset");
    }

    // Best-effort notification to the affected account owner
    try {
      const { data: target } = await supabase.auth.admin.getUserById(userId);
      const targetEmail = target?.user?.email;
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (targetEmail && resendKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Masjid Security <onboarding@resend.dev>",
            to: [targetEmail],
            subject: "Your account password was reset by an administrator",
            html: "<p>Your account password was reset by an administrator. If you did not request this, please contact the masjid office immediately.</p>",
          }),
        });
      }
    } catch (e) {
      console.error("Failed to notify user about emergency reset");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Password reset successful" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in emergency-password-reset");
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
