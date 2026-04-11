import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DirectoryRole = "user" | "member" | "admin" | "superadmin";

const rolePriority: DirectoryRole[] = ["superadmin", "admin", "member", "user"];

const pickHighestRole = (roles?: string[]): DirectoryRole => {
  if (!roles?.length) return "user";

  for (const role of rolePriority) {
    if (roles.includes(role)) return role;
  }

  return "user";
};

const getMetadataValue = (metadata: Record<string, unknown> | undefined, key: string) => {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const {
      data: { user: callerUser },
      error: authError,
    } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !callerUser) {
      throw new Error("Unauthorized");
    }

    const { data: callerRoles, error: callerRolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .in("role", ["admin", "superadmin"]);

    if (callerRolesError) {
      throw callerRolesError;
    }

    if (!callerRoles?.length) {
      throw new Error("Only admins can view the user directory");
    }

    const authUsers: Array<Record<string, any>> = [];
    const perPage = 1000;

    for (let page = 1; ; page += 1) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });

      if (error) {
        throw error;
      }

      const users = data.users ?? [];
      authUsers.push(...users);

      if (users.length < perPage) break;
    }

    const [membersResult, rolesResult, profilesResult] = await Promise.all([
      adminClient
        .from("gb_members")
        .select("id, member_id, full_name, phone, email, auth_user_id, is_active, created_at"),
      adminClient.from("user_roles").select("user_id, role"),
      adminClient.from("profiles").select("id, full_name, phone, created_at"),
    ]);

    if (membersResult.error) throw membersResult.error;
    if (rolesResult.error) throw rolesResult.error;
    if (profilesResult.error) throw profilesResult.error;

    const authUsersById = new Map(authUsers.map((user) => [user.id, user]));
    const profilesById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
    const rolesByUserId = new Map<string, string[]>();

    for (const roleRow of rolesResult.data ?? []) {
      const existingRoles = rolesByUserId.get(roleRow.user_id) ?? [];
      existingRoles.push(roleRow.role);
      rolesByUserId.set(roleRow.user_id, existingRoles);
    }

    const users: Array<Record<string, unknown>> = [];
    const seenAuthUserIds = new Set<string>();

    for (const member of membersResult.data ?? []) {
      const authUser = member.auth_user_id ? authUsersById.get(member.auth_user_id) : null;
      const metadata = (authUser?.user_metadata ?? authUser?.raw_user_meta_data ?? {}) as Record<string, unknown>;

      users.push({
        id: member.auth_user_id ?? member.id,
        member_record_id: member.id,
        auth_user_id: member.auth_user_id,
        member_id: member.member_id ?? getMetadataValue(metadata, "member_id") ?? "—",
        full_name: member.full_name ?? getMetadataValue(metadata, "full_name") ?? "Unknown User",
        phone: member.phone ?? getMetadataValue(metadata, "phone"),
        email: member.email ?? authUser?.email ?? null,
        is_active: member.is_active ?? true,
        created_at: member.created_at ?? authUser?.created_at ?? new Date().toISOString(),
        role: member.auth_user_id ? pickHighestRole(rolesByUserId.get(member.auth_user_id)) : "user",
        has_member_record: true,
        is_direct_user: false,
      });

      if (member.auth_user_id) {
        seenAuthUserIds.add(member.auth_user_id);
      }
    }

    for (const authUser of authUsers) {
      if (seenAuthUserIds.has(authUser.id)) continue;

      const profile = profilesById.get(authUser.id);
      const metadata = (authUser.user_metadata ?? authUser.raw_user_meta_data ?? {}) as Record<string, unknown>;

      users.push({
        id: authUser.id,
        member_record_id: null,
        auth_user_id: authUser.id,
        member_id: getMetadataValue(metadata, "member_id") ?? "—",
        full_name:
          profile?.full_name ??
          getMetadataValue(metadata, "full_name") ??
          authUser.email ??
          "Unknown User",
        phone: profile?.phone ?? getMetadataValue(metadata, "phone"),
        email: authUser.email ?? null,
        is_active: true,
        created_at: profile?.created_at ?? authUser.created_at ?? new Date().toISOString(),
        role: pickHighestRole(rolesByUserId.get(authUser.id)),
        has_member_record: false,
        is_direct_user: true,
      });
    }

    users.sort(
      (a, b) =>
        new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime(),
    );

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in admin-user-directory:", error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});