import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data, (_key, value) =>
    typeof value === "bigint" ? Number(value) : value
  ), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is superadmin
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleData?.role !== "superadmin") {
      return jsonResponse({ error: "Forbidden: Superadmin only" }, 403);
    }

    const body = await req.json();
    const { action } = body;

    // Use direct postgres for all operations via the REST SQL endpoint
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) return jsonResponse({ error: "Database URL not configured" }, 500);

    const { Pool } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const pool = new Pool(dbUrl, 1, true);
    const conn = await pool.connect();

    try {
      switch (action) {
        case "list_tables": {
          const result = await conn.queryObject<{ table_name: string; row_count: number }>`
            SELECT t.table_name,
              (SELECT reltuples::bigint FROM pg_class WHERE oid = (quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))::regclass) as row_count
            FROM information_schema.tables t
            WHERE t.table_schema = 'public'
              AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name
          `;
          return jsonResponse({ tables: result.rows });
        }

        case "get_columns": {
          const { table } = body;
          if (!table) return jsonResponse({ error: "Table name required" }, 400);
          const result = await conn.queryObject`
            SELECT column_name, data_type, is_nullable, column_default,
              (SELECT EXISTS(
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema = 'public' AND tc.table_name = ${table}
                  AND tc.constraint_type = 'PRIMARY KEY' AND kcu.column_name = c.column_name
              )) as is_primary_key
            FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = ${table}
            ORDER BY c.ordinal_position
          `;
          return jsonResponse({ columns: result.rows });
        }

        case "fetch_rows": {
          const { table, page = 1, pageSize = 50 } = body;
          if (!table) return jsonResponse({ error: "Table name required" }, 400);
          
          // Sanitize table name
          const validTable = await conn.queryObject`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = ${table}
          `;
          if (validTable.rows.length === 0) return jsonResponse({ error: "Invalid table" }, 400);

          const offset = (page - 1) * pageSize;
          const countResult = await conn.queryObject(`SELECT COUNT(*)::int as total FROM public."${table}"`);
          const total = (countResult.rows[0] as any).total;

          const dataResult = await conn.queryObject(
            `SELECT * FROM public."${table}" ORDER BY created_at DESC NULLS LAST, id LIMIT ${pageSize} OFFSET ${offset}`
          );
          return jsonResponse({ rows: dataResult.rows, total, page, pageSize });
        }

        case "update_row": {
          const { table, id, data } = body;
          if (!table || !id || !data) return jsonResponse({ error: "Table, id, and data required" }, 400);
          
          const setClauses = Object.entries(data)
            .filter(([key]) => key !== "id")
            .map(([key, val], i) => `"${key}" = $${i + 2}`)
            .join(", ");
          const values = [id, ...Object.entries(data).filter(([key]) => key !== "id").map(([, val]) => val)];
          
          await conn.queryObject(
            `UPDATE public."${table}" SET ${setClauses} WHERE id = $1`,
            values
          );
          return jsonResponse({ success: true });
        }

        case "insert_row": {
          const { table, data } = body;
          if (!table || !data) return jsonResponse({ error: "Table and data required" }, 400);
          
          const keys = Object.keys(data);
          const cols = keys.map(k => `"${k}"`).join(", ");
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
          const values = Object.values(data);
          
          const result = await conn.queryObject(
            `INSERT INTO public."${table}" (${cols}) VALUES (${placeholders}) RETURNING *`,
            values
          );
          return jsonResponse({ row: result.rows[0] });
        }

        case "delete_rows": {
          const { table, ids } = body;
          if (!table || !ids?.length) return jsonResponse({ error: "Table and ids required" }, 400);
          
          const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(", ");
          await conn.queryObject(
            `DELETE FROM public."${table}" WHERE id IN (${placeholders})`,
            ids
          );
          return jsonResponse({ success: true, deleted: ids.length });
        }

        case "run_sql": {
          const { sql } = body;
          if (!sql?.trim()) return jsonResponse({ error: "SQL required" }, 400);
          
          // Execute the SQL
          const result = await conn.queryObject(sql);
          return jsonResponse({ 
            success: true, 
            rowCount: result.rowCount,
            rows: result.rows?.slice(0, 100) // Limit returned rows
          });
        }

        case "export_sql": {
          const { table } = body;
          if (!table) return jsonResponse({ error: "Table name required" }, 400);
          
          const result = await conn.queryObject(`SELECT * FROM public."${table}"`);
          if (!result.rows.length) return jsonResponse({ sql: `-- ${table}: No records\n` });
          
          const columns = Object.keys(result.rows[0] as any);
          const colList = columns.map(c => `"${c}"`).join(", ");
          
          const lines: string[] = [
            `-- ${table}: ${result.rows.length} records`,
            `-- Exported on ${new Date().toISOString()}`,
            "",
          ];
          
          for (const row of result.rows) {
            const values = columns.map(col => {
              const val = (row as any)[col];
              if (val === null || val === undefined) return "NULL";
              if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
              if (typeof val === "number") return String(val);
              if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
              return `'${String(val).replace(/'/g, "''")}'`;
            }).join(", ");
            
            lines.push(
              `INSERT INTO public."${table}" (${colList}) VALUES (${values}) ON CONFLICT ("id") DO UPDATE SET ${columns
                .filter(c => c !== "id")
                .map(c => `"${c}" = EXCLUDED."${c}"`)
                .join(", ")};`
            );
          }
          
          return jsonResponse({ sql: lines.join("\n") });
        }

        default:
          return jsonResponse({ error: `Unknown action: ${action}` }, 400);
      }
    } finally {
      conn.release();
      await pool.end();
    }
  } catch (error: any) {
    console.error("Database manager error:", error);
    return jsonResponse({ error: error.message || "Internal server error" }, 500);
  }
});
