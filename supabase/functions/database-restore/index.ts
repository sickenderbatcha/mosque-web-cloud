import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Columns that reference auth.users and should be nulled out during restore
const AUTH_USER_FK_COLUMNS: Record<string, string[]> = {
  admin_pdf_documents: ["uploaded_by"],
  cash_payment_requests: ["user_id", "processed_by"],
  events: ["created_by"],
  gb_members: ["auth_user_id", "user_id"],
  grievances: ["user_id"],
  heir_certificates: ["user_id", "approved_by"],
  mahal_bookings: ["user_id"],
  noc_certificates: ["user_id", "approved_by"],
  pending_users: ["reviewed_by"],
  refund_requests: ["processed_by"],
  expenses: ["created_by", "approved_by"],
  income: ["created_by"],
  death_registers: ["created_by"],
  marriage_registers: ["created_by"],
  announcements: ["created_by"],
  gallery_images: ["created_by"],
};

// Tables to skip entirely (they reference auth.users as PK/unique)
const SKIP_TABLES = ["profiles", "user_roles"];

// Tables that are single-row with no PK — handle specially
const SINGLE_ROW_TABLES = ["visitor_stats"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: claimsData.claims.sub as string };

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData || !["admin", "superadmin"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { table, rows } = body;

    if (!table || !rows || !Array.isArray(rows)) {
      return new Response(
        JSON.stringify({ error: "Invalid request. Expected { table, rows }" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ table, success: 0, errors: 0, message: "No data" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Skip auth-dependent tables
    if (SKIP_TABLES.includes(table)) {
      return new Response(
        JSON.stringify({ table, success: 0, errors: 0, message: "Skipped (auth-dependent)" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Null out auth.users FK columns
    const fkCols = AUTH_USER_FK_COLUMNS[table];
    const cleanedRows = fkCols && fkCols.length > 0
      ? rows.map((row: any) => {
          const cleaned = { ...row };
          for (const col of fkCols) {
            cleaned[col] = null;
          }
          return cleaned;
        })
      : rows;

    // Handle single-row tables (no PK)
    if (SINGLE_ROW_TABLES.includes(table)) {
      const { error } = await adminClient.from(table).upsert(cleanedRows[0]);
      if (error) {
        return new Response(
          JSON.stringify({ table, success: 0, errors: 1, message: error.message }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ table, success: 1, errors: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing data first, then insert (proper restore)
    const { error: deleteError } = await adminClient.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) {
      console.error(`Error deleting ${table}:`, deleteError.message);
    }

    let successCount = 0;
    let errorCount = 0;
    let lastError = "";
    const batchSize = 500;

    for (let i = 0; i < cleanedRows.length; i += batchSize) {
      const batch = cleanedRows.slice(i, i + batchSize);
      const { error } = await adminClient.from(table).insert(batch);

      if (error) {
        console.error(`Error restoring ${table} batch ${i}:`, error.message);
        errorCount += batch.length;
        lastError = error.message;
      } else {
        successCount += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        table,
        success: successCount,
        errors: errorCount,
        message: lastError || undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
