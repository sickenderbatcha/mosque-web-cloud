# Certificate footers, missing admin records, death preview fix, dashboard cards

Four separate issues. Findings below are based on checks made against the live database and code.

## 1. Configurable footers for each certificate

Today only the marriage and outside-marriage printouts have a footer, and it is a hard-coded "Certificate No: ..." line. Death, heir and NOC have no footer at all.

Add a per-certificate footer setting (Tamil + English) stored in app settings, following the same pattern already used for certificate header and signature settings:

- Keys per type: `cert_footer_<type>_ta` / `cert_footer_<type>_en` for `death`, `marriage`, `outside_marriage`, `noc`, `heir`.
- New "சான்றிதழ் அடிக்குறிப்பு (Certificate Footer Settings)" card in Superadmin Dashboard → Settings, with one Tamil and one English field per certificate type, save and reset-to-defaults.
- Both the on-screen previews and the print/PDF output render the configured footer at the bottom. Empty fields render nothing.
- The existing "Certificate No: ..." line on marriage / outside-marriage, remove this. Dont print this line in the footer.

## 2. Missing records in admin tabs

Verified in the database:

- `noc_certificates` has **0 rows**. The NOC tab is empty because no NOC request has ever been saved — not a display bug. Admin read access on that table is correctly configured. First step is to reproduce a NOC submission from the public NOC page and capture the actual failure (insert error, validation, or payment step aborting before insert), then fix the cause. The diagnosis of why the insert fails is not yet confirmed.
- `issued_documents` contains only 1 death and 1 heir row, and **the public schema currently has no database triggers at all**. Every trigger (the `auto_issue_*` document-issuing triggers, income-posting triggers, notification triggers, `updated_at` triggers, document numbering) is missing, even though the underlying functions still exist. This is why approved marriage and NOC certificates never appear in Issued Documents.

Fix: a migration that re-attaches all triggers to their tables (document issuing for death / marriage / outside-marriage / NOC / heir, document number generation, income posting for bookings, donations, subscriptions and certificate payments, refund/expense handling, admin notification triggers, subscription slot population, and `updated_at` on tables that have that column). Then backfill `issued_documents` for already-approved marriage, outside-marriage and NOC records so the tab shows history.

After that, verify each certificate tab (Death Register, Marriage, Outside Marriage, NOC, Heir, Issued Documents) lists its records.

## 3. Death certificate preview/print fails with "Certificate record not found"

Confirmed cause: `death_registers` allows SELECT only for admins, so a member's dashboard query returns nothing and the code shows that error. Marriage works because that table still has an authenticated-read policy.

Fix: in the member dashboard, load the death record through the existing `get_death_register` security-definer function (already executable by authenticated users) instead of selecting from the table, for preview, print and download. Same treatment on the shared certificate preview page if it reads the table directly.

## 4. Dashboard stat cards overflow

On narrow screens the Tamil labels "முன்பதிவுகள்" and "பணம் செலுத்தியது" overflow their cards. Adjust the stat card layout only: allow the text block to shrink, reduce the icon/gap on small screens, and let the Tamil label wrap at a smaller size instead of forcing one line. No logic changes.

## Technical notes

- New `src/lib/certificateFooterSettings.ts` (fetch/parse, defaults) + `src/components/admin/CertificateFooterSettings.tsx`, wired into the Superadmin settings tab.
- Footer consumers: `DeathCertificatePreview`, `MarriageCertificatePreview`, `OutsideMarriageCertificatePreview`, `HeirCertificatePreview`, `NocCertificatePreview`, and the five PDF/print utilities in `src/utils/`.
- Trigger restoration is a SQL migration only; no function bodies are rewritten.