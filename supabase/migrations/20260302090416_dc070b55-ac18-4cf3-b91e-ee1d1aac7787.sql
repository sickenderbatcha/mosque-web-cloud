-- Make password_hash nullable since we will no longer store passwords
ALTER TABLE public.pending_users ALTER COLUMN password_hash DROP NOT NULL;

-- Clear any existing plaintext passwords from the table
UPDATE public.pending_users SET password_hash = NULL;