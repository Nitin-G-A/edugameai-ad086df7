CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'student',
    'teacher'
);


--
-- Name: assignment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assignment_status AS ENUM (
    'pending',
    'submitted',
    'graded'
);


--
-- Name: quiz_difficulty; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quiz_difficulty AS ENUM (
    'easy',
    'medium',
    'hard'
);


--
-- Name: subject_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subject_type AS ENUM (
    'computer_science',
    'stem',
    'humanities'
);


--
-- Name: generate_join_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_join_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
    RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: set_class_join_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_class_join_code() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
        NEW.join_code := public.generate_join_code();
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: assignment_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    student_id uuid NOT NULL,
    content text,
    file_url text,
    status public.assignment_status DEFAULT 'pending'::public.assignment_status,
    grade integer,
    feedback text,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    graded_at timestamp with time zone
);


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    instructions text NOT NULL,
    class_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    max_points integer DEFAULT 100,
    deadline timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    file_url text
);


--
-- Name: class_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    student_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    subject public.subject_type NOT NULL,
    join_code text NOT NULL,
    teacher_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: doubts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doubts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    class_id uuid,
    subject public.subject_type NOT NULL,
    question text NOT NULL,
    ai_response text,
    is_resolved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lesson_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    teacher_id uuid NOT NULL,
    subject public.subject_type NOT NULL,
    unit_name text NOT NULL,
    class_level text NOT NULL,
    objectives jsonb DEFAULT '[]'::jsonb,
    activities jsonb DEFAULT '[]'::jsonb,
    common_mistakes jsonb DEFAULT '[]'::jsonb,
    quiz_questions jsonb DEFAULT '[]'::jsonb,
    class_flow text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mistake_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mistake_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    subject public.subject_type NOT NULL,
    original_answer text NOT NULL,
    file_url text,
    mistake_analysis text,
    correct_solution text,
    practice_questions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    avatar_url text,
    xp integer DEFAULT 0,
    level integer DEFAULT 1,
    streak_days integer DEFAULT 0,
    last_activity_date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quiz_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    student_id uuid NOT NULL,
    answers jsonb DEFAULT '[]'::jsonb NOT NULL,
    score integer,
    xp_earned integer DEFAULT 0,
    completed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    subject public.subject_type NOT NULL,
    difficulty public.quiz_difficulty DEFAULT 'medium'::public.quiz_difficulty NOT NULL,
    questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    class_id uuid,
    teacher_id uuid NOT NULL,
    time_limit_minutes integer,
    xp_reward integer DEFAULT 10,
    deadline timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: study_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.study_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    title text NOT NULL,
    subject public.subject_type,
    scheduled_date date NOT NULL,
    scheduled_time time without time zone,
    duration_minutes integer,
    is_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    title text NOT NULL,
    original_content text,
    summary text NOT NULL,
    key_points jsonb DEFAULT '[]'::jsonb,
    flashcards jsonb DEFAULT '[]'::jsonb,
    quiz_questions jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assignment_submissions assignment_submissions_assignment_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_assignment_id_student_id_key UNIQUE (assignment_id, student_id);


--
-- Name: assignment_submissions assignment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: class_members class_members_class_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_members
    ADD CONSTRAINT class_members_class_id_student_id_key UNIQUE (class_id, student_id);


--
-- Name: class_members class_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_members
    ADD CONSTRAINT class_members_pkey PRIMARY KEY (id);


--
-- Name: classes classes_join_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_join_code_key UNIQUE (join_code);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: doubts doubts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doubts
    ADD CONSTRAINT doubts_pkey PRIMARY KEY (id);


--
-- Name: lesson_plans lesson_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_pkey PRIMARY KEY (id);


--
-- Name: mistake_reviews mistake_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mistake_reviews
    ADD CONSTRAINT mistake_reviews_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: quiz_submissions quiz_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_submissions
    ADD CONSTRAINT quiz_submissions_pkey PRIMARY KEY (id);


--
-- Name: quiz_submissions quiz_submissions_quiz_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_submissions
    ADD CONSTRAINT quiz_submissions_quiz_id_student_id_key UNIQUE (quiz_id, student_id);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: study_plans study_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plans
    ADD CONSTRAINT study_plans_pkey PRIMARY KEY (id);


--
-- Name: summaries summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.summaries
    ADD CONSTRAINT summaries_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: classes trigger_set_class_join_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_class_join_code BEFORE INSERT ON public.classes FOR EACH ROW EXECUTE FUNCTION public.set_class_join_code();


--
-- Name: classes update_classes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: assignment_submissions assignment_submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- Name: assignment_submissions assignment_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: class_members class_members_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_members
    ADD CONSTRAINT class_members_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: class_members class_members_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_members
    ADD CONSTRAINT class_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: classes classes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: doubts doubts_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doubts
    ADD CONSTRAINT doubts_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;


--
-- Name: doubts doubts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doubts
    ADD CONSTRAINT doubts_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: lesson_plans lesson_plans_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_plans
    ADD CONSTRAINT lesson_plans_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mistake_reviews mistake_reviews_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mistake_reviews
    ADD CONSTRAINT mistake_reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quiz_submissions quiz_submissions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_submissions
    ADD CONSTRAINT quiz_submissions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- Name: quiz_submissions quiz_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_submissions
    ADD CONSTRAINT quiz_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quizzes quizzes_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: quizzes quizzes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: study_plans study_plans_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.study_plans
    ADD CONSTRAINT study_plans_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: summaries summaries_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.summaries
    ADD CONSTRAINT summaries_student_id_fkey FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: classes Anyone authenticated can view classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authenticated can view classes" ON public.classes FOR SELECT TO authenticated USING (true);


--
-- Name: assignments Class members and teachers can view assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Class members and teachers can view assignments" ON public.assignments FOR SELECT TO authenticated USING (((teacher_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.class_members
  WHERE ((class_members.class_id = assignments.class_id) AND (class_members.student_id = auth.uid()))))));


--
-- Name: class_members Class members and teachers can view members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Class members and teachers can view members" ON public.class_members FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = class_members.class_id) AND (classes.teacher_id = auth.uid()))))));


--
-- Name: doubts Students can create doubts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can create doubts" ON public.doubts FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'student'::public.app_role) AND (student_id = auth.uid())));


--
-- Name: mistake_reviews Students can create mistake reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can create mistake reviews" ON public.mistake_reviews FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'student'::public.app_role) AND (student_id = auth.uid())));


--
-- Name: summaries Students can create summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can create summaries" ON public.summaries FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'student'::public.app_role) AND (student_id = auth.uid())));


--
-- Name: study_plans Students can delete their study plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can delete their study plans" ON public.study_plans FOR DELETE TO authenticated USING ((student_id = auth.uid()));


--
-- Name: summaries Students can delete their summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can delete their summaries" ON public.summaries FOR DELETE TO authenticated USING ((student_id = auth.uid()));


--
-- Name: class_members Students can join classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can join classes" ON public.class_members FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'student'::public.app_role) AND (student_id = auth.uid())));


--
-- Name: class_members Students can leave classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can leave classes" ON public.class_members FOR DELETE TO authenticated USING ((student_id = auth.uid()));


--
-- Name: study_plans Students can manage their study plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can manage their study plans" ON public.study_plans FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'student'::public.app_role) AND (student_id = auth.uid())));


--
-- Name: assignment_submissions Students can submit assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can submit assignments" ON public.assignment_submissions FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'student'::public.app_role) AND (student_id = auth.uid())));


--
-- Name: quiz_submissions Students can submit quiz answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can submit quiz answers" ON public.quiz_submissions FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'student'::public.app_role) AND (student_id = auth.uid())));


--
-- Name: doubts Students can update their doubts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can update their doubts" ON public.doubts FOR UPDATE TO authenticated USING ((student_id = auth.uid()));


--
-- Name: study_plans Students can update their study plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can update their study plans" ON public.study_plans FOR UPDATE TO authenticated USING ((student_id = auth.uid()));


--
-- Name: quiz_submissions Students can update their submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can update their submissions" ON public.quiz_submissions FOR UPDATE TO authenticated USING ((student_id = auth.uid()));


--
-- Name: assignment_submissions Students can update their submissions, teachers can grade; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can update their submissions, teachers can grade" ON public.assignment_submissions FOR UPDATE TO authenticated USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.assignments
  WHERE ((assignments.id = assignment_submissions.assignment_id) AND (assignments.teacher_id = auth.uid()))))));


--
-- Name: doubts Students can view their own doubts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view their own doubts" ON public.doubts FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR ((class_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.classes
  WHERE ((classes.id = doubts.class_id) AND (classes.teacher_id = auth.uid())))))));


--
-- Name: mistake_reviews Students can view their own mistake reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view their own mistake reviews" ON public.mistake_reviews FOR SELECT TO authenticated USING ((student_id = auth.uid()));


--
-- Name: study_plans Students can view their own study plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view their own study plans" ON public.study_plans FOR SELECT TO authenticated USING ((student_id = auth.uid()));


--
-- Name: summaries Students can view their own summaries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view their own summaries" ON public.summaries FOR SELECT TO authenticated USING ((student_id = auth.uid()));


--
-- Name: assignments Teachers can create assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can create assignments" ON public.assignments FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'teacher'::public.app_role) AND (auth.uid() = teacher_id)));


--
-- Name: classes Teachers can create classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can create classes" ON public.classes FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'teacher'::public.app_role) AND (auth.uid() = teacher_id)));


--
-- Name: lesson_plans Teachers can create lesson plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can create lesson plans" ON public.lesson_plans FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'teacher'::public.app_role) AND (teacher_id = auth.uid())));


--
-- Name: quizzes Teachers can create quizzes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can create quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'teacher'::public.app_role) AND (auth.uid() = teacher_id)));


--
-- Name: assignments Teachers can delete their assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can delete their assignments" ON public.assignments FOR DELETE TO authenticated USING ((auth.uid() = teacher_id));


--
-- Name: lesson_plans Teachers can delete their lesson plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can delete their lesson plans" ON public.lesson_plans FOR DELETE TO authenticated USING ((teacher_id = auth.uid()));


--
-- Name: classes Teachers can delete their own classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can delete their own classes" ON public.classes FOR DELETE TO authenticated USING ((auth.uid() = teacher_id));


--
-- Name: quizzes Teachers can delete their quizzes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can delete their quizzes" ON public.quizzes FOR DELETE TO authenticated USING ((auth.uid() = teacher_id));


--
-- Name: assignments Teachers can update their assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can update their assignments" ON public.assignments FOR UPDATE TO authenticated USING ((auth.uid() = teacher_id));


--
-- Name: lesson_plans Teachers can update their lesson plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can update their lesson plans" ON public.lesson_plans FOR UPDATE TO authenticated USING ((teacher_id = auth.uid()));


--
-- Name: classes Teachers can update their own classes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can update their own classes" ON public.classes FOR UPDATE TO authenticated USING ((auth.uid() = teacher_id));


--
-- Name: quizzes Teachers can update their quizzes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can update their quizzes" ON public.quizzes FOR UPDATE TO authenticated USING ((auth.uid() = teacher_id));


--
-- Name: lesson_plans Teachers can view their own lesson plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view their own lesson plans" ON public.lesson_plans FOR SELECT TO authenticated USING ((teacher_id = auth.uid()));


--
-- Name: quizzes Teachers can view their quizzes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Teachers can view their quizzes" ON public.quizzes FOR SELECT TO authenticated USING (((teacher_id = auth.uid()) OR (class_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.class_members
  WHERE ((class_members.class_id = quizzes.class_id) AND (class_members.student_id = auth.uid()))))));


--
-- Name: user_roles Users can insert their own role on signup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own role on signup" ON public.user_roles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: assignment_submissions Users can view their own or teachers can view all submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own or teachers can view all submissions" ON public.assignment_submissions FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.assignments
  WHERE ((assignments.id = assignment_submissions.assignment_id) AND (assignments.teacher_id = auth.uid()))))));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: quiz_submissions Users can view their own submissions or teachers can view class; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own submissions or teachers can view class" ON public.quiz_submissions FOR SELECT TO authenticated USING (((student_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.quizzes
  WHERE ((quizzes.id = quiz_submissions.quiz_id) AND (quizzes.teacher_id = auth.uid()))))));


--
-- Name: assignment_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: class_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.class_members ENABLE ROW LEVEL SECURITY;

--
-- Name: classes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

--
-- Name: doubts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;

--
-- Name: lesson_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: mistake_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mistake_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: quiz_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: quizzes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

--
-- Name: study_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: summaries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


