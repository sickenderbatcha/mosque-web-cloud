# Fix Committee member Add/Edit dialog scrolling

The Add/Edit Committee Member dialog renders a tall form (name, position, father's name, qualification, mobile, address, sort order, photo, buttons). The dialog content has no height cap or scrolling, so on desktop the form overflows past the viewport: the lower fields (Mobile Number, Address) and the Save/Cancel buttons are cut off and unreachable.

## Change

In `src/pages/admin/tabs/CommitteeTab.tsx`, on the dialog container:
- Cap the dialog height to the viewport (`max-h-[90vh]`) and make its body scroll (`overflow-y-auto`).
- Keep the title visible at the top and the Save/Cancel row reachable at the end of the scroll area.

No database, data, or business-logic changes. Mobile Number and Address fields already exist in the form and will become visible once scrolling works.
