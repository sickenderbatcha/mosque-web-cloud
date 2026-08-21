# Add “View header source” to marriage certificate preview

## Goal
Add a small, preview-only “View header source” section on the marriage certificate preview that lists the exact `app_settings` keys used for the Tamil and English office address, along with their current values.

## Changes
1. **Update `src/components/MarriageCertificatePreview.tsx`**
   - Import the already-exported `CERTIFICATE_HEADER_SETTING_KEYS` from `src/lib/certificateHeaderSettings.ts`.
   - Render a new, non-printing block below the certificate header that shows:
     - `cert_header_office_address_ta` (Tamil) with its current value.
     - `cert_header_office_address_en` (English) with its current value.
   - Style it as a small, muted, preview-only helper so it is clearly not part of the printed certificate.
   - Ensure it does not appear in the print output.

## Technical details
- The keys are already defined in `src/lib/certificateHeaderSettings.ts`:
  - `officeAddressTa: "cert_header_office_address_ta"`
  - `officeAddressEn: "cert_header_office_address_en"`
- These values are stored as JSON arrays in `app_settings`; the source viewer will display them as the raw strings stored in the database, while the rendered certificate above shows them parsed and line-broken.
- No backend or database changes are required.
- No changes to other certificate previews or shared settings files are required.
