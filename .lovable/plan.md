# Refund Voucher: Configurable Prefix + Running Serial Number

Today the refund voucher number is built in the browser as `REF-<first 8 chars of the refund request id>` (admin Refunds tab). It is not configurable, not sequential, and not stored anywhere — so the same refund can print differently over time and the number cannot be reset.

## What will change

1. **New prefix setting: Refund Voucher (பணத்திரும்ப வவுச்சர்)**
   - Appears in Receipt Number Settings next to the existing eight prefixes.
   - Default `REF-`, editable, saved and reset like the others.

2. **Voucher numbers become running serial numbers**
   - Format matches other receipts: `REF-2026-0001`, `REF-2026-0002`, …
   - The number is allocated once, when the refund request is approved, and stored on the refund record. Reprinting or re-downloading always shows the same number.
   - The same number is written to the expense entry the refund already creates, so the ledger and the voucher match.
   - Existing refunds that were already approved keep working: if no stored number exists, the voucher falls back to the old `REF-<id8>` form so previously issued vouchers still match.

3. **Refund added to Receipt Sequence Reset**
   - A "பணத்திரும்ப வவுச்சர் (Refund Voucher)" row joins the other types, with the same Save / Reset to 0 behaviour and year grouping.

## Technical details

Database (migration):
- Add `voucher_number text` to `public.refund_requests`.
- Update `public.handle_approved_refund_expense()` (SECURITY DEFINER, `search_path = public`): on the transition to `approved`, if `voucher_number` is null, read the prefix from `app_settings.key = 'receipt_num_prefix_refund'` (fallback `REF-`), call `public.get_next_receipt_number('refund', <prefix>)`, set it on the refund row, and pass it as the created expense's `receipt_number`.
- No new grants needed; the column is covered by the existing `refund_requests` policies, and `get_next_receipt_number` stays revoked from `anon`/`authenticated` (only the definer trigger calls it).

Frontend:
- `src/lib/receiptNumberSettings.ts`: add `refund` to `ReceiptType`, `refund_prefix` to the settings interface, `DEFAULT_SETTINGS` (`"REF-"`), and `SETTING_KEYS` (`receipt_num_prefix_refund`).
- `src/hooks/useReceiptNumberSettings.tsx`: add the key to `RECEIPT_NUMBER_KEYS` and the `keyToField` map.
- `src/components/admin/ReceiptNumberSettings.tsx`: add a row — label `பணத்திரும்ப வவுச்சர் எண் (Refund Voucher)`, example `REF-`.
- `src/components/admin/ReceiptSequenceResetSettings.tsx`: add `refund: "பணத்திரும்ப வவுச்சர் (Refund Voucher)"` to `RECEIPT_TYPE_LABELS`.
- `src/pages/admin/tabs/RefundsTab.tsx`: select `voucher_number`, add it to the `RefundRequest` interface, and use `refund.voucher_number ?? \`REF-${refund.id.substring(0,8).toUpperCase()}\`` for both the printed voucher number and the download filename, replacing the two hardcoded strings.
