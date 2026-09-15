# Handle Lovable Cloud Detachment / External Supabase Migration

## Goal
Get a clear answer from Lovable support about detaching Lovable Cloud or migrating the project to the external Supabase project `verksdbzmhjkrsodvtlx`, then act on that answer.

## Steps

### 1. User contacts Lovable support
- Use https://lovable.dev/support (or email support@lovable.dev from the account email).
- Include project context and the external Supabase project ID.

### 2. Wait for support response
- Possible answers:
  - **A:** They can detach Cloud / enable external Supabase connector.
  - **B:** They can perform a manual backend migration.
  - **C:** Neither is possible; Cloud cannot be removed from this project.

### 3. If answer is A or B (migration possible)
- Re-run `supabase--rebind_secrets` so the sandbox fetches the service role key for the external project.
- Deploy all edge functions in `supabase/functions/` to the external project.
- Export schema and data from Lovable Cloud and apply to the external project.
- Migrate storage buckets and files.
- Recreate pg_cron jobs (auto-cancel, auto-backup, event reminders) with the correct cron secret.
- Verify builds, sign-in, dashboard counts, bookings, refunds, certificates and receipts.

### 4. If answer is C (not possible)
- Revert `vite.config.ts` and `supabase/config.toml` to point back to Lovable Cloud.
- Confirm the app is working against Lovable Cloud again.
- Advise the user that a personal Supabase project can only be used for a new project created without Lovable Cloud.

## Risks / notes
- Lovable Cloud may not be detachable once attached; support is the only path.
- Service role key for the external project cannot be set manually; it must come through Lovable's authorized connection.
- If migration proceeds, data loss risk is mitigated by keeping Lovable Cloud intact until verification passes.
