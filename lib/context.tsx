'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Assignment,
  Exam,
  Flashcard,
  FlashcardDeck,
  GradeItem,
  Habit,
  HabitLog,
  Note,
  TimetableSlot,
  UserProfile,
} from './types';
import {
  DEMO_ASSIGNMENTS,
  DEMO_EXAMS,
  DEMO_FLASHCARD_DECKS,
  DEMO_FLASHCARDS,
  DEMO_GRADES,
  DEMO_HABITS,
  DEMO_HABIT_LOGS,
  DEMO_NOTES,
  DEMO_PROFILE,
  DEMO_STUDY_SESSIONS,
  DEMO_TIMETABLE,
} from './demoData';
import { getSupabaseClient, isSupabaseConfigured } from './supabase/client';

interface AppContextType {
  isConfigured: boolean;
  isDemoMode: boolean;
  setDemoMode: (val: boolean) => void;
  profile: UserProfile;
  updateProfile: (data: Partial<UserProfile>) => void;
  // Timetable
  timetable: TimetableSlot[];
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id'>) => Promise<void>;
  deleteTimetableSlot: (id: string) => Promise<void>;
  // Assignments
  assignments: Assignment[];
  addAssignment: (item: Omit<Assignment, 'id' | 'is_completed'>) => Promise<void>;
  toggleAssignment: (id: string) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  // Exams
  exams: Exam[];
  addExam: (item: Omit<Exam, 'id'>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  // Grades
  grades: GradeItem[];
  addGrade: (item: Omit<GradeItem, 'id'>) => Promise<void>;
  deleteGrade: (id: string) => Promise<void>;
  // Study Sessions
  sessions: { subject: string; duration_minutes: number; completed_at: string }[];
  logSession: (subject: string, minutes: number) => Promise<void>;
  // Flashcards
  decks: FlashcardDeck[];
  flashcards: Flashcard[];
  addDeck: (subject: string, title: string, description?: string) => Promise<void>;
  addFlashcard: (deckId: string, question: string, answer: string) => Promise<void>;
  recordCardReview: (cardId: string, isCorrect: boolean) => Promise<void>;
  // Habits
  habits: Habit[];
  habitLogs: HabitLog[];
  toggleHabitToday: (habitId: string) => Promise<void>;
  setHabitValueToday: (habitId: string, value: number) => Promise<void>;
  // Notes
  notes: Note[];
  addNote: (content: string, tags?: string[]) => Promise<void>;
  togglePinNote: (id: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  // Telegram Link Code
  telegramCode: string;
  generateTelegramCode: () => Promise<string>;
  telegramLinked: boolean;
  // Reset
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isConfigured] = useState<boolean>(() => isSupabaseConfigured());
  const [isDemoMode, setDemoMode] = useState<boolean>(true);

  // States initialized with demo data or local storage
  const [profile, setProfile] = useState<UserProfile>(DEMO_PROFILE);
  const [timetable, setTimetable] = useState<TimetableSlot[]>(DEMO_TIMETABLE);
  const [assignments, setAssignments] = useState<Assignment[]>(DEMO_ASSIGNMENTS);
  const [exams, setExams] = useState<Exam[]>(DEMO_EXAMS);
  const [grades, setGrades] = useState<GradeItem[]>(DEMO_GRADES);
  const [sessions, setSessions] = useState(DEMO_STUDY_SESSIONS);
  const [decks, setDecks] = useState<FlashcardDeck[]>(DEMO_FLASHCARD_DECKS);
  const [flashcards, setFlashcards] = useState<Flashcard[]>(DEMO_FLASHCARDS);
  const [habits, setHabits] = useState<Habit[]>(DEMO_HABITS);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>(DEMO_HABIT_LOGS);
  const [notes, setNotes] = useState<Note[]>(DEMO_NOTES);
  const [telegramCode, setTelegramCode] = useState<string>('TH89X2');
  const [telegramLinked, setTelegramLinked] = useState<boolean>(false);

  // Load saved local data if present
  useEffect(() => {
    try {
      const savedAssignments = localStorage.getItem('thanaweya_assignments');
      if (savedAssignments) setAssignments(JSON.parse(savedAssignments));

      const savedExams = localStorage.getItem('thanaweya_exams');
      if (savedExams) setExams(JSON.parse(savedExams));

      const savedGrades = localStorage.getItem('thanaweya_grades');
      if (savedGrades) setGrades(JSON.parse(savedGrades));

      const savedNotes = localStorage.getItem('thanaweya_notes');
      if (savedNotes) setNotes(JSON.parse(savedNotes));

      const savedTimetable = localStorage.getItem('thanaweya_timetable');
      if (savedTimetable) setTimetable(JSON.parse(savedTimetable));

      const savedSessions = localStorage.getItem('thanaweya_sessions');
      if (savedSessions) setSessions(JSON.parse(savedSessions));

      const savedHabits = localStorage.getItem('thanaweya_habits');
      if (savedHabits) setHabits(JSON.parse(savedHabits));

      const savedHabitLogs = localStorage.getItem('thanaweya_habit_logs');
      if (savedHabitLogs) setHabitLogs(JSON.parse(savedHabitLogs));

      const savedDecks = localStorage.getItem('thanaweya_decks');
      if (savedDecks) setDecks(JSON.parse(savedDecks));

      const savedCards = localStorage.getItem('thanaweya_cards');
      if (savedCards) setFlashcards(JSON.parse(savedCards));
    } catch {
      // LocalStorage fallback
    }
  }, []);

  // Save changes to localStorage for offline / demo mode continuity
  useEffect(() => {
    try {
      localStorage.setItem('thanaweya_assignments', JSON.stringify(assignments));
    } catch {}
  }, [assignments]);

  useEffect(() => {
    try {
      localStorage.setItem('thanaweya_exams', JSON.stringify(exams));
    } catch {}
  }, [exams]);

  useEffect(() => {
    try {
      localStorage.setItem('thanaweya_grades', JSON.stringify(grades));
    } catch {}
  }, [grades]);

  useEffect(() => {
    try {
      localStorage.setItem('thanaweya_notes', JSON.stringify(notes));
    } catch {}
  }, [notes]);

  useEffect(() => {
    try {
      localStorage.setItem('thanaweya_timetable', JSON.stringify(timetable));
    } catch {}
  }, [timetable]);

  useEffect(() => {
    try {
      localStorage.setItem('thanaweya_sessions', JSON.stringify(sessions));
    } catch {}
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem('thanaweya_habit_logs', JSON.stringify(habitLogs));
    } catch {}
  }, [habitLogs]);

  // Profile
  const updateProfile = (data: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...data }));
  };

  // Timetable Handlers
  const addTimetableSlot = async (slot: Omit<TimetableSlot, 'id'>) => {
    const newSlot: TimetableSlot = { ...slot, id: `tt-${Date.now()}` };
    setTimetable((prev) => [...prev, newSlot]);

    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('timetable').insert([newSlot]);
    }
  };

  const deleteTimetableSlot = async (id: string) => {
    setTimetable((prev) => prev.filter((s) => s.id !== id));
    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('timetable').delete().eq('id', id);
    }
  };

  // Assignment Handlers
  const addAssignment = async (item: Omit<Assignment, 'id' | 'is_completed'>) => {
    const newAssignment: Assignment = {
      ...item,
      id: `as-${Date.now()}`,
      is_completed: false,
      created_at: new Date().toISOString(),
    };
    setAssignments((prev) => [newAssignment, ...prev]);

    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('assignments').insert([newAssignment]);
    }
  };

  const toggleAssignment = async (id: string) => {
    let nextStatus = false;
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          nextStatus = !a.is_completed;
          return { ...a, is_completed: nextStatus };
        }
        return a;
      })
    );

    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('assignments').update({ is_completed: nextStatus }).eq('id', id);
    }
  };

  const deleteAssignment = async (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('assignments').delete().eq('id', id);
    }
  };

  // Exam Handlers
  const addExam = async (item: Omit<Exam, 'id'>) => {
    const newExam: Exam = { ...item, id: `ex-${Date.now()}` };
    setExams((prev) => [...prev, newExam].sort((a, b) => a.exam_date.localeCompare(b.exam_date)));

    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('exams').insert([newExam]);
    }
  };

  const deleteExam = async (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('exams').delete().eq('id', id);
    }
  };

  // Grade Handlers
  const addGrade = async (item: Omit<GradeItem, 'id'>) => {
    const newGrade: GradeItem = { ...item, id: `gr-${Date.now()}` };
    setGrades((prev) => [newGrade, ...prev]);

    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('grades').insert([newGrade]);
    }
  };

  const deleteGrade = async (id: string) => {
    setGrades((prev) => prev.filter((g) => g.id !== id));
    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('grades').delete().eq('id', id);
    }
  };

  // Pomodoro Session Handlers
  const logSession = async (subject: string, minutes: number) => {
    const newSession = {
      subject,
      duration_minutes: minutes,
      completed_at: new Date().toISOString().split('T')[0],
    };
    setSessions((prev) => [newSession, ...prev]);

    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('study_sessions').insert([newSession]);
    }
  };

  // Flashcards Handlers
  const addDeck = async (subject: string, title: string, description?: string) => {
    const newDeck: FlashcardDeck = {
      id: `dk-${Date.now()}`,
      subject,
      title,
      description,
      card_count: 0,
    };
    setDecks((prev) => [...prev, newDeck]);

    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('flashcard_decks').insert([newDeck]);
    }
  };

  const addFlashcard = async (deckId: string, question: string, answer: string) => {
    const newCard: Flashcard = {
      id: `fc-${Date.now()}`,
      deck_id: deckId,
      question,
      answer,
      times_reviewed: 0,
      times_correct: 0,
    };
    setFlashcards((prev) => [...prev, newCard]);
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, card_count: (d.card_count || 0) + 1 } : d))
    );

    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('flashcards').insert([newCard]);
    }
  };

  const recordCardReview = async (cardId: string, isCorrect: boolean) => {
    setFlashcards((prev) =>
      prev.map((c) => {
        if (c.id === cardId) {
          return {
            ...c,
            times_reviewed: c.times_reviewed + 1,
            times_correct: isCorrect ? c.times_correct + 1 : c.times_correct,
          };
        }
        return c;
      })
    );
  };

  // Habits Handlers
  const todayStr = new Date().toISOString().split('T')[0];

  const toggleHabitToday = async (habitId: string) => {
    setHabitLogs((prev) => {
      const existing = prev.find((l) => l.habit_id === habitId && l.date === todayStr);
      if (existing) {
        return prev.map((l) =>
          l.id === existing.id ? { ...l, completed: !l.completed } : l
        );
      } else {
        return [
          ...prev,
          {
            id: `hl-${Date.now()}`,
            habit_id: habitId,
            date: todayStr,
            value: 1,
            completed: true,
          },
        ];
      }
    });
  };

  const setHabitValueToday = async (habitId: string, value: number) => {
    setHabitLogs((prev) => {
      const existing = prev.find((l) => l.habit_id === habitId && l.date === todayStr);
      if (existing) {
        return prev.map((l) =>
          l.id === existing.id ? { ...l, value, completed: value > 0 } : l
        );
      } else {
        return [
          ...prev,
          {
            id: `hl-${Date.now()}`,
            habit_id: habitId,
            date: todayStr,
            value,
            completed: value > 0,
          },
        ];
      }
    });
  };

  // Notes Handlers
  const addNote = async (content: string, tags: string[] = ['Study']) => {
    const newNote: Note = {
      id: `nt-${Date.now()}`,
      content,
      tags,
      is_pinned: false,
      created_at: new Date().toISOString().split('T')[0],
    };
    setNotes((prev) => [newNote, ...prev]);

    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('notes').insert([newNote]);
    }
  };

  const togglePinNote = async (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_pinned: !n.is_pinned } : n))
    );
  };

  const deleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      await supabase.from('notes').delete().eq('id', id);
    }
  };

  // Telegram Link Code
  const generateTelegramCode = async (): Promise<string> => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTelegramCode(code);
    setTelegramLinked(false);

    const supabase = getSupabaseClient();
    if (supabase && !isDemoMode) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from('telegram_links').insert({
          user_id: userData.user.id,
          link_code: code,
          is_linked: false,
        });
      }
    }
    return code;
  };

  const resetDemoData = () => {
    localStorage.clear();
    setProfile(DEMO_PROFILE);
    setTimetable(DEMO_TIMETABLE);
    setAssignments(DEMO_ASSIGNMENTS);
    setExams(DEMO_EXAMS);
    setGrades(DEMO_GRADES);
    setSessions(DEMO_STUDY_SESSIONS);
    setDecks(DEMO_FLASHCARD_DECKS);
    setFlashcards(DEMO_FLASHCARDS);
    setHabits(DEMO_HABITS);
    setHabitLogs(DEMO_HABIT_LOGS);
    setNotes(DEMO_NOTES);
  };

  return (
    <AppContext.Provider
      value={{
        isConfigured,
        isDemoMode,
        setDemoMode,
        profile,
        updateProfile,
        timetable,
        addTimetableSlot,
        deleteTimetableSlot,
        assignments,
        addAssignment,
        toggleAssignment,
        deleteAssignment,
        exams,
        addExam,
        deleteExam,
        grades,
        addGrade,
        deleteGrade,
        sessions,
        logSession,
        decks,
        flashcards,
        addDeck,
        addFlashcard,
        recordCardReview,
        habits,
        habitLogs,
        toggleHabitToday,
        setHabitValueToday,
        notes,
        addNote,
        togglePinNote,
        deleteNote,
        telegramCode,
        generateTelegramCode,
        telegramLinked,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
