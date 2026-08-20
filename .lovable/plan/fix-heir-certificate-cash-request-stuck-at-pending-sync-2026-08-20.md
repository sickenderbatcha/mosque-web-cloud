# Fix: heir certificate cash request stuck at "Pending sync"

## What I confirmed

- The approved heir cash request (₹100, created 20/08/2026) has **no linked record**: its `reference_id` is empty.
- The heir certificate page opens the cash request dialog with an empty reference and, unlike the NOC page, does **not** create the heir certificate record before submitting. NOC passes a "create record first" step; heir does not.
- Because there is no linked record, the receipt screen exits early, no payment record is created, no running receipt number is issued — so the number stays "Pending sync" and Print/Download stay disabled.
- "Mark as paid" only happens after a successful print/download, so the request can never move to paid.

## What will change

1. The heir certificate page will create the heir certificate record first when a member submits a cash payment request, exactly like the NOC page does. The cash request will then carry a proper reference.
2. With a reference present, approving and opening the receipt mints the running receipt number, enabling Print/Download and the automatic "paid" update.
3. Safety net on the admin side: if a certificate-type cash request has no linked record, the receipt screen will say so clearly (instead of a silent "Pending sync") and Print/Download stay disabled.
4. The one already-stuck heir request cannot be repaired automatically — the heir details (list of heirs) were never saved anywhere, only a heir count. It should be cancelled and re-submitted by the member, after which the fixed flow works. I can cancel it for you on request.

## Technical detail

- `src/pages/HeirCertificatePage.tsx`: add an `onBeforeSubmit` handler to `CashPaymentRequestDialog` (mirroring `NocCertificatePage.tsx` lines 1039-1072) that inserts into `heir_certificates` with the current form values (applicant details, deceased details, `heirs` from the filled rows, `status: "payment_pending"`, `payment_status: "pending"`, `user_id: user?.id ?? null`), stores the id in the existing heir-record state and returns it, so `CashPaymentRequestDialog` writes it as `reference_id`. Only wire it when `cashRequestData.referenceId` is empty.
- `src/components/CashPaymentReceipt.tsx`: when the resolved reference is missing for a certificate-style service, set an explicit "record missing" state and show a short bilingual message in the receipt number slot; keep buttons disabled.
- No schema, RLS, or trigger changes.
