export type Priority = 'low' | 'medium' | 'high';

export interface UserProfile {
  id: string;
  full_name: string;
  study_division: 'scientific_science' | 'scientific_math' | 'literary';
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

// Egyptian Thanaweya Amma Default Subjects
export const THANAWEYA_SUBJECTS = [
  { id: 'arabic', name: 'Arabic (اللغة العربية)', color: '#38bdf8' },
  { id: 'english', name: 'English (اللغة الإنجليزية)', color: '#818cf8' },
  { id: 'french', name: '2nd Language (French / German / Italian)', color: '#c084fc' },
  { id: 'physics', name: 'Physics (الفيزياء)', color: '#f43f5e' },
  { id: 'chemistry', name: 'Chemistry (الكيمياء)', color: '#fb923c' },
  { id: 'biology', name: 'Biology (الأحياء)', color: '#4ade80' },
  { id: 'geology', name: 'Geology (الجيولوجيا)', color: '#a3e635' },
  { id: 'pure_math', name: 'Pure Math (الرياضيات البحتة)', color: '#2dd4bf' },
  { id: 'applied_math', name: 'Applied Math (الرياضيات التطبيقية)', color: '#06b6d4' },
  { id: 'history', name: 'History (التاريخ)', color: '#facc15' },
  { id: 'geography', name: 'Geography (الجغرافيا)', color: '#fbbf24' },
  { id: 'philosophy', name: 'Philosophy (الفلسفة والمنطق)', color: '#e879f9' },
  { id: 'psychology', name: 'Psychology (علم النفس والاجتماع)', color: '#f472b6' },
] as const;
