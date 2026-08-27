# Six fixes: dashboard count, donation cash fallback, settings and death certificate

## 1. Member dashboard "பணம் செலுத்தியது" count

The card currently adds only bookings, certificate payments, NOC and heir requests. The Payments tab on the same screen also lists completed donations and subscriptions, so the card is lower than the list below it.

Change: derive a single memoised paid count from the same five sources the Payments tab uses (paid bookings, completed certificate payments, completed NOC, completed heir, completed donations, completed subscriptions) and use it for both the card and the "no payments" check, so the number and the list always agree.

## 2. Anonymous donation — wrong "request already sent" on payment failure

The cash payment dialog looks up an existing request by service type plus reference id only. For donations the reference is the donation row, but repeated attempts by an anonymous donor can reuse/hit an earlier pending donation request, so the dialog shows "கோரிக்கை ஏற்கனவே அனுப்பப்பட்டுள்ளது" and blocks the form.

Change: the "already sent" block only applies when there is an existing request for the same reference that is still actionable, and it will be skipped for the donation service type when the current attempt created a new donation record. If a genuine duplicate exists, the dialog stays open with the form and shows an informational note instead of blocking. Result: a failed online donation always lets the donor submit a cash payment request for that amount.

## 3. Enable/disable anonymous donation

New app setting `anonymous_donation_enabled` (default on) with a toggle in the Superadmin Settings tab, next to the other donation toggles.

When off, the donation form hides the "Anonymous" checkbox and forces donor name to be required; existing anonymous records are unaffected.

## 4. Yearly subscription availability

Today the yearly option is disabled whenever there are forced pending months. Add: yearly is also allowed (enabled, and the year defaulted) when both hold:

- there are no pending subscription months for the member, and
- the next unpaid month equals `subscription_start_month` from app settings (any year).

In that case the yearly year defaults to the year of that next unpaid month. Otherwise yearly stays disabled with the existing explanation.

## 5. Configurable death certificate body text

New Superadmin setting block "Death Certificate Body Text" (`death_cert_body_text`), following the existing certificate-settings component pattern.

- The settings screen lists every death register field with a serial number (1, 2, 3, …) — name, father/husband name, age, gender, address, occupation, death date, death time, place of death, cause, burial date/time/place, informant fields, witnesses, register page number, member id, registrar fields, plus formatted death date.
- In the body textarea the user inserts `@F1`, `@F2`, … and at render time each token is replaced by that field's value from the record. Unknown tokens render as empty text.
- Line breaks in the setting become separate lines in the PDF, keeping the current auto-shrink rendering.
- Both the on-screen preview (`DeathCertificatePreview`) and the PDF (`deathCertificatePdf`) use the same resolver, so they stay identical. If the setting is empty, the current hardcoded wording is used as the default.

## 6. Payment confirmation on the death register details screen

Before starting either payment path from the death record view:

- Cash: confirmation dialog with the message "Collect cash before continue / ரொக்கம் பெற்ற பின் தொடரவும்" and Yes/No buttons. Only on Yes does the cash payment record get created.
- Online: confirmation dialog asking to continue with online payment, Yes/No. Only on Yes does the Razorpay flow start.

## Technical notes

- `src/pages/UserDashboard.tsx`: memoised `paidCount` used at the stats card (line ~1117) and the empty-state condition (line ~1661).
- `src/components/CashPaymentRequestDialog.tsx`: relax the `existingRequest` gate; add an `allowDuplicate` prop set by the donation flow in `src/pages/DonationPage.tsx`.
- New setting keys via existing `upsertAppSetting` helper: `anonymous_donation_enabled`, `death_cert_body_text`.
- New components `src/components/admin/DeathCertificateBodySettings.tsx` and a shared `src/lib/deathCertificateBody.ts` (field table + `@F` token resolver), wired into `SuperAdminSettingsTab.tsx`.
- `src/pages/DonationPage.tsx`: anonymous toggle gating, and yearly-eligibility logic in the pending-months effect using `subscription_start_month`.
- `src/pages/admin/tabs/DeathRegisterTab.tsx`: AlertDialog wrappers around `handleCashPayment` and `handleRazorpayPayment`.
- No database schema changes; all new configuration lives in `app_settings`.
