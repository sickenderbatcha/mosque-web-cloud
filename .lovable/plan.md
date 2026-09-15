# Connect Personal Supabase Project

## Goal
Replace the current Lovable Cloud backend with your personal Supabase project (`verksdbzmhjkrsodvtlx`) and migrate the existing data so the app continues to work without data loss.

## What will change
- The app will point to your Supabase project URL and anon key.
- Edge functions and backend operations will use your project's service role key.
- All existing tables, settings, uploaded files and auth users will be copied to the new project.
- Lovable Cloud managed backend (ref `ovprlavkkzdlgursiikw`) will no longer be used.

## Steps

### 1. Store the new connection credentials
- Save `VITE_SUPABASE_URL` = `https://verksdbzmhjkrsodvtlx.supabase.co`
- Save `VITE_SUPABASE_PUBLISHABLE_KEY` = the anon key you provided
- Open the secure form for you to enter `SUPABASE_SERVICE_ROLE_KEY` from your Supabase project settings → API → service role key

### 2. Update project configuration files
- Update `vite.config.ts` fallback `define` values to your new project URL and anon key so the dev build and preview use them.
- Update `supabase/config.toml` `project_id` to `verksdbzmhjkrsodvtlx` so edge-function deploys target your project.

### 3. Prepare the personal project
- Ensure your Supabase project has the Auth, Database, Storage and Edge Functions services enabled.
- Confirm the project region and that you have admin access to project settings.

### 4. Migrate the database schema
- Export the current schema (tables, enums, functions, triggers, policies, grants) from Lovable Cloud.
- Apply the schema to your personal project.
- Re-enable RLS and verify policies are present, including superadmin parity where needed.

### 5. Migrate existing data
- Copy data from all application tables (members, bookings, donations, subscriptions, certificates, settings, etc.).
- Migrate Storage buckets and uploaded files (photos, signatures, letterheads, fonts).
- Migrate auth users and roles, or recreate admin/superadmin accounts using the existing setup edge functions after connection.

### 6. Redeploy edge functions
- Deploy all functions in `supabase/functions/` to your personal project.
- Verify each function's environment variables (secrets) are available in the new project.

### 7. Recreate cron jobs (if needed)
- Re-create `auto-cancel-expired-bookings`, `auto-backup` and `send-event-reminders` cron schedules in your personal project using the new service role key.

### 8. Verify and test
- Restart the dev server and confirm the app loads against your project.
- Run a build check.
- Sign in as admin/superadmin and spot-check: dashboard counts, bookings, refunds, certificate previews, receipt numbers.

## Risks / notes
- Your personal project must have the same Postgres extensions enabled as Lovable Cloud (e.g., `pg_cron`, `pg_net`, `uuid-ossp`).
- Service role key is highly sensitive; it will be stored via the secure secrets form.
- If any migration fails, the Lovable Cloud project remains intact until the switch is verified.
- After the switch, publishes will use your personal project.
