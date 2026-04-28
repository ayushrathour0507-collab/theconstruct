CREATE POLICY "feedback_delete_own_within_24h"
ON public.feedback
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND created_at > now() - interval '24 hours');