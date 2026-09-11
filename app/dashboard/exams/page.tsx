'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import { Clock, Plus, Trash2, Calendar } from 'lucide-react';
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
    return Math.ceil((examTime - now) / (1000 * 3600 * 24));
  };

  const sortedExams = [...exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Exam Countdown
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Track upcoming exams and remaining days.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl glass-button-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exam</span>
        </button>
      </div>

      {sortedExams.length === 0 ? (
        <GlassCard className="p-12 text-center text-neutral-500 space-y-2">
          <Clock className="w-8 h-8 mx-auto text-neutral-600" />
          <p className="text-sm font-semibold text-neutral-300">No exams added</p>
          <p className="text-xs">Click "+ Add Exam" to schedule your first exam countdown.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedExams.map((exam) => {
            const daysLeft = calculateDaysLeft(exam.exam_date);
            const isUrgent = daysLeft >= 0 && daysLeft <= 7;
            const isPassed = daysLeft < 0;

            return (
              <GlassCard
                key={exam.id}
                interactive
                className="p-5 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3 text-xs text-neutral-400">
                    <span className="font-mono flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {exam.exam_date}
                    </span>
                    {isUrgent && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-red-950/60 border border-red-800 text-red-300">
                        Within 7 days
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white">{exam.subject}</h3>
                  {exam.notes && (
                    <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                      {exam.notes}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-3 border-t border-white/10 flex items-end justify-between">
                  <div>
                    <span className="text-3xl font-black font-mono text-white">
                      {isPassed ? 'Passed' : daysLeft}
                    </span>
                    {!isPassed && (
                      <span className="text-xs text-neutral-400 ml-1.5 font-medium">
                        days left
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => deleteExam(exam.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Exam"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-[#0d0d0d] text-white"
            >
              {THANAWEYA_SUBJECTS.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs resize-none"
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
              Save
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
