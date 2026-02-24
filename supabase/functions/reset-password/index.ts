import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      throw new Error("Token and new password are required");
    }

    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    console.log("Password reset attempt with token:", token);

    // Find the token
    const { data: resetToken, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token.toUpperCase())
      .is("used_at", null)
      .maybeSingle();

    if (tokenError) {
      console.error("Error fetching token:", tokenError);
      throw new Error("Failed to verify reset code");
    }

    if (!resetToken) {
      throw new Error("Invalid or expired reset code");
    }

    // Check if token is expired
    if (new Date(resetToken.expires_at) < new Date()) {
      throw new Error("Reset code has expired. Please request a new one.");
    }

    // Get member's auth user ID
    const { data: member, error: memberError } = await supabase
      .from("gb_members")
      .select("auth_user_id, full_name")
      .eq("member_id", resetToken.member_id)
      .maybeSingle();

    if (memberError || !member || !member.auth_user_id) {
      console.error("Error fetching member:", memberError);
      throw new Error("Member account not found");
    }

    // Update the password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      member.auth_user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("Failed to update password");
    }

    // Mark token as used
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", resetToken.id);

    console.log("Password reset successful for member:", resetToken.member_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset successful! You can now login with your new password." 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
