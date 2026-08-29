# Add NOC and Heir certificate fee configuration to Certificate Settings

## Current state (verified)

- `src/pages/admin/tabs/SettingsTab.tsx` has fee cards for Marriage (`certificate_fee`), Outside Marriage, Death, and Bonafide only.
- `src/pages/NocCertificatePage.tsx` already reads `certificate_fee_noc` (defaults to ₹100) — but no settings UI exists to change it.
- `src/pages/HeirCertificatePage.tsx` already reads `certificate_fee_heir` with fallback to `certificate_fee` — also no settings UI.

## Changes

All in `src/pages/admin/tabs/SettingsTab.tsx`:

1. Add two new fee cards in the Certificate Settings area, placed after the Bonafide card:
   - **NOC Certificate Fee (ஆட்சேபணை இல்லா சான்றிதழ் கட்டணம்)** — key `certificate_fee_noc`, default ₹100.
   - **Heir Certificate Fee (வாரிசு சான்றிதழ் கட்டணம்)** — key `certificate_fee_heir`, default ₹100.
2. Extend `CERTIFICATE_FEE_KEYS` and the `certificateFeeDialogType` union with `noc` and `heir`.
3. Update the edit-fee dialog title/description chains so NOC and Heir get correct labels.

No changes to the NOC/Heir pages themselves — they already read these keys, so once a value is saved it takes effect immediately (including for online payment amount and cash payment requests).

## Verification

- Open Admin Dashboard → Settings → Certificate Settings and confirm the two new cards appear and saving a fee persists.
- Confirm the NOC page payment amount reflects the configured fee.
