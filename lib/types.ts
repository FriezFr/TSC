export type Priority = 'low' | 'medium' | 'high';

export type BaccalaureateTrack =
  | 'medical_life_sciences'   // مسار الطب وعلوم الحياة
  | 'engineering_cs'          // مسار الهندسة وعلوم الحاسب
  | 'business'                // مسار الأعمال
  | 'humanities_arts';        // مسار الآداب والعلوم الإنسانية

// Backward compatibility alias
export type StudyDivision = BaccalaureateTrack | 'scientific_science' | 'scientific_math' | 'literary';

export interface UserProfile {
  id: string;
  full_name: string;
  study_division: StudyDivision;
  target_percentage: number;
  created_at?: string;
}

export interface TimetableSlot {
  id: string;
  user_id?: string;
  day_of_week: number; // 0: Sat, 1: Sun, 2: Mon, 3: Tue, 4: Wed, 5: Thu, 6: Fri
  subject: string;
  start_time: string; // "08:00"
  end_time: string; // "09:30"
  room_or_teacher?: string;
}

export interface Assignment {
  id: string;
  user_id?: string;
  title: string;
  subject: string;
  due_date: string; // YYYY-MM-DD
  priority: Priority;
  is_completed: boolean;
  created_at?: string;
}

export interface Exam {
  id: string;
  user_id?: string;
  subject: string;
  exam_date: string; // YYYY-MM-DD
  notes?: string;
  created_at?: string;
}

export interface GradeItem {
  id: string;
  user_id?: string;
  subject: string;
  title: string;
  score: number;
  max_score: number;
  weight: number;
  date: string;
  created_at?: string;
}

export interface StudySession {
  id: string;
  user_id?: string;
  subject: string;
  duration_minutes: number;
  completed_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  user_id?: string;
  question: string;
  answer: string;
  times_reviewed: number;
  times_correct: number;
  created_at?: string;
}

export interface FlashcardDeck {
  id: string;
  user_id?: string;
  subject: string;
  title: string;
  description?: string;
  card_count?: number;
  created_at?: string;
}

export interface Habit {
  id: string;
  user_id?: string;
  name: string;
  type: 'sleep' | 'revision' | 'custom';
  target_value: number;
  unit: string;
}

export interface HabitLog {
  id: string;
  user_id?: string;
  habit_id: string;
  date: string; // YYYY-MM-DD
  value: number;
  completed: boolean;
}

export interface Note {
  id: string;
  user_id?: string;
  content: string;
  tags?: string[];
  is_pinned?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TelegramLink {
  id: string;
  user_id: string;
  link_code: string;
  chat_id?: number | null;
  is_linked: boolean;
  created_at?: string;
  linked_at?: string | null;
}

// Egyptian Baccalaureate (البكالوريا المصرية) Tracks
export const BACCALAUREATE_TRACKS = [
  { id: 'medical_life_sciences', name: 'الطب وعلوم الحياة', label: 'مسار الطب وعلوم الحياة', en: 'Medical & Life Sciences' },
  { id: 'engineering_cs', name: 'الهندسة وعلوم الحاسب', label: 'مسار الهندسة وعلوم الحاسب', en: 'Engineering & CS' },
  { id: 'business', name: 'الأعمال والإدارة', label: 'مسار الأعمال', en: 'Business & Economics' },
  { id: 'humanities_arts', name: 'الآداب والعلوم الإنسانية', label: 'مسار الآداب والفنون والعلوم الإنسانية', en: 'Humanities & Arts' },
] as const;

// Egyptian Baccalaureate Subjects (مواد البكالوريا المصرية)
export const BACCALAUREATE_SUBJECTS = [
  // Core Common Subjects (المواد العامة المشتركة)
  { id: 'arabic', name: 'Arabic (اللغة العربية)' },
  { id: 'english', name: 'English (اللغة الإنجليزية الأولى)' },
  { id: 'history', name: 'History (التاريخ)' },

  // Medical & Life Sciences Track (مسار الطب وعلوم الحياة)
  { id: 'biology', name: 'Biology (الأحياء - مستوى متقدم)' },
  { id: 'chemistry', name: 'Chemistry (الكيمياء - مستوى متقدم)' },
  { id: 'physics', name: 'Physics (الفيزياء)' },

  // Engineering & CS Track (مسار الهندسة وعلوم الحاسب)
  { id: 'pure_math', name: 'Mathematics (الرياضيات - مستوى متقدم)' },
  { id: 'programming_ai', name: 'Programming & AI (البرمجة والذكاء الاصطناعي)' },

  // Business Track (مسار الأعمال)
  { id: 'economics', name: 'Economics (الاقتصاد - مستوى متقدم)' },
  { id: 'business_mgmt', name: 'Accounting & Business (المحاسبة وإدارة الأعمال)' },

  // Humanities & Arts Track (مسار الآداب والفنون والعلوم الإنسانية)
  { id: 'geography', name: 'Geography (الجغرافيا - مستوى متقدم)' },
  { id: 'psychology', name: 'Psychology (علم النفس)' },
  { id: 'statistics', name: 'Statistics (الإحصاء)' },
  { id: 'second_lang', name: 'Second Language (اللغة الأجنبية الثانية)' },
] as const;

// Backwards compatibility alias
export const THANAWEYA_SUBJECTS = BACCALAUREATE_SUBJECTS;
