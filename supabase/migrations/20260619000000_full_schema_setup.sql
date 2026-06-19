-- ============================================================
-- Dawaa+ — Full schema setup (idempotent)
-- Safe to run on a fresh project or an existing one.
-- Creates all tables, columns, and RLS policies the app expects.
-- ============================================================

-- ── Medications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medications (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  form TEXT NOT NULL,
  dosage NUMERIC NOT NULL DEFAULT 0,
  concentration TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily',
  times JSONB NOT NULL DEFAULT '[]',
  start_date TEXT,
  is_chronic BOOLEAN NOT NULL DEFAULT false,
  duration_days INTEGER,
  meal_relation TEXT NOT NULL DEFAULT 'No preference',
  notes TEXT DEFAULT '',
  stock NUMERIC NOT NULL DEFAULT 0,
  initial_stock NUMERIC,
  image_url TEXT,
  expiry_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS expiry_date TEXT;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own medications" ON public.medications;
CREATE POLICY "Users manage own medications" ON public.medications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Blood pressure readings ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blood_pressure_readings (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  systolic INTEGER NOT NULL,
  diastolic INTEGER NOT NULL,
  heart_rate INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'Morning',
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_pressure_readings ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
ALTER TABLE public.blood_pressure_readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own readings" ON public.blood_pressure_readings;
CREATE POLICY "Users manage own readings" ON public.blood_pressure_readings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Appointments ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_name TEXT,
  specialty TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT DEFAULT '',
  reminder_before TEXT DEFAULT '15',
  notes TEXT DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own appointments" ON public.appointments;
CREATE POLICY "Users manage own appointments" ON public.appointments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Lab tests ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_tests (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT DEFAULT '',
  file_url TEXT,
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own lab tests" ON public.lab_tests;
CREATE POLICY "Users manage own lab tests" ON public.lab_tests FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Dose records ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dose_records (
  id TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id TEXT NOT NULL,
  medication_name TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  taken_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dose_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own dose records" ON public.dose_records;
CREATE POLICY "Users manage own dose records" ON public.dose_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── User settings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'ar',
  user_name TEXT DEFAULT '',
  notifications BOOLEAN NOT NULL DEFAULT false,
  voice_notifications BOOLEAN NOT NULL DEFAULT false,
  reminder_before TEXT NOT NULL DEFAULT '5',
  escalation_on_missed BOOLEAN NOT NULL DEFAULT false,
  emergency_contact JSONB,
  daily_summary BOOLEAN NOT NULL DEFAULT false,
  daily_summary_time TEXT NOT NULL DEFAULT '08:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Extra profile / reminder columns expected by the app
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS chronic_diseases TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS custom_diseases TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS bp_reminders BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS bp_custom_times TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS blood_sugar_reminders BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS blood_sugar_custom_times TEXT;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own settings" ON public.user_settings;
CREATE POLICY "Users manage own settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
