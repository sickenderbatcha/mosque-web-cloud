import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateTempPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user: callerUser }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !callerUser) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!roleData) throw new Error("Only superadmins can create direct users");

    const { fullName, memberId, phone } = await req.json();

    if (!fullName || !memberId || !phone) {
      throw new Error("Full name, member ID, and phone are required");
    }

    const tempPassword = generateTempPassword(12);
    const userEmail = `${memberId.toLowerCase()}@mosque.local`;

    // Create auth user
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        member_id: memberId,
      },
    });

    let userId: string;

    if (createError) {
      if (createError.message.includes("already been registered")) {
        throw new Error("A user with this member ID already exists");
      }
      throw new Error(`Failed to create user: ${createError.message}`);
    } else {
      userId = authData.user.id;
    }

    // Optionally link to gb_members if exists
    await supabase
      .from("gb_members")
      .update({ auth_user_id: userId })
      .eq("member_id", memberId);

    return new Response(
      JSON.stringify({
        success: true,
        message: "User created successfully",
        tempPassword,
        memberId,
        fullName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in create-direct-user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
