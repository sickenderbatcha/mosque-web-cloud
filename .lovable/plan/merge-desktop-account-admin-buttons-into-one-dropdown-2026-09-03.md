# Merge desktop account/admin buttons into one dropdown

## Problem

On large screens the right side of the navigation bar currently renders up to four separate controls for a signed-in superadmin: the Superadmin button (சூப்பர் நிர்வாகி), the Admin button (நிர்வாக பலகை), the user dropdown (My Dashboard / Profile) and the Sign out button. Together they take enough horizontal space that main menu items get pushed into the horizontally scrolling area and appear hidden.

## Change

Desktop only (`lg` and up). Mobile navigation stays exactly as it is today.

Replace the separate Superadmin button, Admin button, and user dropdown with a **single dropdown button**:

- Button label:
  - Superadmin: `சூப்பர் நிர்வாகி` (destructive style, shield icon) — as requested.
  - Admin or user with tab access: `நிர்வாக பலகை` (outline, shield icon).
  - Regular signed-in user: their name (current behaviour).
- Dropdown contents, shown only when the user qualifies:
  1. Email (disabled, small text)
  2. Superadmin Dashboard → `/superadmin` (superadmin only)
  3. Admin Dashboard → `/admin` (admin or tab access)
  4. My Dashboard → `/dashboard`
  5. Profile → `/profile`
  6. Separator + Sign out (வெளியேறு)

Sign out moves inside the dropdown so the desktop bar keeps only: dark-mode toggle + one account button. Signed-out users keep the single உள்நுழை login button.

## Technical notes

- Single file: `src/components/layout/Header.tsx`.
- Rework the desktop `AuthButton` component to include the role-based label and menu items; delete the two standalone `isSuperAdmin` / `(isAdmin || hasTabAccess)` buttons from the desktop cluster (lines ~347–363).
- Role flags already available: `isSuperAdmin`, `isAdmin`, `hasTabAccess` from `useUserRole` / `useUserTabPermissions`.
- `MobileAuthButton` and the mobile menu markup are untouched.
