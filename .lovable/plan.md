

# Comprehensive Security Review - Findings and Remediation Plan

## Summary

After a thorough review of your database policies, backend functions, authentication flow, and client-side code, I found **several critical and moderate security issues** that should be addressed. Here is a prioritized breakdown:

---

## CRITICAL ISSUES (Fix Immediately)

### 1. Hardcoded Secret Keys Exposed in Code

The admin setup, superadmin setup, and emergency password reset functions use hardcoded secret keys like `MOSQUE_ADMIN_SETUP_2024` and `MOSQUE_EMERGENCY_RESET_2026`. Worse, the setup-admin key is **also visible in the login page client code**, meaning anyone can view the source and call the function to reset the admin password to `admin123`.

**Fix:**
- Move all secret keys to environment variables (backend secrets)
- Remove the "Setup Admin" button from the login page entirely (admin already exists)
- Consider removing the `emergency-password-reset` function or restricting it further

### 2. Password Reset Tokens Publicly Readable

The `password_reset_tokens` table has a SELECT policy of `USING (true)`, meaning **anyone** can read all active reset tokens. An attacker could:
1. Request a password reset for any member
2. Immediately query the tokens table to steal the reset code
3. Reset the victim's password

**Fix:**
- Remove the public SELECT policy entirely
- Token verification already happens in the backend function using the service role key, so client-side access is unnecessary

### 3. 1,541 Member Records Publicly Accessible

The `gb_members` table allows anyone (even unauthenticated users) to read all active member records, exposing names, phone numbers, email addresses, physical addresses, dates of birth, blood groups, and more.

**Fix:**
- Restrict SELECT to authenticated users only, or to admins + individual members viewing their own record
- The Members Directory page should require login

### 4. Pending Users Table Stores Passwords in Plain Text

The `pending_users` table has a column called `password_hash`, but it actually stores the **raw password in plain text**. Additionally, the DELETE policy allows any anonymous user to delete any pending registration without identity verification.

**Fix:**
- Redesign the registration flow to avoid storing passwords, or hash them before storage
- Fix the DELETE policy to include proper identity checks

### 5. Death Records Publicly Readable

The `death_registers` table allows anyone to read all records including deceased names, addresses, causes of death, and informant contact details.

**Fix:**
- Restrict SELECT to admin/superadmin roles, or require authentication

---

## MODERATE ISSUES (Fix Soon)

### 6. Multiple Tables Allow Unrestricted Public INSERT

Nine tables (donations, subscriptions, bookings, certificates, event registrations, etc.) use `WITH CHECK (true)` for INSERT, meaning anyone can flood them with spam data.

**Fix:**
- For tables that should require login: change to `WITH CHECK (auth.uid() IS NOT NULL)`
- For genuinely public forms (donations, contact): add rate limiting

### 7. Edge Functions Bypass JWT Verification

All 12+ backend functions have JWT verification disabled. While some implement manual auth checks, critical functions like `create-razorpay-order` have **no authentication at all**, meaning anyone could create payment orders.

**Fix:**
- Enable JWT verification for functions that require authentication (approve-user, admin-reset-password, admin-delete-user, send-notification-email)
- Add input validation to create-razorpay-order

### 8. Email Templates Vulnerable to HTML Injection

User-provided content (names, messages, subjects) is inserted directly into HTML email templates without escaping. Malicious users could inject HTML to create phishing emails.

**Fix:**
- Add HTML escaping helper function to all edge functions that send emails

### 9. Functions Missing search_path Setting

Two database functions (`record_outside_marriage_certificate_payment_income` and `record_certificate_payment_income`) are missing the `SET search_path TO 'public'` setting, which is a security best practice.

### 10. Leaked Password Protection Disabled

The authentication system does not check passwords against known leaked password databases.

---

## Technical Implementation Plan

### Step 1: Fix Password Reset Token Exposure (Critical)
- Drop the public SELECT policy on `password_reset_tokens`
- Token verification is already handled server-side

### Step 2: Restrict Member Data Access
- Update `gb_members` SELECT policy to require authentication
- Update `death_registers` SELECT policy to require authentication or admin role
- Update `gb_family_members` SELECT policy similarly

### Step 3: Secure Edge Functions
- Move hardcoded secret keys to environment variables
- Remove admin setup button from login page
- Add HTML escaping to email templates
- Add input validation to Razorpay function

### Step 4: Fix Pending Users Security
- Fix the DELETE policy to require identity verification
- Consider hashing passwords before storage or redesigning the flow

### Step 5: Tighten INSERT Policies
- Add `auth.uid() IS NOT NULL` checks where authentication is expected
- Keep truly public forms (donations, contact) open but monitor for abuse

### Step 6: Fix Database Function Security
- Add `SET search_path TO 'public'` to the two functions missing it

---

## Impact Assessment

Fixing these issues will:
- **Protect personal data** of 1,541+ members from unauthorized access
- **Prevent account takeover** via token theft or password reset exploitation
- **Prevent spam** and data pollution through unrestricted inserts
- **Harden admin access** by removing hardcoded credentials
- **Protect email recipients** from HTML injection attacks

Some changes (like restricting `gb_members` SELECT) may affect features like the Members Directory or Blood Donor Finder pages, which will need to be updated to work with authenticated-only access.

