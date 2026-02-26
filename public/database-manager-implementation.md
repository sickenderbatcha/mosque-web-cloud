# Database Manager - Complete Implementation Guide

## Overview
A Super Admin-only Database Manager tab that provides full CRUD operations on all public tables, raw SQL execution, and SQL export — all via a direct Postgres connection edge function.

---

## 1. Edge Function: `supabase/functions/admin-database-manager/index.ts`

Create this edge function with the following code:

```typescript
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
          
          const validTable = await conn.queryObject`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name = ${table}
          `;
          if (validTable.rows.length === 0) return jsonResponse({ error: "Invalid table" }, 400);

          const offset = (page - 1) * pageSize;
          const countResult = await conn.queryObject(`SELECT COUNT(*)::int as total FROM public."${table}"`);
          const total = (countResult.rows[0] as any).total;

          const orderColResult = await conn.queryObject(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '${table}' AND column_name IN ('created_at', 'id')
            ORDER BY CASE column_name WHEN 'created_at' THEN 1 WHEN 'id' THEN 2 END LIMIT 1
          `);
          const orderCol = (orderColResult.rows[0] as any)?.column_name || 'id';

          const dataResult = await conn.queryObject(
            `SELECT * FROM public."${table}" ORDER BY "${orderCol}" DESC NULLS LAST LIMIT ${pageSize} OFFSET ${offset}`
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
          
          const result = await conn.queryObject(sql);
          return jsonResponse({ 
            success: true, 
            rowCount: result.rowCount,
            rows: result.rows?.slice(0, 100)
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
```

---

## 2. Frontend Tab: `src/pages/admin/tabs/DatabaseManagerTab.tsx`

Create this file. Key features to implement:

### State Management
```typescript
const [tables, setTables] = useState<any[]>([]);
const [selectedTable, setSelectedTable] = useState("");
const [columns, setColumns] = useState<any[]>([]);
const [rows, setRows] = useState<any[]>([]);
const [page, setPage] = useState(1);
const [total, setTotal] = useState(0);
const [pageSize] = useState(50);
const [loading, setLoading] = useState(false);
const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
const [editedCells, setEditedCells] = useState<Record<string, Record<string, any>>>({});
const [newRows, setNewRows] = useState<any[]>([]);
const [selectedRows, setSelectedRows] = useState<string[]>([]);
const [sqlDialogOpen, setSqlDialogOpen] = useState(false);
const [sqlQuery, setSqlQuery] = useState("");
const [sqlResult, setSqlResult] = useState<any>(null);
```

### API Helper
```typescript
const callEdgeFunction = async (action: string, extra: any = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-database-manager`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action, ...extra }),
    }
  );
  return res.json();
};
```

### Key UI Features

1. **Table Selector** — Dropdown listing all public tables with row counts
2. **Data Grid** — Horizontally scrollable table with all columns visible
3. **Single-Click Inline Editing** — Use `onClick` (NOT `onDoubleClick`) on `<TableCell>` to enter edit mode
4. **Batch Save** — Collect all edits in `editedCells` state, send them all on "Save Changes" click
5. **Discard Button** — Always visible, `disabled={!hasChanges}`, resets `editedCells`, `newRows`, and `editingCell`
6. **Add Row** — Creates a temporary local row; committed on Save
7. **Bulk Delete** — Checkbox selection + "Delete Selected" button
8. **Raw SQL Dialog** — Modal with textarea for SQL input and results display
9. **Export SQL** — Button that calls `export_sql` action and copies result to clipboard

### Important Implementation Details

- **hasChanges computed value:**
```typescript
const hasChanges = Object.keys(editedCells).length > 0 || newRows.length > 0;
```

- **Discard button:**
```tsx
<Button
  variant="ghost"
  size="sm"
  disabled={!hasChanges}
  onClick={() => {
    setEditedCells({});
    setNewRows([]);
    setEditingCell(null);
    toast.info("Changes discarded");
  }}
>
  Discard
</Button>
```

- **Single-click editing on TableCell:**
```tsx
<TableCell
  key={col.column_name}
  className="p-1 max-w-[200px]"
  onClick={() => setEditingCell({ rowId: row.id, col: col.column_name })}
>
  {/* render input if editing, else display value */}
</TableCell>
```

- **Horizontal scroll wrapper:**
```tsx
<div className="overflow-auto border rounded-md">
  <Table>...</Table>
</div>
```

---

## 3. Super Admin Dashboard Integration

In `src/pages/admin/SuperAdminDashboard.tsx`, add the Database Manager tab:

```tsx
import { TableProperties } from "lucide-react";
import DatabaseManagerTab from "./tabs/DatabaseManagerTab";

// Add to TabsList:
<TabsTrigger value="database-manager" className="flex items-center gap-2">
  <TableProperties className="h-4 w-4" />
  <span>Database</span>
</TabsTrigger>

// Add TabsContent:
<TabsContent value="database-manager">
  <DatabaseManagerTab />
</TabsContent>
```

---

## 4. SQL Export Component (Optional)

If you want the export as a separate card component, create `src/components/admin/SqlExportCard.tsx`:
- Dropdown to select table
- "Export" button that calls the edge function with `action: "export_sql"`
- Textarea showing the generated SQL
- "Copy to Clipboard" button

---

## Key Technical Notes

1. **BigInt Serialization**: The edge function uses a custom JSON replacer `typeof value === "bigint" ? Number(value) : value` because PostgreSQL returns `bigint` for `reltuples` which JSON.stringify cannot handle natively.

2. **Dynamic Ordering**: The `fetch_rows` action checks if the table has a `created_at` column (preferred) or falls back to `id` for ordering.

3. **Table Name Validation**: Before executing queries with interpolated table names, the function validates the table exists in `information_schema.tables`.

4. **Direct Postgres Connection**: Uses `SUPABASE_DB_URL` env var with `deno.land/x/postgres@v0.17.0` for direct database access, bypassing PostgREST limitations.

5. **Auth Flow**: The edge function first verifies the caller's JWT using the anon key client, then checks `user_roles` table using the service role client to confirm `superadmin` role.
