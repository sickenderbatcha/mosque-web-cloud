# Configurable certificate body text for all certificates + subscription lock explanation

## 1. Extend the @F token body editor to every certificate

Today only the death certificate has a configurable body (Superadmin → Settings → Death Certificate Body Text) using `@F1`, `@F2` … tokens. The same capability will be added for:

- Marriage certificate
- Outside marriage certificate
- NOC certificate
- Heir certificate (narrative paragraph only — the heirs table stays generated automatically)

Bonafide has no certificate document generator, so it is out of scope.

For each type:
- A numbered field list is shown in the settings screen (record fields for that certificate, in Tamil/English), with an Insert button per field.
- The admin edits a multi-line body template; each line becomes one line on the certificate.
- Tokens are replaced with the record values on preview, print and PDF.
- A Reset to default button restores the current hard-coded wording, so nothing changes visually until an admin edits it.

The settings screen becomes one card, "Certificate Body Text", with a certificate-type selector (Death, Marriage, Outside Marriage, NOC, Heir) instead of the current death-only card.

## 2. Subscription "From Period" lock explanation

On the subscription screen, when the From Period is locked:
- Keep the short inline note next to the label.
- Add an info icon with a tooltip and a visible bilingual helper line under the month/year selects explaining the reason, for example:
  - Forced pending months: "You have unpaid months. Payment must start from your earliest unpaid month. / நிலுவையில் உள்ள மாதங்கள் உள்ளதால், பழைய நிலுவை மாதத்திலிருந்தே கட்டணம் தொடங்க வேண்டும்."
  - No pending months: "Subscription continues from your next unpaid month; months cannot be skipped. / அடுத்த நிலுவை மாதத்திலிருந்தே சந்தா தொடரும்; மாதங்களை தவிர்க்க முடியாது."

Number of months remains freely selectable.

## Technical notes

- Generalise `src/lib/deathCertificateBody.ts` into a shared `src/lib/certificateBody.ts` holding a registry per certificate type: setting key (`marriage_cert_body_text`, `outside_marriage_cert_body_text`, `noc_cert_body_text`, `heir_cert_body_text`, existing `death_cert_body_text`), field list (serial/key/label), value builder from the record, and default template. The existing death exports stay as thin wrappers so current imports keep working.
- Derived tokens keep the existing conventions (formatted `dd/MM/yyyy` dates, `த/பெ` vs `க/பெ` label, address first line, groom/bride relationship words for NOC).
- Update previews (`MarriageCertificatePreview`, `OutsideMarriageCertificatePreview`, `NocCertificatePreview`, `HeirCertificatePreview`) and PDF utils (`marriageCertificatePdf`, `outsideMarriageCertificatePdf`, `nocCertificatePdf`, `heirCertificatePdf`) to render the resolved body lines instead of the inline JSX/text, matching how the death certificate already works.
- Replace `src/components/admin/DeathCertificateBodySettings.tsx` with a type-aware `CertificateBodySettings` component rendered in `SuperAdminSettingsTab`.
- Values persist through `app_settings` via the existing `upsertAppSetting` helper; no schema change.
- `src/pages/DonationPage.tsx`: add the tooltip/helper text near the From Period selects, driven by the existing `hasForcedPending` / `lockFromPeriod` flags.
