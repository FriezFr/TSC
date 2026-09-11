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
} from 'lucide-react';
import Link from 'next/link';

export default function TodayViewPage() {
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
  } = useApp();

  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [quickTaskText, setQuickTaskText] = useState('');
  const [quickTasks, setQuickTasks] = useState<{ id: string; text: string; done: boolean }[]>([]);

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

  const dayNames = [
    'Saturday (السبت)',
    'Sunday (الأحد)',
    'Monday (الإثنين)',
    'Tuesday (الثلاثاء)',
    'Wednesday (الأربعاء)',
    'Thursday (الخميس)',
    'Friday (الجمعة)',
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-neutral-400 block mb-1">
              {dayNames[mappedDayIndex]}
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Today Overview'}
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              المسار: {
                profile?.study_division === 'medical_life_sciences' ? 'الطب وعلوم الحياة (Medical)' :
                profile?.study_division === 'engineering_cs' ? 'الهندسة وعلوم الحاسب (Engineering & CS)' :
                profile?.study_division === 'business' ? 'الأعمال والإدارة (Business)' :
                profile?.study_division === 'humanities_arts' ? 'الآداب والعلوم الإنسانية (Humanities)' :
                profile?.study_division || 'البكالوريا'
              } • الهدف: {profile?.target_percentage || 95}%
            </p>
          </div>

          <button
            onClick={() => setIsTimetableModalOpen(true)}
            className="px-4 py-2 rounded-xl glass-button-primary text-xs font-bold self-start sm:self-center cursor-pointer"
          >
            + Add Class
          </button>
        </div>
      </GlassCard>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/dashboard/exams">
          <GlassCard interactive className="p-4">
            <span className="text-xs text-neutral-400 block mb-1">Next Exam</span>
            <span className="text-2xl font-bold text-white font-mono">
              {daysUntilNextExam !== null ? `${daysUntilNextExam}d` : '-'}
            </span>
            <span className="block text-[11px] text-neutral-500 mt-1 truncate">
              {nextExam?.subject || 'No exams scheduled'}
            </span>
          </GlassCard>
        </Link>

        <Link href="/dashboard/pomodoro">
          <GlassCard interactive className="p-4">
            <span className="text-xs text-neutral-400 block mb-1">Focus Today</span>
            <span className="text-2xl font-bold text-white font-mono">
              {totalFocusMinutes}m
            </span>
            <span className="block text-[11px] text-neutral-500 mt-1">
              {todaySessions.length} sessions completed
            </span>
          </GlassCard>
        </Link>

        <Link href="/dashboard/assignments">
          <GlassCard interactive className="p-4">
            <span className="text-xs text-neutral-400 block mb-1">Due Today</span>
            <span className="text-2xl font-bold text-white font-mono">
              {assignmentsDueToday.length}
            </span>
            <span className="block text-[11px] text-neutral-500 mt-1">
              {assignmentsDueToday.filter((a) => a.is_completed).length} completed
            </span>
          </GlassCard>
        </Link>

        <Link href="/dashboard/grades">
          <GlassCard interactive className="p-4">
            <span className="text-xs text-neutral-400 block mb-1">Target Goal</span>
            <span className="text-2xl font-bold text-white font-mono">
              {profile?.target_percentage || 95}%
            </span>
            <span className="block text-[11px] text-neutral-500 mt-1">هدف البكالوريا</span>
          </GlassCard>
        </Link>
      </div>

      {/* Classes & Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Today's Classes</h2>
            <span className="text-xs text-neutral-500 font-mono">{todayClasses.length} scheduled</span>
          </div>

          <GlassCard className="p-4 space-y-2">
            {todayClasses.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No classes scheduled for today. Click "+ Add Class" to set your timetable.
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
                      className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 p-1 cursor-pointer"
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
              <h3 className="text-xs font-bold text-neutral-300">Assignments Due Today</h3>
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
            <h2 className="text-sm font-bold text-white">Daily Tasks</h2>
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
                  No quick tasks added for today.
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
                <h4 className="text-[11px] font-bold text-neutral-400">Daily Habits</h4>
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
                        {isDone ? 'Done' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Add Class Modal */}
      <GlassModal
        isOpen={isTimetableModalOpen}
        onClose={() => setIsTimetableModalOpen(false)}
        title="Add Class to Timetable"
      >
        <form onSubmit={handleAddSlot} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Day</label>
            <select
              value={newDay}
              onChange={(e) => setNewDay(Number(e.target.value))}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-[#0d0d0d] text-white"
            >
              {dayNames.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Subject</label>
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
              <label className="block text-xs font-medium text-neutral-300 mb-1">Start Time</label>
              <input
                type="time"
                required
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">End Time</label>
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
              Teacher / Location (Optional)
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
              className="px-4 py-2 rounded-xl glass-button-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl glass-button-primary text-xs font-bold"
            >
              Save Class
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
