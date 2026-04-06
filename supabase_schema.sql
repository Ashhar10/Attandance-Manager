-- ================================================
-- HR Work Management App — Supabase SQL Schema
-- Run this in the Supabase SQL Editor
-- ================================================

-- 1. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  employee_id TEXT,
  hr_whatsapp TEXT DEFAULT '',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hr_whatsapp TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Work Sessions
CREATE TABLE IF NOT EXISTS public.work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ NOT NULL,
  check_out_time TIMESTAMPTZ,
  total_time INTERVAL,
  net_time INTERVAL,
  overtime INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Break Sessions
CREATE TABLE IF NOT EXISTS public.break_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_session_id UUID NOT NULL REFERENCES public.work_sessions(id) ON DELETE CASCADE,
  break_start TIMESTAMPTZ NOT NULL,
  break_end TIMESTAMPTZ,
  duration INTERVAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Leave Requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  leave_days INTEGER NOT NULL DEFAULT 1 CHECK (leave_days > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, leave_date)
);

-- 5. Company Holidays
CREATE TABLE IF NOT EXISTS public.company_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- Enable Row Level Security
-- ================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.break_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS Policies
-- ================================================

-- Profiles: users can read/update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Work Sessions: users manage their own
DROP POLICY IF EXISTS "Users manage own work sessions" ON public.work_sessions;
CREATE POLICY "Users manage own work sessions"
  ON public.work_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Break Sessions: access via work_session ownership
DROP POLICY IF EXISTS "Users manage own break sessions" ON public.break_sessions;
CREATE POLICY "Users manage own break sessions"
  ON public.break_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.work_sessions ws
      WHERE ws.id = break_sessions.work_session_id
      AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_sessions ws
      WHERE ws.id = break_sessions.work_session_id
      AND ws.user_id = auth.uid()
    )
  );

-- Leave Requests: users manage their own
DROP POLICY IF EXISTS "Users manage own leave requests" ON public.leave_requests;
CREATE POLICY "Users manage own leave requests"
  ON public.leave_requests FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Company Holidays: all authenticated users can read
DROP POLICY IF EXISTS "All users can view holidays" ON public.company_holidays;
CREATE POLICY "All users can view holidays"
  ON public.company_holidays FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins can insert/update/delete holidays
DROP POLICY IF EXISTS "Admins can manage holidays" ON public.company_holidays;
CREATE POLICY "Admins can manage holidays"
  ON public.company_holidays FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- ================================================
-- Function: auto-create profile on signup
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, hr_whatsapp, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    '',
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
