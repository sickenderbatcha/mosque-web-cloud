# Configurable Certificate Signature Block

Make the signature block text on certificates editable from Superadmin Dashboard → Settings, instead of being hard-coded.

## What becomes editable

- Designation line (currently "மேனேஜிங் டிரஸ்ட்டி")
- Up to three extra sub-lines shown under the designation (currently mosque/branch lines on the heir certificate)

Both Tamil and English variants of the designation and sub-lines are stored, so certificates that print English text can use the matching version. Existing hard-coded values become the defaults, so nothing changes visually until an admin edits them.

## Where it applies

Screen previews and the printed/downloaded PDFs, for:

- Death certificate
- Heir certificate
- NOC certificate (both the in-body reference line and the signature block)
- Marriage certificate and Outside-marriage certificate signature areas

## Admin UI

A new "Certificate Signature Block" card in the Superadmin Settings tab, styled like the existing Certificate Header Settings card: text inputs for the designation and the sub-lines, a Save button with success/error toast, and a Reset-to-default action.

## Technical notes

- Store values in `app_settings` under new keys: `cert_sign_designation_ta`, `cert_sign_designation_en`, `cert_sign_lines_ta` (JSON array), `cert_sign_lines_en` (JSON array). Save via the existing `upsertAppSetting` helper (upsert on `key`).
- New `src/lib/certificateSignatureSettings.ts` mirroring `certificateHeaderSettings.ts`: exported interface, defaults, keys, and `getCertificateSignatureSettings()`.
- Previews (`DeathCertificatePreview`, `HeirCertificatePreview`, `NocCertificatePreview`, `MarriageCertificatePreview`, `OutsideMarriageCertificatePreview`) fetch the settings in the existing `useEffect` alongside header settings and render the values instead of literals.
- PDF utils (`deathCertificatePdf`, `heirCertificatePdf`, `nocCertificatePdf`, `marriageCertificatePdf`, `outsideMarriageCertificatePdf`) accept the signature settings (fetched where header settings are already fetched, or fetched inside the generator) and draw the configured strings with the existing Tamil text helpers; empty sub-lines are skipped and following lines shift up.
- New component `src/components/admin/CertificateSignatureSettings.tsx`, added to `SuperAdminSettingsTab`.
- No schema migration needed — `app_settings` already exists.
