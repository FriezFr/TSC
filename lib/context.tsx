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
  ChatMessage,
  ParsedLessonSlot,
  ParsedScheduleTask,
} from './types';
import { getSupabaseClient } from './supabase/client';
import { Language, Translations, translations } from './i18n';

interface AppContextType {
  user: User | null;
  authLoading: boolean;
  profile: UserProfile | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
  // Language & i18n
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations, fallback?: string) => string;
  // Timetable
  timetable: TimetableSlot[];
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id'>) => Promise<void>;
  updateTimetableSlot: (id: string, slot: Partial<TimetableSlot>) => Promise<void>;
  deleteTimetableSlot: (id: string) => Promise<void>;
  // Assignments
  assignments: Assignment[];
  addAssignment: (item: Omit<Assignment, 'id' | 'is_completed'>) => Promise<void>;
  updateAssignment: (id: string, item: Partial<Assignment>) => Promise<void>;
  toggleAssignment: (id: string) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  // Smart Schedule Importer
  importScheduleData: (
    lessons: ParsedLessonSlot[],
    tasks: ParsedScheduleTask[]
  ) => Promise<{ importedLessons: number; importedTasks: number; updatedCount: number }>;
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
  deleteFlashcard: (cardId: string) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
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
  // Chat Messages (Synced with Telegram and Web)
  chatMessages: ChatMessage[];
  sendChatMessage: (content: string) => Promise<void>;
  refreshChatMessages: () => Promise<void>;
  clearChatMessages: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Language state (defaults to English 'en')
  const [language, setLanguageState] = useState<Language>('en');

  // Load language preference from localStorage on client
  useEffect(() => {
    try {
      const stored = localStorage.getItem('app_language') as Language | null;
      if (stored === 'en' || stored === 'ar') {
        setLanguageState(stored);
        document.documentElement.lang = stored;
        document.documentElement.dir = stored === 'ar' ? 'rtl' : 'ltr';
      } else {
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
      }
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('app_language', lang);
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    } catch {
      // ignore
    }
  };

  const t = useCallback(
    (key: keyof Translations, fallback?: string): string => {
      const dict = translations[language] || translations.en;
      return dict[key] || fallback || (key as string);
    },
    [language]
  );

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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

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
          study_division: 'medical_life_sciences',
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

      // 11. Chat Messages (Synced from Telegram and Web)
      const { data: chatData } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (chatData) setChatMessages(chatData);
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

  const updateTimetableSlot = async (id: string, slot: Partial<TimetableSlot>) => {
    setTimetable((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...slot } : s))
    );
    const supabase = getSupabaseClient();
    if (supabase && user) {
      const updateData: any = {};
      if (slot.day_of_week !== undefined) updateData.day_of_week = slot.day_of_week;
      if (slot.subject !== undefined) updateData.subject = slot.subject;
      if (slot.start_time !== undefined) updateData.start_time = slot.start_time;
      if (slot.end_time !== undefined) updateData.end_time = slot.end_time;
      if (slot.room_or_teacher !== undefined) updateData.room_or_teacher = slot.room_or_teacher;
      await supabase.from('timetable').update(updateData).eq('id', id);
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
            title: item.title,
            subject: item.subject,
            due_date: item.due_date,
            priority: item.priority,
            user_id: user.id,
            is_completed: false,
          },
        ])
        .select('*')
        .single();
      if (data) setAssignments((prev) => [{ ...item, ...data }, ...prev]);
    } else {
      const fallback: Assignment = {
        ...item,
        id: `as-${Date.now()}`,
        is_completed: false,
        created_at: new Date().toISOString(),
      };
      setAssignments((prev) => [fallback, ...prev]);
    }
  };

  const updateAssignment = async (id: string, item: Partial<Assignment>) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...item } : a))
    );
    const supabase = getSupabaseClient();
    if (supabase && user) {
      const updateData: any = {};
      if (item.title !== undefined) updateData.title = item.title;
      if (item.subject !== undefined) updateData.subject = item.subject;
      if (item.due_date !== undefined) updateData.due_date = item.due_date;
      if (item.priority !== undefined) updateData.priority = item.priority;
      if (item.is_completed !== undefined) updateData.is_completed = item.is_completed;
      await supabase.from('assignments').update(updateData).eq('id', id);
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

  // Smart Schedule Importer
  const importScheduleData = async (
    lessons: ParsedLessonSlot[],
    tasks: ParsedScheduleTask[]
  ) => {
    const supabase = getSupabaseClient();
    let importedLessons = 0;
    let importedTasks = 0;
    let updatedCount = 0;

    // 1. Timetable Slots
    const updatedTimetable = [...timetable];
    for (const lesson of lessons) {
      const days = lesson.dayIndices && lesson.dayIndices.length > 0 ? lesson.dayIndices : [0];
      for (const day of days) {
        const existingIdx = updatedTimetable.findIndex(
          (s) =>
            (s.import_id && s.import_id === lesson.importId && s.day_of_week === day) ||
            (s.subject.toLowerCase().trim() === lesson.subject.toLowerCase().trim() && s.day_of_week === day)
        );

        const startTime = lesson.startTime || '08:00';
        const endTime = lesson.endTime || '09:30';

        if (existingIdx >= 0) {
          const existingSlot = updatedTimetable[existingIdx];
          const updatedSlot: TimetableSlot = {
            ...existingSlot,
            start_time: startTime,
            end_time: endTime,
            room_or_teacher: lesson.roomOrTeacher || existingSlot.room_or_teacher,
            notes: lesson.notes || existingSlot.notes,
            import_id: lesson.importId,
            is_recurring: lesson.isRecurring,
          };
          updatedTimetable[existingIdx] = updatedSlot;
          updatedCount++;

          if (supabase && user) {
            await supabase
              .from('timetable')
              .update({
                start_time: startTime,
                end_time: endTime,
                room_or_teacher: lesson.roomOrTeacher || null,
              })
              .eq('id', existingSlot.id);
          }
        } else {
          const slotPayload: TimetableSlot = {
            id: `tt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            day_of_week: day,
            subject: lesson.subject,
            start_time: startTime,
            end_time: endTime,
            room_or_teacher: lesson.roomOrTeacher || undefined,
            notes: lesson.notes,
            import_id: lesson.importId,
            is_recurring: lesson.isRecurring,
          };

          if (supabase && user) {
            const { data } = await supabase
              .from('timetable')
              .insert([
                {
                  user_id: user.id,
                  day_of_week: day,
                  subject: lesson.subject,
                  start_time: startTime,
                  end_time: endTime,
                  room_or_teacher: lesson.roomOrTeacher || null,
                },
              ])
              .select('*')
              .maybeSingle();

            if (data) {
              updatedTimetable.push({ ...data, ...slotPayload });
            } else {
              updatedTimetable.push(slotPayload);
            }
          } else {
            updatedTimetable.push(slotPayload);
          }
          importedLessons++;
        }
      }
    }
    setTimetable(updatedTimetable);

    // 2. Also populate Planner Study Blocks in localStorage for /dashboard/planner
    try {
      const currentBlocksSaved = localStorage.getItem('baccalaureate_study_blocks_user') || localStorage.getItem('thanaweya_study_blocks_user');
      let currentBlocks: any[] = [];
      if (currentBlocksSaved) {
        currentBlocks = JSON.parse(currentBlocksSaved);
      }
      for (const lesson of lessons) {
        for (const day of (lesson.dayIndices || [0])) {
          const exists = currentBlocks.find(
            (b) => b.dayIndex === day && b.subject.toLowerCase() === lesson.subject.toLowerCase()
          );
          if (!exists) {
            currentBlocks.push({
              id: `sb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              dayIndex: day,
              subject: lesson.subject,
              hours: 2,
              timeSlot: lesson.startTime && lesson.endTime ? `${lesson.startTime} - ${lesson.endTime}` : 'Flexible Slot',
              notes: lesson.notes || 'Auto-imported from study schedule',
            });
          }
        }
      }
      localStorage.setItem('baccalaureate_study_blocks_user', JSON.stringify(currentBlocks));
    } catch {}

    // 3. Assignments & Tasks
    const updatedAssignments = [...assignments];
    for (const task of tasks) {
      const existingIdx = updatedAssignments.findIndex(
        (a) =>
          (a.import_id && a.import_id === task.importId) ||
          (a.title.toLowerCase().trim() === task.title.toLowerCase().trim() && a.subject.toLowerCase().trim() === task.subject.toLowerCase().trim())
      );

      if (existingIdx >= 0) {
        const existingA = updatedAssignments[existingIdx];
        const updatedA: Assignment = {
          ...existingA,
          due_date: task.calculatedDueDate || existingA.due_date,
          priority: task.priority || existingA.priority,
          notes: task.notes || existingA.notes,
          import_id: task.importId,
          deadline_rule: task.deadlineRule,
          dependency: task.dependency,
        };
        updatedAssignments[existingIdx] = updatedA;
        updatedCount++;

        if (supabase && user) {
          await supabase
            .from('assignments')
            .update({
              due_date: task.calculatedDueDate || existingA.due_date,
              priority: task.priority || existingA.priority,
            })
            .eq('id', existingA.id);
        }
      } else {
        const newAssignment: Assignment = {
          id: `as-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: task.title,
          subject: task.subject,
          due_date: task.calculatedDueDate,
          priority: task.priority,
          is_completed: false,
          notes: task.notes,
          import_id: task.importId,
          deadline_rule: task.deadlineRule,
          dependency: task.dependency,
          created_at: new Date().toISOString(),
        };

        if (supabase && user) {
          const { data } = await supabase
            .from('assignments')
            .insert([
              {
                user_id: user.id,
                title: task.title,
                subject: task.subject,
                due_date: task.calculatedDueDate,
                priority: task.priority,
                is_completed: false,
              },
            ])
            .select('*')
            .maybeSingle();

          if (data) {
            updatedAssignments.unshift({ ...data, ...newAssignment });
          } else {
            updatedAssignments.unshift(newAssignment);
          }
        } else {
          updatedAssignments.unshift(newAssignment);
        }
        importedTasks++;
      }
    }
    setAssignments(updatedAssignments);

    return { importedLessons, importedTasks, updatedCount };
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

  const deleteFlashcard = async (cardId: string) => {
    setFlashcards((prev) => prev.filter((c) => c.id !== cardId));
    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('flashcards').delete().eq('id', cardId);
    }
  };

  const deleteDeck = async (deckId: string) => {
    setDecks((prev) => prev.filter((d) => d.id !== deckId));
    setFlashcards((prev) => prev.filter((c) => c.deck_id !== deckId));
    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('flashcards').delete().eq('deck_id', deckId);
      await supabase.from('flashcard_decks').delete().eq('id', deckId);
    }
  };

  // Chat Messages (Telegram & Web Sync)
  const refreshChatMessages = async () => {
    const supabase = getSupabaseClient();
    if (supabase && user) {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (data) setChatMessages(data);
    }
  };

  const sendChatMessage = async (content: string) => {
    if (!content.trim()) return;
    const tempUserMsg: ChatMessage = {
      id: `web-${Date.now()}`,
      user_id: user?.id || 'temp',
      source: 'web',
      role: 'user',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content.trim(), userId: user?.id }),
      });
      const data = await res.json();
      if (data.reply) {
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          user_id: user?.id || 'temp',
          source: 'web',
          role: 'assistant',
          content: data.reply,
          created_at: new Date().toISOString(),
        };
        setChatMessages((prev) => [...prev, assistantMsg]);
      }
      await refreshChatMessages();
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  const clearChatMessages = async () => {
    setChatMessages([]);
    const supabase = getSupabaseClient();
    if (supabase && user) {
      await supabase.from('chat_messages').delete().eq('user_id', user.id);
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
        language,
        setLanguage,
        t,
        timetable,
        addTimetableSlot,
        updateTimetableSlot,
        deleteTimetableSlot,
        assignments,
        addAssignment,
        updateAssignment,
        toggleAssignment,
        deleteAssignment,
        importScheduleData,
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
        deleteFlashcard,
        deleteDeck,
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
        chatMessages,
        sendChatMessage,
        refreshChatMessages,
        clearChatMessages,
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
