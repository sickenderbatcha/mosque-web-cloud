# Committee form: make Mobile Number and Address visible on desktop

The Add/Edit Committee Member dialog already contains the Mobile Number and Address fields, and the database has the `phone` and `address` columns. The problem is layout: on desktop the dialog is a narrow single column (`max-w-md`) whose content is taller than the viewport, so those two fields and the Save/Cancel row sit below the visible area.

## Change (src/pages/admin/tabs/CommitteeTab.tsx)

- Widen the dialog on desktop (`sm:max-w-2xl`) and lay the fields out in two columns from `sm` upward: Name / Position, Father's Name / Qualification, Mobile Number / Sort Order, Address (full width), Photo (full width).
- Restructure the dialog into three parts so nothing can be cut off:
  - fixed title at the top,
  - scrollable field area in the middle (`overflow-y-auto`, capped so the whole dialog stays within `85vh`),
  - Save/Cancel row pinned at the bottom, always visible.
- Keep mobile as a single column stack.

No database, data, or business-logic changes.

## If it still looks unchanged

The app is a PWA with cached assets; after this change a hard refresh (or reopening the installed app) may be needed to pick up the new build.
