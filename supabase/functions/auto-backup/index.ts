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
  "refund_requests",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if backup schedule is enabled
    const { data: scheduleSetting } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "backup_schedule")
      .maybeSingle();

    const schedule = scheduleSetting?.value || "disabled";

    if (schedule === "disabled") {
      return new Response(
        JSON.stringify({ status: "skipped", reason: "Backup schedule is disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check last backup time
    const { data: lastBackupSetting } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "last_auto_backup")
      .maybeSingle();

    const lastBackup = lastBackupSetting?.value ? new Date(lastBackupSetting.value) : null;
    const now = new Date();

    if (lastBackup) {
      const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60);

      if (schedule === "daily" && hoursSinceLastBackup < 23) {
        return new Response(
          JSON.stringify({ status: "skipped", reason: "Daily backup already completed today" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (schedule === "weekly" && hoursSinceLastBackup < 167) {
        return new Response(
          JSON.stringify({ status: "skipped", reason: "Weekly backup already completed this week" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (schedule === "monthly" && hoursSinceLastBackup < 719) {
        return new Response(
          JSON.stringify({ status: "skipped", reason: "Monthly backup already completed this month" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Perform backup
    const backupData: Record<string, unknown[]> = {};
    const errors: string[] = [];

    for (const table of BACKUP_TABLES) {
      try {
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
      created_at: now.toISOString(),
      created_by: "auto-backup",
      schedule: schedule,
      table_count: Object.keys(backupData).length,
      record_counts: Object.fromEntries(
        Object.entries(backupData).map(([k, v]) => [k, v.length])
      ),
      errors: errors.length > 0 ? errors : undefined,
      data: backupData,
    };

    const backupJson = JSON.stringify(backup);
    const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const fileName = `auto-backup-${dateStr}.json`;

    // Upload to storage
    const { error: uploadError } = await adminClient.storage
      .from("database-backups")
      .upload(fileName, backupJson, {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Update last backup time
    await adminClient
      .from("app_settings")
      .upsert(
        {
          key: "last_auto_backup",
          value: now.toISOString(),
          description: "Last automated backup timestamp",
        },
        { onConflict: "key" }
      );

    // Retention: keep only last N backups
    const { data: retentionSetting } = await adminClient
      .from("app_settings")
      .select("value")
      .eq("key", "backup_retention_count")
      .maybeSingle();

    const retentionCount = parseInt(retentionSetting?.value || "10", 10);

    // List all backups and delete old ones
    const { data: allFiles } = await adminClient.storage
      .from("database-backups")
      .list("", { sortBy: { column: "created_at", order: "desc" } });

    if (allFiles && allFiles.length > retentionCount) {
      const filesToDelete = allFiles
        .slice(retentionCount)
        .map((f) => f.name);

      if (filesToDelete.length > 0) {
        await adminClient.storage
          .from("database-backups")
          .remove(filesToDelete);
      }
    }

    const sizeKB = (backupJson.length / 1024).toFixed(1);
    const totalRecords = Object.values(backup.record_counts).reduce((s, c) => s + c, 0);

    return new Response(
      JSON.stringify({
        status: "completed",
        file_name: fileName,
        size_kb: sizeKB,
        total_records: totalRecords,
        table_count: backup.table_count,
        errors: errors.length,
        retained_backups: Math.min(allFiles?.length || 1, retentionCount),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
