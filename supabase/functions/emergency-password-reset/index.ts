import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, newPassword, secretKey } = await req.json();
    
    // Security check using environment variable
    const expectedKey = Deno.env.get("EMERGENCY_RESET_SECRET_KEY");
    if (!expectedKey || secretKey !== expectedKey) {
      throw new Error("Invalid secret key");
    }

    if (!userId || !newPassword) {
      throw new Error("User ID and new password are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Emergency password reset for user:", userId);

    // Update the password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("Failed to reset password: " + updateError.message);
    }

    console.log("Password reset successful for user:", userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset successful"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in emergency-password-reset:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
