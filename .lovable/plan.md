# Configurable Mahal Booking Services

Replace the three hard-coded booking services (Nikkah Book, Hall, Dining Hall) with a fully manageable list in the admin Settings tab. Admins can add, edit, delete and reorder services, each with a Tamil name, English name and rate.

## Admin experience

The existing "Mahal Booking Rates (மண்டப கட்டணம்)" card becomes a service list manager:

- A row per service showing Tamil name, English name and rate, with Edit and Delete actions.
- "Add Service" opens a dialog with Tamil name, English name and rate (positive number) fields.
- Up/down controls to change the order services appear on the booking page.
- Save writes the whole list at once, with success/error toasts.
- On first load, if nothing has been configured yet, the list is seeded with the current three services and their present rates so nothing changes visually until an admin edits it.

## Booking page

The Mahal Booking page renders one checkbox card per configured service (Tamil + English name, rate), in the admin-defined order. Total, receipt lines, confirmation summary and the admin notification list all follow the same list. Removing a service in settings simply removes its card; it does not alter bookings already made (their stored service names and amounts stay as recorded).

## Technical notes

- Store the list in `app_settings` under a new key `mahal_booking_services`: a JSON array of `{ id, nameTamil, nameEnglish, rate, sortOrder }`, saved via the existing `upsertAppSetting` helper (upsert on `key`). `id` is a stable slug/uuid generated on creation so selections and stored receipts stay tied to a service.
- New `src/lib/mahalServiceSettings.ts`: interface, defaults (the current three entries with rates 3000 / 15000 / 7000 falling back to the legacy `booking_rate_*` keys if present), a parse/normalise helper, and `getMahalBookingServices()`.
- `src/pages/MahalBookingPage.tsx`: replace the hard-coded `services` memo and the fixed `selectedServices` object (`nikkahBook`/`hall`/`food`) with a list driven from settings and a `Record<string, boolean>` (or `Set` of ids) selection state. `calculateTotal`, `handleServiceToggle`, the service grid (~line 810), the summary panel (~1392), and the amount computation at ~1612 all iterate the dynamic list.
- `src/pages/admin/tabs/SettingsTab.tsx`: replace `BOOKING_RATE_TYPES`, `getBookingRateSetting`, `openBookingRateDialog` and the three fixed rate tiles with the list manager UI and a single add/edit dialog.
- `supabase/functions/create-razorpay-order/index.ts`: `resolveBookingComboAmount` currently enumerates subsets of the three `booking_rate_*` keys. Change it to read `mahal_booking_services` and enumerate subsets of the configured rates (falling back to the legacy keys/defaults when the new key is absent). Subset enumeration is capped (e.g. up to ~16 services) and falls back to a bounded subset-sum check beyond that, so amount validation stays strict.
- Legacy `booking_rate_nikkah_book` / `booking_rate_hall` / `booking_rate_food_facility` keys are read once for seeding and then no longer used; they are left in the table untouched.
- No database migration needed — `app_settings` already exists.
