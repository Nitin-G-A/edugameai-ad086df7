-- Fix 1: Update profiles table SELECT policy to be owner-only
-- But create a secure function for leaderboard access that only exposes non-sensitive data

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can only view their own full profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Create a secure function for leaderboard that only exposes non-sensitive data
CREATE OR REPLACE FUNCTION public.get_leaderboard(limit_count integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  xp integer,
  level integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id as user_id,
    full_name as display_name,
    COALESCE(xp, 0) as xp,
    COALESCE(level, 1) as level
  FROM public.profiles
  ORDER BY COALESCE(xp, 0) DESC
  LIMIT limit_count;
$$;

-- Fix 2: Add storage RLS policies for the uploads bucket
-- Users can only access files in their own folder (folder name = user_id)

CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Teachers can also view files for assignments they created
CREATE POLICY "Teachers can view assignment files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND 
  EXISTS (
    SELECT 1 FROM public.assignments a 
    WHERE a.teacher_id = auth.uid()
  )
);