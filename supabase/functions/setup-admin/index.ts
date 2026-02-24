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

    const { secretKey } = await req.json();
    
    // Security check using environment variable
    const expectedKey = Deno.env.get("ADMIN_SETUP_SECRET_KEY");
    if (!expectedKey || secretKey !== expectedKey) {
      throw new Error("Invalid setup key");
    }

    // Check if admin auth user already exists
    const { data: existingMember } = await supabase
      .from("gb_members")
      .select("auth_user_id")
      .eq("member_id", "ADMIN")
      .maybeSingle();

    if (existingMember?.auth_user_id) {
      // Admin exists, reset password instead
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingMember.auth_user_id,
        { password: "admin123" }
      );
      
      if (updateError) {
        throw new Error(`Failed to reset admin password: ${updateError.message}`);
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "Admin password reset to: admin123" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin member if not exists
    await supabase
      .from("gb_members")
      .upsert({
        member_id: "ADMIN",
        full_name: "System Administrator",
        phone: "0000000000",
        is_active: true,
        email: "admin@mosque.local",
      }, { onConflict: "member_id" });

    // Try to create auth user; if already exists, look it up instead
    let authUserId: string;
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: "admin@mosque.local",
      password: "admin123",
      email_confirm: true,
      user_metadata: {
        full_name: "System Administrator",
        member_id: "ADMIN",
      },
    });

    if (createError) {
      if (!createError.message.includes("already been registered")) {
        throw new Error(`Failed to create admin user: ${createError.message}`);
      }
      // User already exists — find and reset password
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw new Error(`Failed to list users: ${listError.message}`);
      const existing = listData.users.find((u) => u.email === "admin@mosque.local");
      if (!existing) throw new Error("Admin auth user not found after conflict");
      authUserId = existing.id;
      // Reset password
      await supabase.auth.admin.updateUserById(authUserId, { password: "admin123" });
    } else {
      authUserId = authData.user.id;
    }

    // Link auth user to member
    await supabase
      .from("gb_members")
      .update({ auth_user_id: authUserId })
      .eq("member_id", "ADMIN");

    // Add admin role
    await supabase
      .from("user_roles")
      .upsert({
        user_id: authUserId,
        role: "admin",
      }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin user created successfully. Login with membership number: ADMIN, password: admin123" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in setup-admin function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
