# Fix: Death & Bonafide fee cards not visible in Admin Settings

## Diagnosis

The two new fee cards (`certificate_fee_death`, `certificate_fee_bonafide`) exist in `src/pages/admin/tabs/SettingsTab.tsx` (lines ~1792-1852) and the build is clean, so they do render — but they were appended at the very bottom of the Settings tab, after the dialog components and far below the "Certificate Settings" card where the existing certificate fee is configured. They are easy to miss, and the published site (inpt.org.in) also has not been republished since this change.

## Changes

1. **Relocate the fee cards** in `src/pages/admin/tabs/SettingsTab.tsx`: move the Death Certificate Fee and Bonafide Certificate Fee cards (and keep Outside Marriage Certificate Fee with them) up into the certificate configuration area, directly after the "Certificate Settings" card, so all certificate fee settings appear together in one place.
2. **Verify in the preview** with a browser check that the three cards render with the default ₹100 values and that Edit opens the dialog with the correct title for each type.
3. **Republish note**: the live site at inpt.org.in serves the last published build — after this change, publish so the cards appear on the live site too.

## Technical notes

- Pure JSX reordering inside `SettingsTab.tsx` — no logic, state, or settings keys change.
- No database changes.
