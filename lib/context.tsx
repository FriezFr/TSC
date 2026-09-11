'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
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
import { getSupabaseClient } from './supabase/client';

interface AppContextType {
  user: User | null;
  authLoading: boolean;
  profile: UserProfile | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
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
  sessions: { id?: string; subject: string; duration_minutes: number; completed_at: string }[];
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
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Real data collections (initialized EMPTY - no placeholders)
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [sessions, setSessions] = useState<{ id?: string; subject: string; duration_minutes: number; completed_at: string }[]>([]);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [telegramCode, setTelegramCode] = useState<string>('');
  const [telegramLinked, setTelegramLinked] = useState<boolean>(false);

  // Fetch all user tables from Supabase
  const loadUserData = useCallback(async (userId: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
      // 1. Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData);
      } else {
        const defaultProfile: UserProfile = {
          id: userId,
          full_name: 'Student',
          study_division: 'scientific_science',
          target_percentage: 95.0,
        };
        await supabase.from('profiles').insert([defaultProfile]);
        setProfile(defaultProfile);
      }

      // 2. Timetable
      const { data: ttData } = await supabase
        .from('timetable')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: true });
      if (ttData) setTimetable(ttData);

      // 3. Assignments
      const { data: asData } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });
      if (asData) setAssignments(asData);

      // 4. Exams
      const { data: exData } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', userId)
        .order('exam_date', { ascending: true });
      if (exData) setExams(exData);

      // 5. Grades
      const { data: grData } = await supabase
        .from('grades')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (grData) setGrades(grData);

      // 6. Study Sessions
      const { data: ssData } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });
      if (ssData) setSessions(ssData);

      // 7. Flashcards & Decks
      const { data: dkData } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('user_id', userId);
      if (dkData) setDecks(dkData);

      const { data: fcData } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId);
      if (fcData) setFlashcards(fcData);

      // 8. Habits & Logs
      const { data: hbData } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId);

      if (hbData && hbData.length > 0) {
        setHabits(hbData);
      } else {
        // Create initial default habits for new user
        const initialHabits = [
          { user_id: userId, name: 'Sleep Target (7+ hrs)', type: 'sleep', target_value: 7.5, unit: 'hours' },
          { user_id: userId, name: 'Daily Revision Hours', type: 'revision', target_value: 5.0, unit: 'hours' },
          { user_id: userId, name: 'Solved 50+ MCQs', type: 'custom', target_value: 1, unit: 'done' },
        ];
        const { data: createdHabits } = await supabase.from('habits').insert(initialHabits).select('*');
        if (createdHabits) setHabits(createdHabits);
      }

      const { data: hlData } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', userId);
      if (hlData) setHabitLogs(hlData);

      // 9. Notes
      const { data: ntData } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (ntData) setNotes(ntData);

      // 10. Telegram Links
      const { data: tgData } = await supabase
        .from('telegram_links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tgData) {
        setTelegramCode(tgData.link_code);
        setTelegramLinked(Boolean(tgData.is_linked));
      }
    } catch (err) {
      console.error('Error fetching Supabase data:', err);
    }
  }, []);

  // Supabase Auth listener
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then((res: { data: { session: Session | null } }) => {
      const currentUser = res.data.session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadUserData(currentUser.id);
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadUserData(currentUser.id);
      } else {
        setProfile(null);
        setTimetable([]);
        setAssignments([]);
        setExams([]);
        setGrades([]);
        setSessions([]);
        setDecks([]);
        setFlashcards([]);
        setHabits([]);
        setHabitLogs([]);
        setNotes([]);
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...data } : null));
    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('profiles').update(data).eq('id', user.id);
    }
  };

  // Timetable
  const addTimetableSlot = async (slot: Omit<TimetableSlot, 'id'>) => {
    const supabase = getSupabaseClient();
    if (supabase && user) {
      const { data } = await supabase
        .from('timetable')
        .insert([{ ...slot, user_id: user.id }])
        .select('*')
        .single();
      if (data) setTimetable((prev) => [...prev, data]);
    } else {
      setTimetable((prev) => [...prev, { ...slot, id: `tt-${Date.now()}` }]);
    }
  };

  const deleteTimetableSlot = async (id: string) => {
    setTimetable((prev) => prev.filter((s) => s.id !== id));
    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('timetable').delete().eq('id', id);
    }
  };

  // Assignments
  const addAssignment = async (item: Omit<Assignment, 'id' | 'is_completed'>) => {
    const supabase = getSupabaseClient();
    if (supabase && user) {
      const { data } = await supabase
        .from('assignments')
        .insert([
          {
            ...item,
            user_id: user.id,
            is_completed: false,
          },
        ])
        .select('*')
        .single();
      if (data) setAssignments((prev) => [data, ...prev]);
    } else {
      const fallback = {
        ...item,
        id: `as-${Date.now()}`,
        is_completed: false,
        created_at: new Date().toISOString(),
      };
      setAssignments((prev) => [fallback, ...prev]);
    }
  };

  const toggleAssignment = async (id: string) => {
    const target = assignments.find((a) => a.id === id);
    if (!target) return;
    const nextStatus = !target.is_completed;

    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_completed: nextStatus } : a))
    );

    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('assignments').update({ is_completed: nextStatus }).eq('id', id);
    }
  };

  const deleteAssignment = async (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('assignments').delete().eq('id', id);
    }
  };

  // Exams
  const addExam = async (item: Omit<Exam, 'id'>) => {
    const supabase = getSupabaseClient();
    if (supabase && user) {
      const { data } = await supabase
        .from('exams')
        .insert([{ ...item, user_id: user.id }])
        .select('*')
        .single();
      if (data) setExams((prev) => [...prev, data].sort((a, b) => a.exam_date.localeCompare(b.exam_date)));
    } else {
      setExams((prev) => [...prev, { ...item, id: `ex-${Date.now()}` }].sort((a, b) => a.exam_date.localeCompare(b.exam_date)));
    }
  };

  const deleteExam = async (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('exams').delete().eq('id', id);
    }
  };

  // Grades
  const addGrade = async (item: Omit<GradeItem, 'id'>) => {
    const supabase = getSupabaseClient();
    if (supabase && user) {
      const { data } = await supabase
        .from('grades')
        .insert([{ ...item, user_id: user.id }])
        .select('*')
        .single();
      if (data) setGrades((prev) => [data, ...prev]);
    } else {
      setGrades((prev) => [{ ...item, id: `gr-${Date.now()}` }, ...prev]);
    }
  };

  const deleteGrade = async (id: string) => {
    setGrades((prev) => prev.filter((g) => g.id !== id));
    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('grades').delete().eq('id', id);
    }
  };

  // Study Sessions
  const logSession = async (subject: string, minutes: number) => {
    const newSession = {
      subject,
      duration_minutes: minutes,
      completed_at: new Date().toISOString().split('T')[0],
    };

    const supabase = getSupabaseClient();
    if (supabase && user) {
      const { data } = await supabase
        .from('study_sessions')
        .insert([{ ...newSession, user_id: user.id }])
        .select('*')
        .single();
      if (data) setSessions((prev) => [data, ...prev]);
    } else {
      setSessions((prev) => [newSession, ...prev]);
    }
  };

  // Flashcards
  const addDeck = async (subject: string, title: string, description?: string) => {
    const supabase = getSupabaseClient();
    if (supabase && user) {
      const { data } = await supabase
        .from('flashcard_decks')
        .insert([{ subject, title, description, user_id: user.id }])
        .select('*')
        .single();
      if (data) setDecks((prev) => [...prev, data]);
    } else {
      setDecks((prev) => [...prev, { id: `dk-${Date.now()}`, subject, title, description, card_count: 0 }]);
    }
  };

  const addFlashcard = async (deckId: string, question: string, answer: string) => {
    const supabase = getSupabaseClient();
    if (supabase && user) {
      const { data } = await supabase
        .from('flashcards')
        .insert([{ deck_id: deckId, question, answer, user_id: user.id, times_reviewed: 0, times_correct: 0 }])
        .select('*')
        .single();
      if (data) setFlashcards((prev) => [...prev, data]);
    } else {
      setFlashcards((prev) => [...prev, { id: `fc-${Date.now()}`, deck_id: deckId, question, answer, times_reviewed: 0, times_correct: 0 }]);
    }
  };

  const recordCardReview = async (cardId: string, isCorrect: boolean) => {
    const card = flashcards.find((c) => c.id === cardId);
    if (!card) return;

    const updated = {
      times_reviewed: card.times_reviewed + 1,
      times_correct: isCorrect ? card.times_correct + 1 : card.times_correct,
    };

    setFlashcards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, ...updated } : c))
    );

    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('flashcards').update(updated).eq('id', cardId);
    }
  };

  // Habits
  const todayStr = new Date().toISOString().split('T')[0];

  const toggleHabitToday = async (habitId: string) => {
    const existing = habitLogs.find((l) => l.habit_id === habitId && l.date === todayStr);
    const nextCompleted = existing ? !existing.completed : true;

    if (existing) {
      setHabitLogs((prev) =>
        prev.map((l) => (l.id === existing.id ? { ...l, completed: nextCompleted } : l))
      );
    } else {
      setHabitLogs((prev) => [
        ...prev,
        { id: `hl-${Date.now()}`, habit_id: habitId, date: todayStr, value: 1, completed: true },
      ]);
    }

    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('habit_logs').upsert(
        {
          user_id: user.id,
          habit_id: habitId,
          date: todayStr,
          value: 1,
          completed: nextCompleted,
        },
        { onConflict: 'user_id,habit_id,date' }
      );
    }
  };

  const setHabitValueToday = async (habitId: string, value: number) => {
    const existing = habitLogs.find((l) => l.habit_id === habitId && l.date === todayStr);

    if (existing) {
      setHabitLogs((prev) =>
        prev.map((l) => (l.id === existing.id ? { ...l, value, completed: value > 0 } : l))
      );
    } else {
      setHabitLogs((prev) => [
        ...prev,
        { id: `hl-${Date.now()}`, habit_id: habitId, date: todayStr, value, completed: value > 0 },
      ]);
    }

    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('habit_logs').upsert(
        {
          user_id: user.id,
          habit_id: habitId,
          date: todayStr,
          value,
          completed: value > 0,
        },
        { onConflict: 'user_id,habit_id,date' }
      );
    }
  };

  // Notes
  const addNote = async (content: string, tags: string[] = ['Study']) => {
    const supabase = getSupabaseClient();
    if (supabase && user) {
      const { data } = await supabase
        .from('notes')
        .insert([{ content, tags, is_pinned: false, user_id: user.id }])
        .select('*')
        .single();
      if (data) setNotes((prev) => [data, ...prev]);
    } else {
      const newNote: Note = {
        id: `nt-${Date.now()}`,
        content,
        tags,
        is_pinned: false,
        created_at: new Date().toISOString().split('T')[0],
      };
      setNotes((prev) => [newNote, ...prev]);
    }
  };

  const togglePinNote = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const nextPinned = !note.is_pinned;

    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_pinned: nextPinned } : n))
    );

    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('notes').update({ is_pinned: nextPinned }).eq('id', id);
    }
  };

  const deleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('notes').delete().eq('id', id);
    }
  };

  // Telegram Code
  const generateTelegramCode = async (): Promise<string> => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTelegramCode(code);
    setTelegramLinked(false);

    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('telegram_links').insert({
        user_id: user.id,
        link_code: code,
        is_linked: false,
      });
    }
    return code;
  };

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        profile,
        updateProfile,
        signOut,
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
