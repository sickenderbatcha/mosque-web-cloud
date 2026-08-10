import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";


function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data, (_key, value) =>
    typeof value === "bigint" ? Number(value) : value
  ), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Allowlist of valid public table names - validated against information_schema at runtime
async function validateTableName(conn: any, table: string): Promise<string | null> {
  // First reject obviously bad input
  if (!table || typeof table !== "string" || table.length > 63 || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
    return null;
  }
  // Validate against information_schema using parameterized query
  const result = await conn.queryObject`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = ${table}
  `;
  if (result.rows.length === 0) return null;
  return (result.rows[0] as any).table_name;
}

// Validate column name exists in a given table
async function validateColumnName(conn: any, table: string, column: string): Promise<string | null> {
  if (!column || typeof column !== "string" || column.length > 63 || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
    return null;
  }
  const result = await conn.queryObject`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
  `;
  if (result.rows.length === 0) return null;
  return (result.rows[0] as any).column_name;
}

// Escape an identifier for safe use in SQL (double-quote and escape internal quotes)
function escapeIdentifier(name: string): string {
  return '"' + name.replace(/"/g, '""') + '"';
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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
          const validatedTable = await validateTableName(conn, table);
          if (!validatedTable) return jsonResponse({ error: "Invalid table name" }, 400);
          
          const result = await conn.queryObject`
            SELECT column_name, data_type, is_nullable, column_default,
              (SELECT EXISTS(
                SELECT 1 FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_schema = 'public' AND tc.table_name = ${validatedTable}
                  AND tc.constraint_type = 'PRIMARY KEY' AND kcu.column_name = c.column_name
              )) as is_primary_key
            FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.table_name = ${validatedTable}
            ORDER BY c.ordinal_position
          `;
          return jsonResponse({ columns: result.rows });
        }

        case "fetch_rows": {
          const { table, page = 1, pageSize = 50 } = body;
          const validatedTable = await validateTableName(conn, table);
          if (!validatedTable) return jsonResponse({ error: "Invalid table name" }, 400);

          const safePageSize = Math.min(Math.max(1, Number(pageSize) || 50), 200);
          const safePage = Math.max(1, Number(page) || 1);
          const offset = (safePage - 1) * safePageSize;

          const countResult = await conn.queryObject(
            `SELECT COUNT(*)::int as total FROM public.${escapeIdentifier(validatedTable)}`
          );
          const total = (countResult.rows[0] as any).total;

          // Determine order column dynamically using parameterized query
          const orderColResult = await conn.queryObject`
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = ${validatedTable} AND column_name IN ('created_at', 'id')
            ORDER BY CASE column_name WHEN 'created_at' THEN 1 WHEN 'id' THEN 2 END LIMIT 1
          `;
          const orderCol = (orderColResult.rows[0] as any)?.column_name || 'id';
          const validatedOrderCol = await validateColumnName(conn, validatedTable, orderCol);
          if (!validatedOrderCol) return jsonResponse({ error: "Invalid order column" }, 400);

          const dataResult = await conn.queryObject(
            `SELECT * FROM public.${escapeIdentifier(validatedTable)} ORDER BY ${escapeIdentifier(validatedOrderCol)} DESC NULLS LAST LIMIT $1 OFFSET $2`,
            [safePageSize, offset]
          );
          return jsonResponse({ rows: dataResult.rows, total, page: safePage, pageSize: safePageSize });
        }

        case "update_row": {
          const { table, id, data } = body;
          if (!id || !data) return jsonResponse({ error: "id and data required" }, 400);
          const validatedTable = await validateTableName(conn, table);
          if (!validatedTable) return jsonResponse({ error: "Invalid table name" }, 400);
          
          // Validate all column names
          const entries = Object.entries(data).filter(([key]) => key !== "id");
          if (entries.length === 0) return jsonResponse({ error: "No data to update" }, 400);
          
          const validatedColumns: string[] = [];
          const values: any[] = [id];
          for (const [key, val] of entries) {
            const validCol = await validateColumnName(conn, validatedTable, key);
            if (!validCol) return jsonResponse({ error: `Invalid column: ${key}` }, 400);
            validatedColumns.push(validCol);
            values.push(val);
          }
          
          const setClauses = validatedColumns.map((col, i) => `${escapeIdentifier(col)} = $${i + 2}`).join(", ");
          
          await conn.queryObject(
            `UPDATE public.${escapeIdentifier(validatedTable)} SET ${setClauses} WHERE id = $1`,
            values
          );
          return jsonResponse({ success: true });
        }

        case "insert_row": {
          const { table, data } = body;
          if (!data) return jsonResponse({ error: "data required" }, 400);
          const validatedTable = await validateTableName(conn, table);
          if (!validatedTable) return jsonResponse({ error: "Invalid table name" }, 400);
          
          const keys = Object.keys(data);
          const validatedColumns: string[] = [];
          const values: any[] = [];
          for (const key of keys) {
            const validCol = await validateColumnName(conn, validatedTable, key);
            if (!validCol) return jsonResponse({ error: `Invalid column: ${key}` }, 400);
            validatedColumns.push(validCol);
            values.push(data[key]);
          }
          
          const cols = validatedColumns.map(c => escapeIdentifier(c)).join(", ");
          const placeholders = validatedColumns.map((_, i) => `$${i + 1}`).join(", ");
          
          const result = await conn.queryObject(
            `INSERT INTO public.${escapeIdentifier(validatedTable)} (${cols}) VALUES (${placeholders}) RETURNING *`,
            values
          );
          return jsonResponse({ row: result.rows[0] });
        }

        case "delete_rows": {
          const { table, ids } = body;
          if (!ids?.length) return jsonResponse({ error: "ids required" }, 400);
          const validatedTable = await validateTableName(conn, table);
          if (!validatedTable) return jsonResponse({ error: "Invalid table name" }, 400);
          
          const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(", ");
          await conn.queryObject(
            `DELETE FROM public.${escapeIdentifier(validatedTable)} WHERE id IN (${placeholders})`,
            ids
          );
          return jsonResponse({ success: true, deleted: ids.length });
        }

        case "run_sql": {
          const { sql } = body;
          if (typeof sql !== "string" || !sql.trim()) {
            return jsonResponse({ error: "SQL required" }, 400);
          }

          // Read-only guard: strip comments, allow a single SELECT/WITH statement only
          const stripped = sql
            .replace(/--[^\n]*/g, " ")
            .replace(/\/\*[\s\S]*?\*\//g, " ")
            .trim()
            .replace(/;\s*$/, "");

          if (stripped.includes(";")) {
            return jsonResponse({ error: "Only a single statement is allowed" }, 400);
          }
          if (!/^(select|with)\s/i.test(stripped)) {
            return jsonResponse({ error: "Only read-only SELECT queries are allowed" }, 400);
          }
          if (/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|do|vacuum|reindex|refresh|comment|set|reset|listen|notify|pg_read_file|pg_ls_dir|lo_import|lo_export|dblink|pg_sleep)\b/i.test(stripped)) {
            return jsonResponse({ error: "Only read-only SELECT queries are allowed" }, 400);
          }

          // Enforce read-only at the transaction level as defense in depth
          await conn.queryObject("BEGIN READ ONLY");
          let result;
          try {
            result = await conn.queryObject(`SELECT * FROM (${stripped}) AS _q LIMIT 1000`);
            await conn.queryObject("COMMIT");
          } catch (e) {
            await conn.queryObject("ROLLBACK");
            throw e;
          }

          // Audit the query
          await adminClient.from("admin_audit_logs").insert({
            performed_by: user.id,
            action_type: "run_sql",
            action_description: "Executed a read-only SQL query in the database manager",
            target_table: null,
            target_details: { sql: stripped.slice(0, 2000) },
          });

          return jsonResponse({
            success: true,
            rowCount: result.rowCount,
            rows: result.rows?.slice(0, 100),
          });
        }

        case "export_sql": {
          const { table } = body;
          const validatedTable = await validateTableName(conn, table);
          if (!validatedTable) return jsonResponse({ error: "Invalid table name" }, 400);
          
          const result = await conn.queryObject(`SELECT * FROM public.${escapeIdentifier(validatedTable)}`);
          if (!result.rows.length) return jsonResponse({ sql: `-- ${validatedTable}: No records\n` });
          
          const columns = Object.keys(result.rows[0] as any);
          const colList = columns.map(c => escapeIdentifier(c)).join(", ");
          
          const lines: string[] = [
            `-- ${validatedTable}: ${result.rows.length} records`,
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
              `INSERT INTO public.${escapeIdentifier(validatedTable)} (${colList}) VALUES (${values}) ON CONFLICT ("id") DO UPDATE SET ${columns
                .filter(c => c !== "id")
                .map(c => `${escapeIdentifier(c)} = EXCLUDED.${escapeIdentifier(c)}`)
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
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
