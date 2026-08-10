import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { memberId, phone } = await req.json();

    if (!memberId || !phone) {
      return new Response(
        JSON.stringify({ error: "Member ID and phone number are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find pending registration matching member_id AND phone (identity verification)
    const { data: pendingUser, error: fetchError } = await supabase
      .from("pending_users")
      .select("id, full_name, phone, created_at")
      .eq("member_id", memberId.toUpperCase())
      .eq("status", "pending")
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching pending user:", fetchError);
      throw new Error("Failed to check registration");
    }

    if (!pendingUser) {
      return new Response(
        JSON.stringify({ error: "No pending registration found for this membership number" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify phone number matches (identity check)
    if (pendingUser.phone !== phone) {
      return new Response(
        JSON.stringify({ error: "Phone number does not match our records" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete the pending registration using service role (bypasses RLS)
    const { error: deleteError } = await supabase
      .from("pending_users")
      .delete()
      .eq("id", pendingUser.id)
      .eq("status", "pending");

    if (deleteError) {
      console.error("Error deleting pending user:", deleteError);
      throw new Error("Failed to cancel registration");
    }

    console.log("Registration cancelled for member:", memberId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Registration cancelled successfully",
        details: {
          full_name: pendingUser.full_name,
          phone: pendingUser.phone,
          created_at: pendingUser.created_at,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in cancel-registration:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
