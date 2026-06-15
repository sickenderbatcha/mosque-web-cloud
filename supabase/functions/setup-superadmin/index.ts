import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate a secure random password
function generateSecurePassword(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { secretKey } = await req.json();
    
    // Security check using environment variable
    const expectedKey = Deno.env.get("SUPERADMIN_SETUP_SECRET_KEY");
    if (!expectedKey || secretKey !== expectedKey) {
      console.error("Invalid setup key attempt for superadmin setup");
      throw new Error("Invalid setup key");
    }

    // Generate a secure random password instead of using hardcoded one
    const securePassword = generateSecurePassword();

    // Check if superadmin auth user already exists
    const { data: existingMember } = await supabase
      .from("gb_members")
      .select("auth_user_id")
      .eq("member_id", "SUPUSR")
      .maybeSingle();

    if (existingMember?.auth_user_id) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingMember.auth_user_id,
        { password: securePassword }
      );
      
      if (updateError) {
        throw new Error(`Failed to reset superadmin password: ${updateError.message}`);
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "Superadmin password has been reset.", password: securePassword }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create superadmin member if not exists
    await supabase
      .from("gb_members")
      .upsert({
        member_id: "SUPUSR",
        full_name: "Super Administrator",
        phone: "0000000001",
        is_active: true,
        email: "supusr@mosque.local",
        father_name: "System",
        date_of_marriage: "2024-01-01",
      }, { onConflict: "member_id" });

    let authUserId: string;
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: "supusr@mosque.local",
      password: securePassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Super Administrator",
        member_id: "SUPUSR",
      },
    });

    if (createError) {
      if (!createError.message.includes("already been registered")) {
        throw new Error(`Failed to create superadmin user: ${createError.message}`);
      }
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw new Error(`Failed to list users: ${listError.message}`);
      const existing = listData.users.find((u) => u.email === "supusr@mosque.local");
      if (!existing) throw new Error("Superadmin auth user not found after conflict");
      authUserId = existing.id;
      await supabase.auth.admin.updateUserById(authUserId, { password: securePassword });
    } else {
      authUserId = authData.user.id;
    }

    await supabase
      .from("gb_members")
      .update({ auth_user_id: authUserId })
      .eq("member_id", "SUPUSR");

    await supabase
      .from("user_roles")
      .upsert({
        user_id: authUserId,
        role: "superadmin",
      }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Superadmin user created successfully. Login with membership number: SUPUSR",
        password: securePassword
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in setup-superadmin function:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Setup failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
