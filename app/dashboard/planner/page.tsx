'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import { Layers, Plus, Trash2, Clock, BarChart3, Sparkles } from 'lucide-react';
import { THANAWEYA_SUBJECTS } from '@/lib/types';

interface StudyBlock {
  id: string;
  dayIndex: number; // 0: Sat, 1: Sun, ..., 6: Fri
  subject: string;
  hours: number;
  timeSlot: string;
  notes?: string;
}

const DEFAULT_BLOCKS: StudyBlock[] = [
  { id: 'sb-1', dayIndex: 0, subject: 'Physics', hours: 3, timeSlot: '16:00 - 19:00', notes: 'Solving Chapter 3 Induction' },
  { id: 'sb-2', dayIndex: 0, subject: 'Arabic', hours: 2, timeSlot: '20:00 - 22:00', notes: 'Nahu rules revision' },
  { id: 'sb-3', dayIndex: 1, subject: 'Chemistry', hours: 3.5, timeSlot: '15:00 - 18:30', notes: 'Organic chemistry reactions' },
  { id: 'sb-4', dayIndex: 2, subject: 'Biology', hours: 3, timeSlot: '17:00 - 20:00', notes: 'Genetics MCQ bank' },
  { id: 'sb-5', dayIndex: 2, subject: 'English', hours: 1.5, timeSlot: '20:30 - 22:00', notes: 'Writing practice & Unit 5' },
  { id: 'sb-6', dayIndex: 3, subject: 'Physics', hours: 2.5, timeSlot: '16:00 - 18:30', notes: 'Modern physics formulas' },
  { id: 'sb-7', dayIndex: 4, subject: 'Chemistry', hours: 2.5, timeSlot: '16:00 - 18:30', notes: 'Equilibrium calculations' },
  { id: 'sb-8', dayIndex: 4, subject: 'Arabic', hours: 2, timeSlot: '19:00 - 21:00', notes: 'Balagha & texts' },
  { id: 'sb-9', dayIndex: 5, subject: 'Comprehensive Revision', hours: 4, timeSlot: '14:00 - 18:00', notes: 'Past exam trial solving' },
];

export default function StudyPlannerPage() {
  const [blocks, setBlocks] = useState<StudyBlock[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('thanaweya_study_blocks');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_BLOCKS;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [newSubject, setNewSubject] = useState('Physics');
  const [newHours, setNewHours] = useState('2.5');
  const [newSlot, setNewSlot] = useState('16:00 - 18:30');
  const [newNotes, setNewNotes] = useState('');

  const saveBlocks = (newB: StudyBlock[]) => {
    setBlocks(newB);
    try {
      localStorage.setItem('thanaweya_study_blocks', JSON.stringify(newB));
    } catch {}
  };

  const handleAddBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const newBlock: StudyBlock = {
      id: `sb-${Date.now()}`,
      dayIndex: selectedDay,
      subject: newSubject,
      hours: Number(newHours) || 2,
      timeSlot: newSlot,
      notes: newNotes.trim() || undefined,
    };
    saveBlocks([...blocks, newBlock]);
    setNewNotes('');
    setIsModalOpen(false);
  };

  const handleDeleteBlock = (id: string) => {
    saveBlocks(blocks.filter((b) => b.id !== id));
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

  // Calculate total study hours per subject
  const subjectHours: { [subject: string]: number } = {};
  let totalWeekHours = 0;
  blocks.forEach((b) => {
    subjectHours[b.subject] = (subjectHours[b.subject] || 0) + b.hours;
    totalWeekHours += b.hours;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Weekly Study Planner
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Map out your daily revision blocks, balance heavy subjects, and track weekly commitments.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl glass-button-primary text-xs font-bold flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Study Slot</span>
        </button>
      </div>

      {/* Planned Hours per Subject Summary Cards */}
      <GlassCard glow className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Planned Study Time per Subject</h2>
          </div>
          <span className="text-xs font-mono text-cyan-300 font-bold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            Total: {totalWeekHours} hours / week
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {Object.entries(subjectHours).map(([sub, hrs]) => (
            <div
              key={sub}
              className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition-all text-center"
            >
              <span className="block text-xs font-semibold text-slate-300 truncate">
                {sub}
              </span>
              <span className="block text-xl font-black text-cyan-400 font-mono mt-1">
                {hrs}h
              </span>
              <span className="block text-[10px] text-slate-400">
                {((hrs / (totalWeekHours || 1)) * 100).toFixed(0)}% of plan
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Weekly Schedule Grid (Saturday -> Friday) */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {dayNames.map((dayLabel, dayIdx) => {
          const dayBlocks = blocks.filter((b) => b.dayIndex === dayIdx);
          const dayTotalHours = dayBlocks.reduce((sum, b) => sum + b.hours, 0);

          return (
            <div
              key={dayIdx}
              className="glass-panel rounded-3xl p-3.5 flex flex-col space-y-3 min-h-[260px] border border-white/10"
            >
              <div className="pb-2 border-b border-white/10">
                <h3 className="text-xs font-bold text-white truncate">
                  {dayLabel.split(' ')[0]}
                </h3>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>{dayLabel.split(' ')[1]}</span>
                  <span className="text-cyan-400 font-mono font-semibold">{dayTotalHours}h</span>
                </div>
              </div>

              {/* Day Study Blocks */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {dayBlocks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-8">
                    <span className="text-[11px] text-slate-600">Rest / Flex</span>
                  </div>
                ) : (
                  dayBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all group relative"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-200">{block.subject}</h4>
                        <button
                          onClick={() => handleDeleteBlock(block.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-400 transition-all p-0.5"
                          title="Remove block"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{block.timeSlot}</span>
                        <span className="text-cyan-300 font-mono font-bold">{block.hours}h</span>
                      </div>

                      {block.notes && (
                        <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">
                          {block.notes}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedDay(dayIdx);
                  setIsModalOpen(true);
                }}
                className="w-full py-1.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-[11px] text-slate-400 hover:text-cyan-300 transition-all flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Study Block Modal */}
      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Revision Block"
      >
        <form onSubmit={handleAddBlock} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Day of Week
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 text-slate-100"
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
                Subject
              </label>
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 text-slate-100"
              >
                {THANAWEYA_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.name.split(' ')[0]}>
                    {s.name}
                  </option>
                ))}
                <option value="Comprehensive Revision">Comprehensive Revision (مراجعة شاملة)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Planned Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                required
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Time Slot Range
              </label>
              <input
                type="text"
                placeholder="e.g. 16:00 - 18:30"
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value)}
                className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Study Objective / Chapter Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Solve 40 questions on Kirchhoff's laws..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs"
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
              Save Schedule Block
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
