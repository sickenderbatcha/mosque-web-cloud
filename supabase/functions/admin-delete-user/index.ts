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
      .in("role", ["admin", "superadmin"]);

    if (!roleData?.length) {
      throw new Error("Only admins can delete user accounts");
    }

    const { memberId, userId } = await req.json();

    if (!memberId && !userId) {
      throw new Error("Member ID or user ID is required");
    }

    console.log("Admin user deletion requested for:", memberId || userId);

    let authUserId: string | null = null;
    let fullName = "User";
    let resolvedMemberId: string | null = null;
    let hasMemberRecord = false;

    if (memberId) {
      const { data: member, error: memberError } = await supabase
        .from("gb_members")
        .select("member_id, full_name, auth_user_id")
        .eq("member_id", memberId)
        .maybeSingle();

      if (memberError) {
        console.error("Error fetching member:", memberError);
        throw new Error("Failed to find member");
      }

      if (member?.auth_user_id) {
        authUserId = member.auth_user_id;
        fullName = member.full_name;
        resolvedMemberId = member.member_id;
        hasMemberRecord = true;
      }
    }

    if (!authUserId && userId) {
      const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(userId);

      if (authUserError || !authUserData.user) {
        console.error("Error fetching auth user:", authUserError);
        throw new Error("User not found");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", userId)
        .maybeSingle();

      const metadata = authUserData.user.user_metadata ?? {};

      authUserId = authUserData.user.id;
      fullName =
        profile?.full_name ||
        (typeof metadata.full_name === "string" ? metadata.full_name : null) ||
        authUserData.user.email ||
        "User";
      resolvedMemberId = typeof metadata.member_id === "string" ? metadata.member_id : null;
    }

    if (!authUserId) {
      throw new Error("User not found");
    }

    // Prevent deleting the admin's own account
    if (authUserId === adminUser.id) {
      throw new Error("You cannot delete your own account");
    }

    // Check if the user being deleted is also an admin
    const { data: targetRoleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUserId)
      .in("role", ["admin", "superadmin"]);

    if (targetRoleData?.length) {
      throw new Error("Cannot delete another admin's account. Please demote them first.");
    }

    // Unlink the auth_user_id from the member record first
    if (hasMemberRecord && resolvedMemberId) {
      const { error: unlinkError } = await supabase
        .from("gb_members")
        .update({ auth_user_id: null })
        .eq("member_id", resolvedMemberId);

      if (unlinkError) {
        console.error("Error unlinking member:", unlinkError);
        throw new Error("Failed to unlink member account");
      }
    }

    // Delete user roles
    const { error: rolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", authUserId);

    if (rolesError) {
      console.error("Error deleting user roles:", rolesError);
      // Continue even if roles deletion fails
    }

    const { error: profileDeleteError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", authUserId);

    if (profileDeleteError) {
      console.error("Error deleting profile:", profileDeleteError);
    }

    // Delete the auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(authUserId);

    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      throw new Error("Failed to delete user account");
    }

    console.log("User account deleted successfully for:", memberId || userId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User account for ${fullName} has been deleted successfully.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in admin-delete-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
