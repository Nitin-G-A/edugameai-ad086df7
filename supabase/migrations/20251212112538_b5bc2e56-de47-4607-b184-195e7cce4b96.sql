-- Create a table to store teacher invite codes
CREATE TABLE public.teacher_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamp with time zone,
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_invite_codes ENABLE ROW LEVEL SECURITY;

-- Only teachers can view invite codes they created
CREATE POLICY "Teachers can view their invite codes"
ON public.teacher_invite_codes FOR SELECT
USING (created_by = auth.uid());

-- Only teachers can create invite codes
CREATE POLICY "Teachers can create invite codes"
ON public.teacher_invite_codes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'teacher'));

-- Insert a default master invite code for initial teacher setup
-- This code never expires and can be used multiple times
INSERT INTO public.teacher_invite_codes (code, is_active, expires_at)
VALUES ('TEACHER2024', true, NULL);

-- Create a function to validate and use a teacher invite code
CREATE OR REPLACE FUNCTION public.use_teacher_invite_code(p_code text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
BEGIN
  -- Find valid invite code (case insensitive)
  SELECT * INTO v_code_record
  FROM public.teacher_invite_codes
  WHERE upper(code) = upper(p_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (used_by IS NULL OR code = 'TEACHER2024'); -- Master code can be reused
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Update the user's role to teacher
  UPDATE public.user_roles
  SET role = 'teacher'
  WHERE user_id = p_user_id;
  
  -- Mark the code as used (except master code)
  IF v_code_record.code != 'TEACHER2024' THEN
    UPDATE public.teacher_invite_codes
    SET used_by = p_user_id, used_at = now(), is_active = false
    WHERE id = v_code_record.id;
  END IF;
  
  RETURN true;
END;
$$;