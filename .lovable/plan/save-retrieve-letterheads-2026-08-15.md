# Save & Retrieve Letterheads

Add persistence to the Letterhead Generator so letters can be saved and found later by date and recipient name.

## What you get

- A **Save letter** button on `/letterhead` that stores the current letter (all fields plus the print layout settings).
- A **Saved letters** panel with:
  - search by **recipient name** (partial match, case-insensitive)
  - filter by **date** (single date or from/to range, dd/mm/yyyy)
  - results list showing date, reference number, recipient and subject
  - **Load** (fills the form for editing/printing), **Update** (re-save the loaded letter) and **Delete** actions.

## Access

Same gate as the letterhead page itself (admin, superadmin, or the `letterhead` tab permission). Saved letters are visible to all users who can access the letterhead page, so any authorised staff member can retrieve a letter written by a colleague.

## Technical notes

- New table `public.letterheads`: `id`, `reference_number`, `letter_date` (date), `recipient_name`, `recipient_address`, `subject`, `salutation`, `body`, `closing`, `signatory_name`, `designation`, `layout` (jsonb), `created_by`, `created_at`, `updated_at`.
- GRANTs for `authenticated` (select/insert/update/delete) and `service_role`; RLS enabled with policies allowing access to admins/superadmins and users holding the `letterhead` tab permission, matching how existing tab-permission tables are handled.
- Indexes on `letter_date` and lower(`recipient_name`) for the search.
- `src/pages/LetterheadPage.tsx` gains save/load state and a saved-letters card; queries via the existing Supabase client. Dates stored ISO, displayed dd/mm/yyyy.
- No change to the print/HTML generation logic.
