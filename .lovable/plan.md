# Three fixes: subscription start lock, death/bonafide fees, back office cards

## 1. Lock the "From Period" to the next unpaid month

Today, when a member has no pending months, the next unpaid month is defaulted but both the month and year dropdowns stay editable, so a member can skip ahead (e.g. jump to December) and leave earlier months unpaid.

Change: whenever a next unpaid period is known for the member, the From Period month and year selects are locked to it (same visual treatment already used for forced pending months), with a short note next to the label explaining it is fixed to the next unpaid month. The member can still choose how many months to pay for. Editing stays free when no member is selected or when the lookup failed (the existing retry path is unchanged).

## 2. Separate fees for death and bonafide certificates

Two new settings, `certificate_fee_death` and `certificate_fee_bonafide`, editable in Admin Settings alongside the existing certificate fee cards, both defaulting to 100.

The death register screen already reads `certificate_fee_death`, so it starts honouring the configured value once the setting exists. The public Services page currently charges the single generic `certificate_fee` for marriage, death and bonafide; it will use the death fee for death certificates, the bonafide fee for bonafide certificates, and keep the generic fee for marriage. Displayed amounts, payment amounts and cash requests all use the same resolved fee.

## 3. Back office cards on the homepage for everyone

The homepage back office section is gated twice: by the "Back Office Cards on Homepage" setting, and again per card by an admin/tab-permission check — so non-admin visitors never see them.

Change: when the setting is enabled, the cards render for all visitors, filtered only by the individual card visibility toggles. The destination pages keep their existing protection, so a signed-out visitor clicking a card is sent to login as usual.

## Technical notes

- `src/pages/DonationPage.tsx`: derive `lockFromPeriod = hasForcedPending || (pendingMonthsChecked && nextUnpaidPeriod !== null)`; apply to the `disabled` prop and styling of the From month/year selects and to the label hint.
- `src/pages/admin/tabs/SettingsTab.tsx`: extend `certificateFeeDialogType` to include `death` and `bonafide`, add the two fee cards and map each type to its `app_settings` key in `saveCertificateFee`.
- `src/pages/ServicesPage.tsx`: request `certificate_fee_death` and `certificate_fee_bonafide` from `useAppSettings` and pick the fee per active certificate type instead of the single `certificateFee` constant.
- `src/pages/HomePage.tsx`: drop `(isAdmin || canAccessTab(item.tabKey))` from the `backOfficeItems` filter.
- No database schema changes; the new fees live in `app_settings`.
