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
  profiles: [], // skip entirely — tied to auth.users
  user_roles: [], // skip entirely — tied to auth.users
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

// Restore order: parent tables first, then dependents
const RESTORE_ORDER = [
  "app_settings",
  "landing_page_content",
  "management_committee",
  "gb_members",
  "gb_family_members",
  "announcements",
  "events",
  "event_registrations",
  "gallery_images",
  "admin_notifications",
  "admin_pdf_documents",
  "death_registers",
  "marriage_registers",
  "outside_marriage_registers",
  "donations",
  "subscriptions",
  "subscription_slots",
  "certificate_payments",
  "heir_certificates",
  "noc_certificates",
  "mahal_bookings",
  "refund_requests",
  "cash_payment_requests",
  "grievances",
  "expenses",
  "income",
  "issued_documents",
  "pending_users",
  "quran_bookmarks",
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
    const user = { id: claimsData.claims.sub as string, email: claimsData.claims.email as string };

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
    const { action, fileName } = body;

    // Action: list
    if (action === "list") {
      const { data: files, error: listError } = await adminClient.storage
        .from("database-backups")
        .list("", { sortBy: { column: "created_at", order: "desc" }, limit: 20 });

      if (listError) {
        return new Response(JSON.stringify({ error: listError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const backups = (files || [])
        .filter((f: any) => f.name.endsWith(".json"))
        .map((f: any) => ({
          name: f.name,
          created_at: f.created_at,
          size: f.metadata?.size || 0,
        }));

      return new Response(JSON.stringify({ backups }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: restore
    if (action === "restore") {
      if (!fileName) {
        return new Response(JSON.stringify({ error: "fileName is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: fileData, error: downloadError } = await adminClient.storage
        .from("database-backups")
        .download(fileName);

      if (downloadError || !fileData) {
        return new Response(
          JSON.stringify({ error: "Failed to download backup: " + (downloadError?.message || "File not found") }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const text = await fileData.text();
      let backupData: any;
      try {
        backupData = JSON.parse(text);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON in backup file" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!backupData.data || typeof backupData.data !== "object") {
        return new Response(JSON.stringify({ error: "Invalid backup format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const availableTables = Object.keys(backupData.data);
      // Restore in defined order, then any remaining tables
      const orderedTables = [
        ...RESTORE_ORDER.filter(t => availableTables.includes(t)),
        ...availableTables.filter(t => !RESTORE_ORDER.includes(t)),
      ];

      const results: Record<string, { success: number; errors: number; message?: string }> = {};
      let totalSuccess = 0;
      let totalErrors = 0;

      for (const table of orderedTables) {
        // Skip tables that are entirely auth.users dependent
        if (SKIP_TABLES.includes(table)) {
          results[table] = { success: 0, errors: 0, message: "Skipped (auth-dependent)" };
          continue;
        }

        const rows = backupData.data[table];
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
          results[table] = { success: 0, errors: 0, message: "No data" };
          continue;
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
          results[table] = error
            ? { success: 0, errors: 1, message: error.message }
            : { success: 1, errors: 0 };
          if (!error) totalSuccess += 1;
          else totalErrors += 1;
          continue;
        }

        // Delete existing data first, then insert (proper restore)
        const { error: deleteError } = await adminClient.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (deleteError) {
          console.error(`Error deleting ${table}:`, deleteError.message);
        }

        let tableSuccess = 0;
        let tableErrors = 0;
        let lastError = "";
        const batchSize = 500;

        for (let i = 0; i < cleanedRows.length; i += batchSize) {
          const batch = cleanedRows.slice(i, i + batchSize);
          const { error } = await adminClient.from(table).insert(batch);

          if (error) {
            console.error(`Error restoring ${table} batch ${i}:`, error.message);
            tableErrors += batch.length;
            lastError = error.message;
          } else {
            tableSuccess += batch.length;
          }
        }

        results[table] = { success: tableSuccess, errors: tableErrors, message: lastError || undefined };
        totalSuccess += tableSuccess;
        totalErrors += tableErrors;
      }

      return new Response(
        JSON.stringify({
          status: totalErrors === 0 ? "success" : "partial",
          restored_by: user.email || user.id,
          restored_at: new Date().toISOString(),
          total_success: totalSuccess,
          total_errors: totalErrors,
          details: results,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: upload
    if (action === "upload") {
      const { backupJson, uploadFileName } = body;
      if (!backupJson || !uploadFileName) {
        return new Response(JSON.stringify({ error: "backupJson and uploadFileName are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const blob = new Blob([JSON.stringify(backupJson)], { type: "application/json" });
      const { error: uploadError } = await adminClient.storage
        .from("database-backups")
        .upload(uploadFileName, blob, { upsert: true, contentType: "application/json" });

      if (uploadError) {
        return new Response(JSON.stringify({ error: "Upload failed: " + uploadError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, fileName: uploadFileName }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'list', 'upload', or 'restore'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
