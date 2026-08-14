# Letterhead header/footer adjustments

## Changes

1. **Tamil title at 50% size** — in the letterhead template, the Tamil organisation name drops from 20px to 10px. English name, address and body text stay unchanged.

2. **Remove the logo** — the seal image before the title is removed from the letterhead header, so the title block spans the full header width.

3. **Separate letterhead footer setting** — the letterhead no longer borrows the receipt footer. A new "Letterhead Footer" settings card is added in the superadmin settings page with Tamil and English footer lines, saved under their own keys. Defaults match the current text so nothing looks different until edited. Changes appear live in the letterhead preview and print output.

## Technical notes

- New settings keys in `app_settings`: `letterhead_footer_ta`, `letterhead_footer_en` (atomic upsert on `key`, same pattern as existing settings cards).
- New `src/lib/letterheadSettings.ts` (defaults + keys) and `src/hooks/useLetterheadSettings.tsx` (fetch + realtime on `app_settings`, mirroring `useReceiptHeaderSettings`).
- New `src/components/admin/LetterheadFooterSettings.tsx`, rendered in `src/pages/admin/tabs/SuperAdminSettingsTab.tsx` next to the receipt/certificate header cards.
- `src/lib/letterheadHtml.ts`: `.org-ta` 20px -> 10px; remove `<img class="lh-logo">`, its CSS, the `logoUrl` field, and the logo-only header-stacking rules.
- `src/pages/LetterheadPage.tsx`: drop the `getCertificateImages` logo effect and `logoUrl` state; keep org name/address from receipt header settings, take footer lines from the new letterhead settings hook.
