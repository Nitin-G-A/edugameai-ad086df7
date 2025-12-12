-- =====================================================
-- FIX 1: Restrict classes table SELECT policy
-- =====================================================

-- Drop the overly permissive policy that exposes join codes
DROP POLICY IF EXISTS "Anyone authenticated can view classes" ON public.classes;

-- Create a restrictive policy that only allows class members and teachers to view class data
CREATE POLICY "Class members and teachers can view classes"
ON public.classes FOR SELECT TO authenticated
USING (
  teacher_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM class_members
    WHERE class_members.class_id = classes.id
    AND class_members.student_id = auth.uid()
  )
);

-- Create a secure function to lookup class by join code (returns only the class ID)
CREATE OR REPLACE FUNCTION public.lookup_class_by_code(code text)
RETURNS TABLE(class_id uuid, class_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name FROM classes WHERE join_code = upper(code) LIMIT 1;
$$;

-- =====================================================
-- FIX 2: Default role assignment via database trigger
-- =====================================================

-- Remove the INSERT policy that allows users to choose their role
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;

-- Create a function to assign default 'student' role on signup
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign student role when a user signs up
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();