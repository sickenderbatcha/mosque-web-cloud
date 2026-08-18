import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export interface AuthResult {
  userId: string | null;
  roles: string[];
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

/** Resolve the caller identity from the Authorization bearer token. */
export async function getCaller(req: Request): Promise<AuthResult> {
  const empty: AuthResult = { userId: null, roles: [], isAdmin: false, isSuperAdmin: false };
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return empty;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return empty;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return empty;

  const { data: roleRows } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  const roles = (roleRows || []).map((r: { role: string }) => r.role);
  return {
    userId: data.user.id,
    roles,
    isSuperAdmin: roles.includes("superadmin"),
    isAdmin: roles.includes("admin") || roles.includes("superadmin"),
  };
}

/** Returns a 401/403 Response when the caller is not signed in. */
export async function requireUser(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ caller: AuthResult; error: Response | null }> {
  const caller = await getCaller(req);
  if (!caller.userId) {
    return {
      caller,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  return { caller, error: null };
}

/** Returns a 401/403 Response when the caller is not an admin/superadmin. */
export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
  superAdminOnly = false,
): Promise<{ caller: AuthResult; error: Response | null }> {
  const caller = await getCaller(req);
  if (!caller.userId) {
    return {
      caller,
      error: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  const ok = superAdminOnly ? caller.isSuperAdmin : caller.isAdmin;
  if (!ok) {
    return {
      caller,
      error: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  return { caller, error: null };
}

/**
 * Scheduled/maintenance functions: require the shared cron secret header,
 * or an authenticated admin (so admins can trigger a run manually).
 */
export async function requireCronOrAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided =
    req.headers.get("x-cron-secret") || req.headers.get("X-Cron-Secret") || "";

  if (cronSecret && provided && provided === cronSecret) return null;

  const caller = await getCaller(req);
  if (caller.isAdmin) return null;

  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
