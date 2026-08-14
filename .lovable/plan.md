# Letterhead header/footer adjustments

## Changes

1. **Tamil title at 50% size** — in the letterhead template, the Tamil organisation name drops from 20px to 10px. The English name, address and body text stay as they are.

2. **Remove the logo** — the seal image before the title is removed from the letterhead header, so the title block spans the full header width. The logo fetch on the page is dropped too, since nothing else uses it there.

3. **Footer text** — already configurable. Both the Tamil and English footer lines come from Admin Settings > Receipt Header Settings ("Footer message" Tamil/English) and update live on the letterhead. No new setting is added; instead the letterhead form gets a short note pointing to where the footer text is edited.

## Technical notes

- `src/lib/letterheadHtml.ts`: `.org-ta` font-size 20px -> 10px; drop the `<img class="lh-logo">` markup, its CSS rules, the `logoUrl` field on `LetterheadBranding`, and the header-stacking rules that only existed for the logo.
- `src/pages/LetterheadPage.tsx`: remove the `getCertificateImages` logo effect and `logoUrl` state; add the helper text about footer configuration.
- Footer values continue to flow from `useReceiptHeaderSettings` (`receipt_header_footer_ta` / `_en`).
