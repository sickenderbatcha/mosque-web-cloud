# Header Auth Button Label Change

## Goal
Change the merged desktop auth dropdown trigger label so it always displays the logged-in user's name/username, instead of showing role labels like "சூப்பர் நிர்வாகி" or "நிர்வாக பலகை". This applies to all users (superadmin, admin, tab-access users, and regular users). The dropdown menu items themselves will continue to show the role-specific dashboard links.

## Current state
In `src/components/layout/Header.tsx`, the `AuthButton` component currently sets the trigger label based on role:
- Superadmin: `"சூப்பர் நிர்வாகி"`
- Admin/tab-access: `"நிர்வாக பலகை"`
- Regular user: `user.user_metadata?.full_name || user.email?.split("@")[0]`

## Proposed change
1. In `AuthButton`, change `triggerLabel` to always resolve to the user's display name: `user.user_metadata?.full_name || user.email?.split("@")[0]`.
2. Keep `triggerVariant` and `TriggerIcon` role-based so superadmin/admin users still get the visual shield/outline cues.
3. Keep all dropdown menu items unchanged — Superadmin Dashboard, Admin Dashboard, My Dashboard, Profile, and Sign out remain accessible inside the dropdown.
4. This change is desktop-only; the existing mobile `MobileAuthButton` remains unchanged.

## Files to modify
- `src/components/layout/Header.tsx` (single-line change in `triggerLabel` logic)

## Verification
- Build/typecheck passes.
- Preview confirms the header auth button shows the username for admin/superadmin users instead of role labels.
