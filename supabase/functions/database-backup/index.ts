import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BACKUP_TABLES = [
  "admin_notifications",
  "admin_pdf_documents",
  "announcements",
  "app_settings",
  "asset_locations",
  "asset_maintenance_logs",
  "assets",
  "booking_otp_tokens",
  "cash_payment_requests",
  "certificate_payments",
  "death_registers",
  "donations",
  "event_registrations",
  "events",
  "expenses",
  "gallery_images",
  "gb_members",
  "gb_family_members",
  "grievances",
  "heir_certificates",
  "income",
  "issued_documents",
  "landing_page_content",
  "mahal_bookings",
  "management_committee",
  "marriage_registers",
  "noc_certificates",
  "outside_marriage_registers",
  "pending_users",
  "profiles",
  "quran_bookmarks",
  "receipt_sequences",
  "refund_requests",
  "rental_agreements",
  "rental_payments",
  "subscription_slots",
  "subscriptions",
  "user_roles",
  "visitor_stats",
];

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

    // Verify user is admin using their token
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
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

    // Fetch all tables using service role (bypasses RLS)
    const backupData: Record<string, unknown[]> = {};
    const errors: string[] = [];

    for (const table of BACKUP_TABLES) {
      try {
        // Fetch all rows — handle pagination for large tables
        let allRows: unknown[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await adminClient
            .from(table)
            .select("*")
            .range(from, from + pageSize - 1);

          if (error) {
            errors.push(`${table}: ${error.message}`);
            hasMore = false;
          } else {
            allRows = allRows.concat(data || []);
            hasMore = (data?.length || 0) === pageSize;
            from += pageSize;
          }
        }

        backupData[table] = allRows;
      } catch (e: unknown) {
        errors.push(`${table}: ${(e as Error).message}`);
      }
    }

    const backup = {
      version: "1.0",
      created_at: new Date().toISOString(),
      created_by: user.email || user.id,
      table_count: Object.keys(backupData).length,
      record_counts: Object.fromEntries(
        Object.entries(backupData).map(([k, v]) => [k, v.length])
      ),
      errors: errors.length > 0 ? errors : undefined,
      data: backupData,
    };

    return new Response(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
