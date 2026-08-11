# Letterhead Generator

A new `/letterhead` screen where authorised staff compose an official letter, see a live A4 preview, and print it on the mosque letterhead.

## Branding source

The letterhead header reuses the existing receipt header settings already configured in the admin dashboard (Tamil + English organisation name, address line 1 and 2, phone) plus the mosque seal image already stored for certificates, used as the letterhead logo. The footer tagline is the existing Tamil footer message with the English one below it. No new settings screen is added; while these settings load, the page shows a loading state, and if the logo image is missing the header renders without it.

## Access

`/letterhead` is visible only to signed-in users who are admin, superadmin, or have been granted a new "Letterhead" tab permission. The new `letterhead` key is added to the tab permission list so superadmins can grant it. A link to the page appears in the admin dashboard area for users who can access it.

## The form (left column, stacked on mobile)

All fields optional, labels bilingual (Tamil with English beneath):

- Reference number, Date (date picker showing and printing `dd/mm/yyyy`)
- Recipient name, Recipient address (3-row textarea)
- Subject, Salutation
- Body (10-row textarea)
- Closing, Signatory name, Designation

Below, a bordered "Print layout / அச்சு அமைப்பு" group:

- Top margin mm (0–40, step 1, default 18)
- Bottom margin mm (0–40, step 1, default 18)
- Body font size px (9–20, step 0.5, default 13.5)
- Reset button restoring those three defaults

Then a Print button with a printer icon.

## Live preview (right column)

An iframe with `aspect-ratio: 210 / 297` rendering the exact same generated HTML through `srcDoc`, refreshing as the user types and as the layout controls change.

## Letter body rules

If only the body field is filled and everything else is empty, the printed letter shows just the body text inside the letterhead header and footer — no labels, no empty rows, no signature block. Otherwise only blocks with content render, in this order:

1. Meta row: `Ref: <value>` left, `Date: <dd/mm/yyyy>` right (each side omitted when empty)
2. Recipient block: name bold, then address preserving line breaks
3. Subject: bold and underlined
4. Salutation
5. Body, preserving line breaks
6. Closing
7. Signature block: signatory name bold, designation smaller and muted beneath

## Print

Opens a ~900x1100 window, writes the standalone HTML document, and calls `window.print()` roughly 300ms after load.

## Technical notes

- New `src/lib/letterheadHtml.ts` builds the standalone document string: `.sheet` at `210mm` wide, `min-height: 297mm`, `margin: 0 auto`, white background, flex column, padding `{top}mm 16mm {bottom}mm`; body area flexes to fill at `{bodyFontPx}px` / `line-height: 1.65`; footer pinned at the bottom with a 1px top border, centred, 12px, weight 600. Under 640px the header stacks vertically, centres, and shrinks the logo to 72px, with `@media print` forcing the horizontal desktop layout back.
- All interpolated values are HTML-escaped; newlines in multi-line fields become `<br/>`.
- New page `src/pages/LetterheadPage.tsx`, route registered in `src/App.tsx` behind the same guard style as existing admin routes, extended to accept the `letterhead` tab permission.
- Date handling uses the existing `IsoDatePicker` (stores ISO, displays `dd/mm/yyyy`).
- Page colours use semantic tokens only; the printed sheet keeps fixed print colours inside the generated document, which is correct for paper output.
- A page title and meta description are set for the route via a small document-head effect.
