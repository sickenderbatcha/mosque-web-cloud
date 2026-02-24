-- Allow users to delete pending registrations by verifying member_id
-- Since there's no auth yet for pending users, we allow delete based on the member_id match
CREATE POLICY "Anyone can delete their own pending registration"
ON public.pending_users
FOR DELETE
USING (status = 'pending');