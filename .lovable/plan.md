# Configurable Refund Voucher Number (REF)

Today the refund voucher number is hardcoded as `REF-<first 8 chars of refund id>` in the admin Refunds tab, while every other receipt prefix (Booking, Donation, Subscription, Cash, NOC, Heir, General Certificate, Rental) is configurable in Receipt Number Settings.

## What will change

1. **New setting: Refund Voucher (பணத்திரும்ப வவுச்சர்)**
   - Added to Receipt Number Settings alongside the existing eight prefixes.
   - Default value `REF-`, editable and savable like the others, included in the "Reset to defaults" action.

2. **Refund voucher uses the configured prefix**
   - The voucher number printed on the voucher, and the downloaded file name, use the saved prefix instead of the hardcoded `REF-`.
   - If the prefix is left blank or unsaved, it falls back to `REF-` so existing vouchers look unchanged.
   - Number body stays the same (first 8 characters of the refund request ID, uppercase), so previously issued vouchers keep matching.

3. **Live updates**
   - Changing the prefix in settings reflects immediately in the Refunds tab (same realtime behaviour as other prefixes).

No database schema change is needed; the value is stored in the existing app settings store.

## Technical details

- `src/lib/receiptNumberSettings.ts`: add `refund` to `ReceiptType`, `refund_prefix` to the settings interface, `DEFAULT_SETTINGS` (`"REF-"`), and `SETTING_KEYS` (`receipt_num_prefix_refund`).
- `src/hooks/useReceiptNumberSettings.tsx`: add the new key to `RECEIPT_NUMBER_KEYS` and the `keyToField` map.
- `src/components/admin/ReceiptNumberSettings.tsx`: add a row to `RECEIPT_TYPE_LABELS` — label `பணத்திரும்ப வவுச்சர் எண் (Refund Voucher)`, example `REF-`.
- `src/pages/admin/tabs/RefundsTab.tsx`: use `useReceiptNumberSettings().getReceiptNumber("refund", refund.id.substring(0,8).toUpperCase())` for the voucher number in `buildVoucherHTML` and for the download filename, replacing the two hardcoded `REF-` strings.
