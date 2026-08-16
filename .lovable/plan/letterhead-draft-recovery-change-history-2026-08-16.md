# Letterhead: Draft Recovery + Change History

Two improvements to the Letterhead Generator.

## 1. Never lose unsaved typing

Today the letterhead form keeps everything in memory only. When the browser tab is discarded (common on mobile when you minimise and come back, or on a reload), all typing is gone.

Fix: the form auto-saves a local draft as you type.

- Every field plus the layout settings (margins, font size) and the currently loaded letter id are stored in the browser's local storage, debounced (~500ms).
- On opening `/letterhead`, the draft is restored automatically and a small notice appears: "Unsaved draft restored" with a **Discard draft** action.
- The draft is cleared when the letter is saved/updated successfully, or when **New letter** is pressed, or when the user discards it.
- The draft is per-user (keyed by the signed-in user id) so a shared device does not leak one person's letter to another.

This is local-only recovery; it does not create database records.

## 2. Audit trail per letterhead

Every save, update and delete of a saved letter is recorded so you can see who changed it and when.

- New **History** button on each row in the Saved letters list, opening a dialog listing entries: date/time (dd/mm/yyyy HH:mm), action (Created / Updated / Deleted), and the person's name.
- Each update entry lists which fields changed (e.g. "Subject, Body").
- History is read-only; entries cannot be edited or removed.

## Technical notes

- **Draft**: new hook `src/hooks/useLetterheadDraft.tsx` using `localStorage` key `letterhead_draft_<userId>`; wired into `src/pages/LetterheadPage.tsx`. Stores `{ fields, layout, currentId, savedAt }`, ignores drafts older than 7 days.
- **Audit table**: new `public.letterhead_audit_logs` — `id`, `letterhead_id` (uuid, no FK cascade delete so delete entries survive), `action` (`created|updated|deleted`), `changed_fields` (text[]), `performed_by` (uuid), `performed_by_name` (text snapshot), `snapshot` (jsonb), `created_at`.
  - GRANT `SELECT, INSERT` to `authenticated`, `ALL` to `service_role`; RLS enabled with the same access rule as `letterheads` (admin/superadmin or `letterhead` tab permission) for SELECT/INSERT; no UPDATE/DELETE policies.
  - Index on `letterhead_id, created_at desc`.
- **Writing entries**: from `src/components/letterhead/SavedLetterheads.tsx` after each successful insert/update/delete; the update path diffs the previous row (already in state) against the new payload to compute `changed_fields`.
- **History UI**: new `src/components/letterhead/LetterheadHistoryDialog.tsx`, dates formatted dd/mm/yyyy in Asia/Kolkata.
- No changes to the print/HTML generation logic.
