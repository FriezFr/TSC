'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import { Clock, Plus, Trash2, AlertCircle, Sparkles, Calendar } from 'lucide-react';
import { THANAWEYA_SUBJECTS } from '@/lib/types';

export default function ExamCountdownPage() {
  const { exams, addExam, deleteExam } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [subject, setSubject] = useState('Physics (الفيزياء)');
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addExam({
      subject,
      exam_date: examDate,
      notes: notes.trim() || undefined,
    });
    setNotes('');
    setIsModalOpen(false);
  };

  const calculateDaysLeft = (dateStr: string) => {
    const examTime = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((examTime - now) / (1000 * 3600 * 24));
    return diffDays;
  };

  const sortedExams = [...exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <Clock className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Exam Countdown
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time countdown to center trials, monthly evaluations & final Thanaweya exams.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl glass-button-primary text-xs font-bold flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exam Date</span>
        </button>
      </div>

      {/* Official Thanaweya Amma Countdown Hero Banner */}
      <GlassCard glow className="p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/25 text-cyan-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Thanaweya Amma 2026 Finals</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Official June Exams Countdown
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Stay calm, focused, and deliberate. Consistency in solving past exams beats last-minute panic every time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass-panel p-4 rounded-2xl text-center min-w-[85px] border border-cyan-400/30 shadow-[0_0_20px_rgba(0,240,255,0.15)]">
              <span className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono">
                {Math.max(0, calculateDaysLeft('2026-06-14'))}
              </span>
              <span className="block text-[10px] text-slate-400 font-medium uppercase mt-1">Days Left</span>
            </div>
            <div className="glass-panel p-4 rounded-2xl text-center min-w-[75px] border border-white/10">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                {Math.max(0, calculateDaysLeft('2026-06-14') * 24)}
              </span>
              <span className="block text-[10px] text-slate-400 font-medium uppercase mt-1">Hours</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Exam Countdown Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedExams.map((exam) => {
          const daysLeft = calculateDaysLeft(exam.exam_date);
          const isUrgent = daysLeft >= 0 && daysLeft <= 7;
          const isPassed = daysLeft < 0;

          return (
            <GlassCard
              key={exam.id}
              interactive
              className={`p-5 flex flex-col justify-between relative group ${
                isUrgent
                  ? 'border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.2)]'
                  : ''
              }`}
            >
              {/* Pulsing indicator if urgent */}
              {isUrgent && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Within 7 Days!
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-xl border border-cyan-500/20 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {exam.exam_date}
                  </span>
                </div>

                <h3 className="text-lg font-black text-white mb-1">{exam.subject}</h3>
                {exam.notes && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                    {exam.notes}
                  </p>
                )}
              </div>

              {/* Countdown Ticker Bottom */}
              <div className="mt-6 pt-4 border-t border-white/10 flex items-end justify-between">
                <div>
                  <span
                    className={`text-3xl font-black font-mono ${
                      isUrgent
                        ? 'text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                        : isPassed
                        ? 'text-slate-600'
                        : 'text-white'
                    }`}
                  >
                    {isPassed ? 'Done' : daysLeft}
                  </span>
                  {!isPassed && (
                    <span className="text-xs text-slate-400 ml-1.5 font-medium">
                      {daysLeft === 1 ? 'day remaining' : 'days remaining'}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => deleteExam(exam.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  title="Remove exam"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Add Exam Modal */}
      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Exam Schedule"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Subject (المادة)
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 text-slate-100"
            >
              {THANAWEYA_SUBJECTS.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Exam Date
            </label>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Notes & Exam Syllabus
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Chapter 1 to 3, Hall 4, Bring calculator..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full glass-input px-3.5 py-2 rounded-xl text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl glass-button-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl glass-button-primary text-xs font-bold"
            >
              Save Exam
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
