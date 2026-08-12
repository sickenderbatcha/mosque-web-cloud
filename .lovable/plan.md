# Add Letterhead to navigation and related places

The Letterhead Generator page already exists at `/letterhead`, but it is only reachable from a small link on the Admin Dashboard header. This adds it to the normal Back Office navigation surfaces, using the same visibility and permission rules as the other back-office items.

## Where it will appear

1. Header menu (desktop) — new "கடிதத் தலைப்பு / Letterhead" entry inside the existing Back Office dropdown.
2. Header menu (mobile) — same entry in the Back Office section of the slide-out menu.
3. Homepage Back Office cards — a new Letterhead card with a document/signature icon, alongside Income, Expenses, Registers, Rental and Assets.
4. Superadmin Settings > menu visibility — two new toggles so the nav item and the homepage card can each be switched off.

The existing Admin Dashboard link stays as it is.

## Visibility rules

The item follows exactly the same pattern the other back-office entries use:

- Shown only when the menu-visibility toggle is on, and
- only to admins/superadmins or users granted the existing `letterhead` tab permission.

The `/letterhead` route guard itself is unchanged.

## Technical notes

- `src/components/layout/Header.tsx`: add `{ path: "/letterhead", labelTamil: "கடிதத் தலைப்பு", labelEnglish: "Letterhead", visKey: "nav_backoffice_letterhead", tabKey: "letterhead" }` to `allBackOfficeItems`; existing filter handles access.
- `src/pages/HomePage.tsx`: add the matching entry to the back-office cards array with `visKey: "card_backoffice_letterhead"`, `tabKey: "letterhead"`, `FileSignature` icon from lucide-react.
- `src/hooks/useMenuVisibility.tsx`: add `nav_backoffice_letterhead` and `card_backoffice_letterhead` to `MenuVisibilityConfig` and to `defaultMenuVisibility` (both `true`), so existing stored settings keep working via the spread merge.
- `src/pages/admin/tabs/SuperAdminSettingsTab.tsx`: add the two keys to the back-office nav and card toggle lists (around lines 1886 and 1908).
- No database or backend changes; the `letterhead` tab permission key already exists.
