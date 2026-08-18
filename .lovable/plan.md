# Fix the Management Committee member form

## Goal
Make the Add/Edit Committee Member form reliably show every field on desktop and keep Save/Cancel reachable at all viewport heights.

## Implementation
- Replace the modal's fragile grid sizing with an explicit three-row layout: fixed header, `min-h-0` scrollable form body, and fixed footer.
- Bound the dialog with viewport height and width constraints so the body—not the entire modal—scrolls.
- Keep the desktop form as two columns, with Mobile Number visible as a normal field and Address spanning the full width.
- Preserve the existing add/edit state, validation, photo upload, and save logic.
- Add stable field identifiers and labels so Mobile Number and Address can be verified directly in the rendered dialog.

## Verification
- Open both Add and Edit dialogs at the reported desktop viewport.
- Confirm Mobile Number and Address are visible and editable.
- Confirm the form body scrolls independently and Save/Cancel remain visible and clickable.
- Check a smaller desktop-height viewport to ensure the same behavior without clipping.