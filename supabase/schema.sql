-- ==============================================================================
-- Thanaweya Dashboard: Supabase PostgreSQL Schema with Row Level Security (RLS)
-- ==============================================================================

-- 1. PROFILES TABLE (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  study_division TEXT DEFAULT 'medical_life_sciences', -- 'medical_life_sciences', 'engineering_cs', 'business', 'humanities_arts'
  target_percentage NUMERIC(5,2) DEFAULT 95.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TIMETABLE TABLE
CREATE TABLE IF NOT EXISTS public.timetable (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0: Saturday, 1: Sunday, ..., 6: Friday
  subject TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  room_or_teacher TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  due_date DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. EXAMS TABLE
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  exam_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. GRADES TABLE
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  score NUMERIC(6,2) NOT NULL,
  max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
  weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STUDY SESSIONS TABLE (Pomodoro / Focus Tracking)
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. FLASHCARD DECKS
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. FLASHCARDS
CREATE TABLE IF NOT EXISTS public.flashcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  times_reviewed INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. HABITS TABLE
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('sleep', 'revision', 'custom')),
  target_value NUMERIC(5,2) DEFAULT 1,
  unit TEXT DEFAULT 'done',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. HABIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  value NUMERIC(5,2) NOT NULL DEFAULT 1,
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, habit_id, date)
);

-- 11. NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TELEGRAM LINKS TABLE
CREATE TABLE IF NOT EXISTS public.telegram_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  link_code TEXT NOT NULL UNIQUE,
  chat_id BIGINT,
  is_linked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  linked_at TIMESTAMPTZ
);

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS POLICIES (Users can only access their own data)
-- ==============================================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Timetable policies
CREATE POLICY "Users can manage their timetable" ON public.timetable
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Assignments policies
CREATE POLICY "Users can manage their assignments" ON public.assignments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Exams policies
CREATE POLICY "Users can manage their exams" ON public.exams
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grades policies
CREATE POLICY "Users can manage their grades" ON public.grades
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Study sessions policies
CREATE POLICY "Users can manage their study sessions" ON public.study_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Flashcard decks policies
CREATE POLICY "Users can manage their flashcard decks" ON public.flashcard_decks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Flashcards policies
CREATE POLICY "Users can manage their flashcards" ON public.flashcards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Habits policies
CREATE POLICY "Users can manage their habits" ON public.habits
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Habit logs policies
CREATE POLICY "Users can manage their habit logs" ON public.habit_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users can manage their notes" ON public.notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Telegram links policies
CREATE POLICY "Users can manage their telegram links" ON public.telegram_links
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON USER SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, study_division, target_percentage)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student'),
    COALESCE(NEW.raw_user_meta_data->>'study_division', 'medical_life_sciences'),
    COALESCE((NEW.raw_user_meta_data->>'target_percentage')::NUMERIC, 95.0)
  );
  
  -- Insert default habits
  INSERT INTO public.habits (user_id, name, type, target_value, unit)
  VALUES
    (NEW.id, 'Sleep Hours', 'sleep', 7.5, 'hours'),
    (NEW.id, 'Daily Revision Hours', 'revision', 5.0, 'hours'),
    (NEW.id, 'Fajr & Morning Review', 'custom', 1, 'done');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_assignments_user_due ON public.assignments (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_exams_user_date ON public.exams (user_id, exam_date);
CREATE INDEX IF NOT EXISTS idx_grades_user_subject ON public.grades (user_id, subject);
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON public.study_sessions (user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs (user_id, date);
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON public.notes (user_id, is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_links_code ON public.telegram_links (link_code);
CREATE INDEX IF NOT EXISTS idx_telegram_links_chat ON public.telegram_links (chat_id);

-- 13. CHAT MESSAGES TABLE (Synced from Telegram, WhatsApp, and Web AI)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL DEFAULT 'telegram', -- 'telegram' | 'web' | 'whatsapp'
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  media_type TEXT DEFAULT 'text',
  media_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON public.chat_messages(user_id, created_at DESC);

-- 14. AI ACTIVITY LOGS (Reversible Actions & History Feed)
CREATE TABLE IF NOT EXISTS public.ai_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL, -- 'CREATE_TASK', 'UPDATE_LESSON', 'CANCEL_LESSON', 'CONFLICT_DETECTED', 'DAILY_PLAN'
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'ai_copilot', -- 'whatsapp' | 'telegram' | 'web_importer' | 'ai_copilot'
  target_id TEXT,
  target_table TEXT,
  previous_state JSONB,
  is_undone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI activity" ON public.ai_activity_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own AI activity" ON public.ai_activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own AI activity" ON public.ai_activity_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own AI activity" ON public.ai_activity_logs
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_activity_user_created ON public.ai_activity_logs(user_id, created_at DESC);

-- 15. USER PREFERENCES (Learned scheduling patterns & study habits)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences" ON public.user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 16. ACADEMIC MEMORIES (Persistent Student Strengths, Weak Topics & Pitfalls)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.academic_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  confidence_level TEXT NOT NULL DEFAULT 'low' CHECK (confidence_level IN ('low', 'medium', 'high')),
  common_errors TEXT[] DEFAULT '{}',
  notes TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.academic_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own academic memories" ON public.academic_memories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own academic memories" ON public.academic_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own academic memories" ON public.academic_memories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own academic memories" ON public.academic_memories
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_academic_memories_user ON public.academic_memories(user_id, subject);

-- ==============================================================================
-- 17. MISTAKE BANK (Personal Question & Error Repository)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.mistake_bank (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  question TEXT NOT NULL,
  student_answer TEXT,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  mistake_type TEXT DEFAULT 'concept_gap' CHECK (mistake_type IN ('sign_error', 'concept_gap', 'calculation', 'careless', 'unknown')),
  times_repeated INTEGER NOT NULL DEFAULT 1,
  is_mastered BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.mistake_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mistake bank" ON public.mistake_bank
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own mistake bank" ON public.mistake_bank
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mistake bank" ON public.mistake_bank
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own mistake bank" ON public.mistake_bank
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mistake_bank_user ON public.mistake_bank(user_id, subject, is_mastered);

