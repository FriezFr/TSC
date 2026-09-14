'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Flame,
  Award,
  BookOpen,
  Trash2,
  Check,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import ScheduleImportModal from '@/components/ScheduleImporter/ScheduleImportModal';
import DailyPlannerModal from '@/components/AI/DailyPlannerModal';
import AiActivityFeed from '@/components/AI/AiActivityFeed';
import WhatShouldIStudyCard from '@/components/Dashboard/WhatShouldIStudyCard';
import StudyMemoryModal from '@/components/Dashboard/StudyMemoryModal';
import MistakeBankModal from '@/components/Dashboard/MistakeBankModal';
import { Brain, BookX } from 'lucide-react';
import { DailyPlanResponse } from '@/lib/types';

export default function TodayViewPage() {
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const {
    profile,
    timetable,
    addTimetableSlot,
    deleteTimetableSlot,
    assignments,
    toggleAssignment,
    exams,
    habits,
    habitLogs,
    toggleHabitToday,
    sessions,
    language,
    t,
    aiActivities,
    undoAiActivity,
    clearAiActivities,
    conflicts,
    userPreferences,
  } = useApp();

  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isMistakeOpen, setIsMistakeOpen] = useState(false);
  const [dailyPlan, setDailyPlan] = useState<DailyPlanResponse | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState(false);
  const [quickTaskText, setQuickTaskText] = useState('');
  const [quickTasks, setQuickTasks] = useState<{ id: string; text: string; done: boolean }[]>([]);

  const handleGeneratePlan = async () => {
    setIsPlanLoading(true);
    try {
      const res = await fetch('/api/schedule/plan-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timetable,
          assignments,
          exams,
          preferences: userPreferences,
          dayIndex: mappedDayIndex,
        }),
      });
      const data = await res.json();
      if (data.plan) {
        setDailyPlan(data.plan);
      }
    } catch (err) {
      console.error('Error generating daily plan:', err);
    } finally {
      setIsPlanLoading(false);
    }
  };

  const handleOpenPlanner = () => {
    setIsPlannerOpen(true);
    if (!dailyPlan) {
      handleGeneratePlan();
    }
  };

  // Timetable Slot Form State
  const [newDay, setNewDay] = useState<number>(0);
  const [newSubject, setNewSubject] = useState('');
  const [newStart, setNewStart] = useState('08:00');
  const [newEnd, setNewEnd] = useState('09:30');
  const [newTeacher, setNewTeacher] = useState('');

  // Map JS getDay() (0: Sun) to Egyptian week: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
  const currentJsDay = new Date().getDay();
  const mappedDayIndex = currentJsDay === 6 ? 0 : currentJsDay + 1;

  const todayClasses = timetable.filter((slot) => slot.day_of_week === mappedDayIndex);
  const todayStr = new Date().toISOString().split('T')[0];
  const assignmentsDueToday = assignments.filter((a) => a.due_date === todayStr);

  const sortedExams = [...exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  const nextExam = sortedExams[0];
  const daysUntilNextExam = nextExam
    ? Math.ceil((new Date(nextExam.exam_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : null;

  const todaySessions = sessions.filter((s) => s.completed_at === todayStr);
  const totalFocusMinutes = todaySessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  const handleToggleTask = (id: string) => {
    setQuickTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskText.trim()) return;
    setQuickTasks((prev) => [
      ...prev,
      { id: Date.now().toString(), text: quickTaskText.trim(), done: false },
    ]);
    setQuickTaskText('');
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    await addTimetableSlot({
      day_of_week: Number(newDay),
      subject: newSubject.trim(),
      start_time: newStart,
      end_time: newEnd,
      room_or_teacher: newTeacher.trim() || undefined,
    });
    setNewSubject('');
    setNewTeacher('');
    setIsTimetableModalOpen(false);
  };

  const dayNamesEn = [
    'Saturday',
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
  ];

  const dayNamesAr = [
    'السبت (Saturday)',
    'الأحد (Sunday)',
    'الإثنين (Monday)',
    'الثلاثاء (Tuesday)',
    'الأربعاء (Wednesday)',
    'الخميس (Thursday)',
    'الجمعة (Friday)',
  ];

  const currentDayNames = language === 'ar' ? dayNamesAr : dayNamesEn;

  const getTrackDisplayName = () => {
    if (!profile?.study_division) return 'Baccalaureate Track';
    switch (profile.study_division) {
      case 'medical_life_sciences':
        return language === 'ar' ? 'الطب وعلوم الحياة (Medical)' : 'Medical & Life Sciences (الطب وعلوم الحياة)';
      case 'engineering_cs':
        return language === 'ar' ? 'الهندسة وعلوم الحاسب (Engineering & CS)' : 'Engineering & CS (الهندسة وعلوم الحاسب)';
      case 'business':
        return language === 'ar' ? 'الأعمال والإدارة (Business)' : 'Business & Economics (الأعمال والإدارة)';
      case 'humanities_arts':
        return language === 'ar' ? 'الآداب والعلوم الإنسانية (Humanities)' : 'Humanities & Arts (الآداب والعلوم الإنسانية)';
      default:
        return profile.study_division;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-neutral-400 block mb-1">
              {currentDayNames[mappedDayIndex]}
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {profile?.full_name ? `${t('welcomeBack')}, ${profile.full_name.split(' ')[0]}` : t('todayOverview')}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              {t('trackLabel')}: {getTrackDisplayName()} • {t('targetGoal')}: {profile?.target_percentage || 95}%
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            <button
              onClick={handleOpenPlanner}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-blue-500/25 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>{language === 'ar' ? 'خطط ليومي' : 'Plan My Day'}</span>
            </button>

            <button
              onClick={() => setIsImporterOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-white/20 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === 'ar' ? 'استيراد الجدول' : 'Import Schedule'}</span>
            </button>

            <button
              onClick={() => setIsMemoryOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span>{language === 'ar' ? 'ذاكرة المذاكرة' : 'Study Memory'}</span>
            </button>

            <button
              onClick={() => setIsMistakeOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <BookX className="w-3.5 h-3.5 text-rose-400" />
              <span>{language === 'ar' ? 'بنك الأخطاء' : 'Mistake Bank'}</span>
            </button>

            <button
              onClick={() => setIsTimetableModalOpen(true)}
              className="px-4 py-2 rounded-xl glass-button-primary text-xs font-bold cursor-pointer"
            >
              {t('addClass')}
            </button>
          </div>
        </div>
      </GlassCard>

      {/* AI What Should I Study Now Decision Card */}
      <WhatShouldIStudyCard
        onOpenStudyMemory={() => setIsMemoryOpen(true)}
        onOpenMistakeBank={() => setIsMistakeOpen(true)}
      />

      {/* Schedule Conflicts & Optimization Alerts */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>
              {language === 'ar' ? 'تنبيه تعارض في الجدول' : 'Schedule Conflicts Detected'} ({conflicts.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {conflicts.map((c) => (
              <div
                key={c.id}
                className="text-[11px] text-amber-300/90 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2.5 rounded-xl bg-black/30 border border-amber-500/15"
              >
                <div>
                  <span className="font-semibold text-white">{c.title}</span> — {c.description}
                </div>
                {c.recommendation && (
                  <span className="text-[10px] text-amber-300 font-medium shrink-0 bg-amber-500/20 px-2 py-0.5 rounded-md">
                    💡 {c.recommendation}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/dashboard/exams">
          <GlassCard interactive className="p-4">
            <span className="text-xs text-neutral-400 block mb-1">{t('nextExam')}</span>
            <span className="text-2xl font-bold text-white font-mono">
              {daysUntilNextExam !== null ? `${daysUntilNextExam}d` : '-'}
            </span>
            <span className="block text-[11px] text-neutral-500 mt-1 truncate">
              {nextExam?.subject || (language === 'ar' ? 'لا توجد امتحانات مجدولة' : 'No exams scheduled')}
            </span>
          </GlassCard>
        </Link>

        <Link href="/dashboard/pomodoro">
          <GlassCard interactive className="p-4">
            <span className="text-xs text-neutral-400 block mb-1">{t('focusToday')}</span>
            <span className="text-2xl font-bold text-white font-mono">
              {totalFocusMinutes}m
            </span>
            <span className="block text-[11px] text-neutral-500 mt-1">
              {todaySessions.length} {language === 'ar' ? 'جلسات مكتملة' : 'sessions completed'}
            </span>
          </GlassCard>
        </Link>

        <Link href="/dashboard/assignments">
          <GlassCard interactive className="p-4">
            <span className="text-xs text-neutral-400 block mb-1">{t('dueToday')}</span>
            <span className="text-2xl font-bold text-white font-mono">
              {assignmentsDueToday.length}
            </span>
            <span className="block text-[11px] text-neutral-500 mt-1">
              {assignmentsDueToday.filter((a) => a.is_completed).length} {language === 'ar' ? 'مكتملة' : 'completed'}
            </span>
          </GlassCard>
        </Link>

        <Link href="/dashboard/grades">
          <GlassCard interactive className="p-4">
            <span className="text-xs text-neutral-400 block mb-1">{t('targetGoal')}</span>
            <span className="text-2xl font-bold text-white font-mono">
              {profile?.target_percentage || 95}%
            </span>
            <span className="block text-[11px] text-neutral-500 mt-1">
              {language === 'ar' ? 'هدف النسبة المئوية' : 'Target Baccalaureate %'}
            </span>
          </GlassCard>
        </Link>
      </div>

      {/* Classes & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">{t('todayClasses')}</h2>
            <span className="text-xs text-neutral-500 font-mono">
              {todayClasses.length} {t('scheduledClasses')}
            </span>
          </div>

          <GlassCard className="p-4 space-y-2">
            {todayClasses.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                {t('noClassesToday')}
              </div>
            ) : (
              todayClasses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#111111] border border-white/5 group"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">{item.subject}</h4>
                    {item.room_or_teacher && (
                      <p className="text-[11px] text-neutral-400 mt-0.5">{item.room_or_teacher}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-neutral-300 bg-white/5 px-2.5 py-1 rounded-lg">
                      {item.start_time} - {item.end_time}
                    </span>
                    <button
                      onClick={() => deleteTimetableSlot(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-1 cursor-pointer transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </GlassCard>

          {/* Assignments Due Today */}
          {assignmentsDueToday.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-neutral-300">{t('assignmentsDueToday')}</h3>
              {assignmentsDueToday.map((a) => (
                <div
                  key={a.id}
                  onClick={() => toggleAssignment(a.id)}
                  className="cursor-pointer flex items-center justify-between p-3 rounded-xl bg-[#0e0e0e] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        a.is_completed ? 'bg-white border-white text-black' : 'border-white/20'
                      }`}
                    >
                      {a.is_completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs ${
                        a.is_completed ? 'line-through text-neutral-500' : 'text-neutral-200'
                      }`}
                    >
                      {a.title} ({a.subject})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick To-Do (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">{t('dailyTasks')}</h2>
            <span className="text-xs text-neutral-500">
              {quickTasks.filter((t) => t.done).length}/{quickTasks.length}
            </span>
          </div>

          <GlassCard className="p-4 space-y-3">
            <form onSubmit={handleAddQuickTask} className="flex gap-2">
              <input
                type="text"
                value={quickTaskText}
                onChange={(e) => setQuickTaskText(e.target.value)}
                placeholder={language === 'ar' ? 'أضف مهمة سريعة...' : 'Add quick task...'}
                className="flex-1 glass-input px-3 py-1.5 rounded-lg text-xs"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg glass-button-primary text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </form>

            <div className="space-y-1.5">
              {quickTasks.length === 0 ? (
                <p className="text-[11px] text-neutral-500 text-center py-4">
                  {t('noTasksToday')}
                </p>
              ) : (
                quickTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTask(t.id)}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-[#111111] cursor-pointer"
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        t.done ? 'bg-white border-white text-black' : 'border-neutral-600'
                      }`}
                    >
                      {t.done && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs ${
                        t.done ? 'line-through text-neutral-500' : 'text-neutral-200'
                      }`}
                    >
                      {t.text}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Habits Today */}
            {habits.length > 0 && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <h4 className="text-[11px] font-bold text-neutral-400">{t('dailyHabits')}</h4>
                {habits.slice(0, 3).map((h) => {
                  const log = habitLogs.find((l) => l.habit_id === h.id && l.date === todayStr);
                  const isDone = Boolean(log && log.completed);

                  return (
                    <div
                      key={h.id}
                      onClick={() => toggleHabitToday(h.id)}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#111111] cursor-pointer"
                    >
                      <span className="text-xs text-neutral-300">{h.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isDone ? 'bg-white text-black font-bold' : 'text-neutral-500'
                        }`}
                      >
                        {isDone ? t('done') : t('pending')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* AI Assistant Activity Feed & 1-Click Undo */}
      <AiActivityFeed
        activities={aiActivities}
        onUndo={undoAiActivity}
        onClearHistory={clearAiActivities}
      />

      {/* Add Class Modal */}
      <GlassModal
        isOpen={isTimetableModalOpen}
        onClose={() => setIsTimetableModalOpen(false)}
        title={t('addClassTitle')}
      >
        <form onSubmit={handleAddSlot} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">{t('dayLabel')}</label>
            <select
              value={newDay}
              onChange={(e) => setNewDay(Number(e.target.value))}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-[#0d0d0d] text-white"
            >
              {currentDayNames.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">{t('subjectLabel')}</label>
            <input
              type="text"
              required
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">{t('startTimeLabel')}</label>
              <input
                type="time"
                required
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">{t('endTimeLabel')}</label>
              <input
                type="time"
                required
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              {t('teacherLocationLabel')}
            </label>
            <input
              type="text"
              value={newTeacher}
              onChange={(e) => setNewTeacher(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsTimetableModalOpen(false)}
              className="px-4 py-2 rounded-xl glass-button-secondary text-xs cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl glass-button-primary text-xs font-bold cursor-pointer"
            >
              {t('saveClass')}
            </button>
          </div>
        </form>
      </GlassModal>

      {/* AI Schedule Import Modal */}
      <ScheduleImportModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
      />

      {/* AI Daily Planner Modal */}
      <DailyPlannerModal
        isOpen={isPlannerOpen}
        onClose={() => setIsPlannerOpen(false)}
        plan={dailyPlan}
        isLoading={isPlanLoading}
        onRegenerate={handleGeneratePlan}
      />

      {/* AI Study Memory Modal */}
      <StudyMemoryModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
      />

      {/* AI Mistake Bank Modal */}
      <MistakeBankModal
        isOpen={isMistakeOpen}
        onClose={() => setIsMistakeOpen(false)}
      />
    </div>
  );
}
