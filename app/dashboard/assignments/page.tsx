'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import { Priority, THANAWEYA_SUBJECTS } from '@/lib/types';
import { CheckSquare, Plus, Trash2, Calendar, Check, Filter } from 'lucide-react';

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

  const filteredAssignments = assignments
    .filter((a) => {
      if (filterSubject !== 'all' && a.subject !== filterSubject) return false;
      if (filterStatus === 'pending' && a.is_completed) return false;
      if (filterStatus === 'completed' && !a.is_completed) return false;
      return true;
    })
    .sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Assignments & Tasks
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Manage your homework, problem sets, and submission deadlines.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl glass-button-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>

      {/* Filter Row */}
      <GlassCard className="p-3">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-xs text-neutral-400">Filter:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="glass-input px-3 py-1 rounded-lg text-xs bg-[#0d0d0d] text-neutral-200"
            >
              <option value="all">All Subjects</option>
              {THANAWEYA_SUBJECTS.map((s) => (
                <option key={s.id} value={s.name.split(' ')[0]}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="flex rounded-lg bg-[#111111] p-0.5 border border-white/10">
              {(['all', 'pending', 'completed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                    filterStatus === st
                      ? 'bg-white text-black font-bold'
                      : 'text-neutral-400 hover:text-white'
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
        <GlassCard className="p-12 text-center text-neutral-500 space-y-2">
          <CheckSquare className="w-8 h-8 mx-auto text-neutral-600" />
          <p className="text-sm font-semibold text-neutral-300">No assignments</p>
          <p className="text-xs">Click "+ New Assignment" to add your first task.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filteredAssignments.map((assignment) => (
            <GlassCard
              key={assignment.id}
              interactive
              className={`p-4 transition-all group ${assignment.is_completed ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleAssignment(assignment.id)}
                    className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                      assignment.is_completed
                        ? 'bg-white border-white text-black'
                        : 'border-white/20 hover:border-white'
                    }`}
                  >
                    {assignment.is_completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>

                  <div className="min-w-0">
                    <h3
                      className={`text-xs font-semibold truncate ${
                        assignment.is_completed ? 'line-through text-neutral-500' : 'text-neutral-100'
                      }`}
                    >
                      {assignment.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400">
                      <span>{assignment.subject}</span>
                      <span>•</span>
                      <span className="font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {assignment.due_date}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300">
                    {assignment.priority}
                  </span>

                  <button
                    onClick={() => deleteAssignment(assignment.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Assignment"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                  <option key={s.id} value={s.name.split(' ')[0]}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                    priority === p
                      ? 'bg-white text-black'
                      : 'bg-[#111111] text-neutral-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
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
