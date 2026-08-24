# Fix payment history, online payment failure, and letterhead header settings

## 1. Member dashboard — show all payments

The Payments tab currently lists only mahal bookings and `certificate_payments` rows (marriage / death / bonafide / outside marriage). Missing: NOC and heir certificate payments, donations, and subscription payments.

Changes:
- Add NOC and heir paid items to the payment list (data is already loaded in the dashboard, with receipt numbers and payment method resolved).
- Load and list the signed-in member's **donations** and **subscriptions** (paid/completed only), each with amount, date, payment method, receipt number and a View Receipt button reusing the existing donation and subscription receipt components.
- Update the "no payment history" empty state to consider all sources, and sort the combined list newest first.

Donations and subscriptions are not readable by members today (admin-only read rules), so member access is added through two read-only backend functions that match on the member's own identity (membership number / phone from their member record) rather than opening the tables up.

## 2. Online payment for donation / subscription fails

Confirmed root cause by reproducing it against the live backend: creating a subscription or donation as a public visitor **succeeds** when nothing is read back, and fails with `new row violates row-level security policy` only when the app asks for the created row back. Both tables allow anyone to create a record but nobody except admins to read one, and the donation/subscription flows use "insert and return the new row" so they can start the payment.

Fix: add backend functions `create_subscription(...)` and `create_donation(...)` that insert the record and return the new row's id (and receipt-relevant fields) under elevated privileges, and switch the donation/subscription pages to call them instead of the direct insert-and-return. Read rules on the tables stay admin-only, so no donor or member data becomes publicly readable.

Note: my reproduction left two throwaway rows (a `TESTZZ` subscription and a `T` donation) in the database; they will be deleted as part of this work.

## 3. Configurable letterhead header

The letterhead footer is already configurable (Superadmin > Settings > Letterhead Footer). The header (Tamil name, English name, address lines, phone) is still borrowed from Receipt Header Settings.

Changes:
- Extend the letterhead settings card to a full "Letterhead Header & Footer" card with its own Tamil name, English name, address line 1, address line 2, phone, plus the existing Tamil/English footer lines.
- Defaults fall back to the current receipt-header values, so nothing looks different until edited.
- The letterhead preview and print output take the header from these new settings.

## Technical notes

- Migration: `create_subscription` / `create_donation` (SECURITY DEFINER, `search_path = public`) returning the inserted row; `get_my_donations()` / `get_my_subscriptions()` (SECURITY DEFINER) scoped to the caller's `gb_members` record (`auth_user_id = auth.uid()`) matching on `member_id` and normalised phone. Existing triggers on both tables (income posting, subscription slots) keep working since the insert still happens on the table.
- `src/lib/letterheadSettings.ts`: add `orgNameTa`, `orgNameEn`, `addressLine1`, `addressLine2`, `phone` with keys `letterhead_org_name_ta|_en`, `letterhead_address_line1|2`, `letterhead_phone`; hook `useLetterheadSettings` merges them over receipt-header defaults.
- `src/components/admin/LetterheadFooterSettings.tsx`: renamed content to cover header fields too (same atomic upsert on `key`).
- `src/pages/LetterheadPage.tsx`: build `LetterheadBranding` from letterhead settings instead of `useReceiptHeaderSettings`.
- `src/pages/DonationPage.tsx`: replace the three `supabase.from("subscriptions").insert(...).select().single()` calls and the donation insert with `supabase.rpc(...)`.
- `src/pages/UserDashboard.tsx`: extend the payments tab list (NOC, heir, donations, subscriptions) and the empty-state condition.
