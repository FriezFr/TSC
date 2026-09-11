'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import { Priority, THANAWEYA_SUBJECTS } from '@/lib/types';
import {
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  AlertTriangle,
  Check,
  Filter,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AssignmentsPage() {
  const { assignments, addAssignment, toggleAssignment, deleteAssignment } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');

  // Form State
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Physics');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [priority, setPriority] = useState<Priority>('medium');

  const handleToggle = (id: string, currentState: boolean) => {
    toggleAssignment(id);
    if (!currentState) {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.8 },
      });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addAssignment({
      title: title.trim(),
      subject,
      due_date: dueDate,
      priority,
    });

    setTitle('');
    setIsModalOpen(false);
  };

  // Filter and sort assignments by due date
  const filteredAssignments = assignments
    .filter((a) => {
      if (filterSubject !== 'all' && a.subject !== filterSubject) return false;
      if (filterStatus === 'pending' && a.is_completed) return false;
      if (filterStatus === 'completed' && !a.is_completed) return false;
      return true;
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  const priorityColors = {
    high: 'text-rose-400 bg-rose-500/10 border-rose-500/25',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Assignments & Deadlines
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track weekly homework, problem sheets, and center assignments.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl glass-button-primary text-xs font-bold flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Filter Row */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">Filter By:</span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* Subject Filter */}
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-xl text-xs bg-slate-900 text-slate-200"
            >
              <option value="all">All Subjects</option>
              {THANAWEYA_SUBJECTS.map((s) => (
                <option key={s.id} value={s.name.split(' ')[0]}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/10">
              {(['all', 'pending', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                    filterStatus === st
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Assignments List */}
      {filteredAssignments.length === 0 ? (
        <GlassCard className="p-12 text-center text-slate-400 space-y-3">
          <CheckSquare className="w-10 h-10 text-cyan-400/40 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No assignments found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You are all caught up, or no tasks match your current filters.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((assignment) => {
            const isToday =
              assignment.due_date === new Date().toISOString().split('T')[0];
            const isPast =
              new Date(assignment.due_date) < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <GlassCard
                key={assignment.id}
                interactive
                className={`p-4 transition-all group ${
                  assignment.is_completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggle(assignment.id, assignment.is_completed)}
                      className={`w-6 h-6 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                        assignment.is_completed
                          ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                          : 'border-white/20 bg-white/5 hover:border-cyan-400'
                      }`}
                    >
                      {assignment.is_completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="min-w-0">
                      <h3
                        className={`text-sm font-semibold truncate ${
                          assignment.is_completed
                            ? 'line-through text-slate-500'
                            : 'text-slate-100'
                        }`}
                      >
                        {assignment.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-medium text-cyan-400">
                          {assignment.subject}
                        </span>
                        <span className="text-slate-600 text-xs">•</span>
                        <span
                          className={`text-[11px] font-mono flex items-center gap-1 ${
                            isPast && !assignment.is_completed
                              ? 'text-rose-400 font-bold'
                              : isToday
                              ? 'text-amber-400 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {isToday ? 'Due Today!' : assignment.due_date}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg border ${
                        priorityColors[assignment.priority]
                      }`}
                    >
                      {assignment.priority}
                    </span>

                    <button
                      onClick={() => deleteAssignment(assignment.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                      title="Delete assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add Assignment Modal */}
      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Assignment"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Assignment Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Solve 50 MCQs on Electric Circuits..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 text-slate-100"
              >
                {THANAWEYA_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.name.split(' ')[0]}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 rounded-xl text-xs font-bold uppercase transition-all border ${
                    priority === p
                      ? priorityColors[p]
                      : 'bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
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
              Save Assignment
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
