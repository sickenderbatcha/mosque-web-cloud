# Fix: Committee member add/edit form can't scroll

## Cause (verified)

In the committee admin tab, the Add/Edit dialog is rendered with a fixed width and no height cap or scrolling. The form now has nine blocks (name, position, father's name, qualification, mobile number, address, sort order, photo, action buttons), so on desktop it grows past the viewport: the lower fields (Mobile Number, Address) and the Save/Cancel buttons are pushed off-screen with nothing to scroll.

The mobile number and address inputs are already present in the form markup — they are simply below the cut-off, which is why they appear "missing" on desktop.

## Change

Constrain the dialog to the viewport and make its content scrollable:

- Cap the dialog height (roughly 90% of viewport height) and allow vertical overflow scrolling of the form body.
- Keep the header visible and keep Save/Cancel reachable at the end of the scroll area.
- Widen slightly on larger screens so the two-line Tamil labels and the address textarea aren't cramped.

No changes to save logic, fields, or data handling.

## Verification

Open both Add and Edit dialogs on a desktop-sized window, scroll to the bottom, confirm Mobile Number and Address inputs are visible and Save/Cancel work.
