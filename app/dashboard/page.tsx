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
  Sparkles,
  RefreshCw,
  Trash2,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import confetti from 'canvas-confetti';

const MOTIVATIONAL_QUOTES = [
  { text: 'لكل مجتهد نصيب، وما زرعته في ليالي الشتاء ستحصده فرحاً ونجاحاً في الصيف بإذن الله.', author: 'ثانوية عامة 2026' },
  { text: 'The secret of getting ahead is getting started. Every single solved MCQ brings you closer to your dream faculty.', author: 'Daily Reminder' },
  { text: 'تعب اليوم هو فخر الغد وراحة المستقبل. استمر بقوة وعزيمة ولا تتراجع.', author: 'كلمات ملهمة' },
  { text: 'Great results don’t come from 24-hour cramming; they come from 200 days of relentless, calm consistency.', author: 'Study Mindset' },
];

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

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isTimetableModalOpen, setIsTimetableModalOpen] = useState(false);
  const [quickTaskText, setQuickTaskText] = useState('');
  const [quickTasks, setQuickTasks] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: '1', text: 'Solve 20 MCQs on Faraday Law before noon', done: false },
    { id: '2', text: 'Revise Unit 4 vocabulary for English', done: true },
    { id: '3', text: 'Review Adab poets characteristics', done: false },
  ]);

  // Timetable Slot Form State
  const [newDay, setNewDay] = useState<number>(0);
  const [newSubject, setNewSubject] = useState('');
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('10:30');
  const [newTeacher, setNewTeacher] = useState('');

  // Get current day index (0 = Saturday, 1 = Sunday, ..., 6 = Friday)
  const currentJsDay = new Date().getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
  // Map JS getDay() to Egyptian school week: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
  const mappedDayIndex = currentJsDay === 6 ? 0 : currentJsDay + 1;

  const todayClasses = timetable.filter((slot) => slot.day_of_week === mappedDayIndex);

  const todayStr = new Date().toISOString().split('T')[0];
  const assignmentsDueToday = assignments.filter((a) => a.due_date === todayStr);

  // Next upcoming exam
  const sortedExams = [...exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date));
  const nextExam = sortedExams[0];
  const daysUntilNextExam = nextExam
    ? Math.ceil((new Date(nextExam.exam_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : null;

  // Today's focus minutes
  const todaySessions = sessions.filter((s) => s.completed_at === todayStr);
  const totalFocusMinutes = todaySessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  const handleToggleTask = (id: string) => {
    setQuickTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextDone = !t.done;
          if (nextDone) {
            confetti({
              particleCount: 30,
              spread: 60,
              origin: { y: 0.8 },
            });
          }
          return { ...t, done: nextDone };
        }
        return t;
      })
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

  const dayNames = ['Saturday (السبت)', 'Sunday (الأحد)', 'Monday (الإثنين)', 'Tuesday (الثلاثاء)', 'Wednesday (الأربعاء)', 'Thursday (الخميس)', 'Friday (الجمعة)'];

  return (
    <div className="space-y-6">
      {/* Top Banner & Motivational Quote */}
      <GlassCard glow className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>اليوم: {dayNames[mappedDayIndex]}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, {profile.full_name?.split(' ')[0]} 👋
            </h1>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed italic border-l-2 border-cyan-400 pl-3">
              "{MOTIVATIONAL_QUOTES[quoteIndex].text}"
              <span className="block text-xs text-slate-400 not-italic mt-1 font-medium">
                — {MOTIVATIONAL_QUOTES[quoteIndex].author}
              </span>
            </p>
          </div>

          <button
            onClick={() => setQuoteIndex((prev) => (prev + 1) % MOTIVATIONAL_QUOTES.length)}
            className="self-start md:self-center p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all shrink-0"
            title="Next Quote"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </GlassCard>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Next Exam */}
        <Link href="/dashboard/exams">
          <GlassCard interactive className="p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Next Exam</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {daysUntilNextExam !== null ? `${daysUntilNextExam}d` : 'None'}
              </span>
              <span className="text-xs text-rose-400 font-semibold truncate">
                {nextExam?.subject || 'All clear'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Tap to view full schedule</p>
          </GlassCard>
        </Link>

        {/* Focus Time */}
        <Link href="/dashboard/pomodoro">
          <GlassCard interactive className="p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Focus Today</span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {totalFocusMinutes}
              </span>
              <span className="text-xs text-slate-400">minutes</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Start Pomodoro session →</p>
          </GlassCard>
        </Link>

        {/* Due Today */}
        <Link href="/dashboard/assignments">
          <GlassCard interactive className="p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Due Today</span>
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-white">
                {assignmentsDueToday.length}
              </span>
              <span className="text-xs text-slate-400">assignments</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {assignmentsDueToday.filter((a) => a.is_completed).length} completed
            </p>
          </GlassCard>
        </Link>

        {/* Target Goal */}
        <Link href="/dashboard/grades">
          <GlassCard interactive className="p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Target Percentage</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                {profile.target_percentage}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Division: {profile.study_division.replace('_', ' ')}</p>
          </GlassCard>
        </Link>
      </div>

      {/* Main Grid: Timetable & To-Do List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Classes & Timetable (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Today's Timetable & Classes</h2>
                <p className="text-xs text-slate-400">{dayNames[mappedDayIndex]}</p>
              </div>
            </div>

            <button
              onClick={() => setIsTimetableModalOpen(true)}
              className="px-3 py-1.5 rounded-xl glass-button-secondary text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Class</span>
            </button>
          </div>

          <GlassCard className="p-5 space-y-3">
            {todayClasses.length === 0 ? (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <p className="text-sm">No scheduled classes for today!</p>
                <p className="text-xs text-slate-500">
                  Great day for self-study, solving question banks, or reviewing past exams.
                </p>
                <button
                  onClick={() => setIsTimetableModalOpen(true)}
                  className="mt-2 px-3 py-1.5 rounded-xl glass-button-primary text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add a Class Slot
                </button>
              </div>
            ) : (
              todayClasses.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-2 h-10 rounded-full bg-gradient-to-b from-cyan-400 to-blue-500" />
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.subject}</h4>
                      <p className="text-xs text-slate-400">
                        {item.room_or_teacher || 'General Lecture / Center'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-xl border border-cyan-500/20">
                      {item.start_time} - {item.end_time}
                    </span>
                    <button
                      onClick={() => deleteTimetableSlot(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-all"
                      title="Delete slot"
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
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                Homework Due Today
              </h3>
              <div className="space-y-2">
                {assignmentsDueToday.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => toggleAssignment(a.id)}
                    className="cursor-pointer flex items-center justify-between p-3 rounded-2xl glass-panel-interactive border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                          a.is_completed
                            ? 'bg-cyan-500 border-cyan-400 text-black'
                            : 'border-white/20 bg-white/5'
                        }`}
                      >
                        {a.is_completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            a.is_completed ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {a.title}
                        </p>
                        <span className="text-[10px] text-cyan-400">{a.subject}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Daily To-Do Checklist (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Quick Daily To-Do</h2>
            </div>
            <span className="text-xs text-slate-400">
              {quickTasks.filter((t) => t.done).length}/{quickTasks.length}
            </span>
          </div>

          <GlassCard className="p-5 space-y-4">
            <form onSubmit={handleAddQuickTask} className="flex gap-2">
              <input
                type="text"
                placeholder="Add task for today..."
                value={quickTaskText}
                onChange={(e) => setQuickTaskText(e.target.value)}
                className="flex-1 glass-input px-3.5 py-2 rounded-xl text-xs"
              />
              <button
                type="submit"
                className="p-2 rounded-xl glass-button-primary shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-2">
              {quickTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    task.done
                      ? 'bg-white/[0.01] border-white/5 opacity-60'
                      : 'bg-white/[0.03] border-white/10 hover:border-cyan-500/30'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                      task.done
                        ? 'bg-cyan-500 border-cyan-400 text-black'
                        : 'border-white/20 bg-white/5'
                    }`}
                  >
                    {task.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      task.done ? 'line-through text-slate-500' : 'text-slate-200'
                    }`}
                  >
                    {task.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Daily Habits Quick Toggles */}
            <div className="pt-3 border-t border-white/10">
              <h4 className="text-xs font-bold text-slate-400 mb-2">Today's Habits Check</h4>
              <div className="space-y-2">
                {habits.slice(0, 3).map((habit) => {
                  const log = habitLogs.find(
                    (l) => l.habit_id === habit.id && l.date === todayStr
                  );
                  const isDone = Boolean(log && log.completed);

                  return (
                    <div
                      key={habit.id}
                      onClick={() => toggleHabitToday(habit.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-all"
                    >
                      <span className="text-xs text-slate-300 font-medium">{habit.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isDone
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        {isDone ? 'Completed ✓' : 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Add Timetable Modal */}
      <GlassModal
        isOpen={isTimetableModalOpen}
        onClose={() => setIsTimetableModalOpen(false)}
        title="Add Class to Weekly Timetable"
      >
        <form onSubmit={handleAddSlot} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Day of Week (اليوم)
            </label>
            <select
              value={newDay}
              onChange={(e) => setNewDay(Number(e.target.value))}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-xs bg-slate-900 text-slate-100"
            >
              {dayNames.map((d, i) => (
                <option key={i} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Subject (المادة)
            </label>
            <input
              type="text"
              required
              placeholder="Physics / Arabic / Chemistry..."
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Start Time
              </label>
              <input
                type="time"
                required
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                End Time
              </label>
              <input
                type="time"
                required
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Teacher / Center / Location (المعلم أو السنتر)
            </label>
            <input
              type="text"
              placeholder="e.g. Mr. Reda El Farouk, Center Hall B..."
              value={newTeacher}
              onChange={(e) => setNewTeacher(e.target.value)}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
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
              Save Class Slot
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
