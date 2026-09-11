'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import { Layers, Plus, Trash2, Clock } from 'lucide-react';
import { THANAWEYA_SUBJECTS } from '@/lib/types';

interface StudyBlock {
  id: string;
  dayIndex: number;
  subject: string;
  hours: number;
  timeSlot: string;
  notes?: string;
}

export default function StudyPlannerPage() {
  const [blocks, setBlocks] = useState<StudyBlock[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('thanaweya_study_blocks_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [newSubject, setNewSubject] = useState('Physics');
  const [newHours, setNewHours] = useState('2');
  const [newSlot, setNewSlot] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const saveBlocks = (newB: StudyBlock[]) => {
    setBlocks(newB);
    try {
      localStorage.setItem('thanaweya_study_blocks_user', JSON.stringify(newB));
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

  const subjectHours: { [subject: string]: number } = {};
  let totalWeekHours = 0;
  blocks.forEach((b) => {
    subjectHours[b.subject] = (subjectHours[b.subject] || 0) + b.hours;
    totalWeekHours += b.hours;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Study Planner
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Weekly revision schedule and planned study hours.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl glass-button-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Study Slot</span>
        </button>
      </div>

      {/* Summary */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">Planned Weekly Hours</h2>
          <span className="text-xs font-mono text-white font-bold bg-[#111111] px-2.5 py-1 rounded-lg border border-white/10">
            Total: {totalWeekHours}h / week
          </span>
        </div>

        {Object.keys(subjectHours).length === 0 ? (
          <p className="text-xs text-neutral-500 py-2">
            No study blocks scheduled. Click "+ Add Study Slot" to plan your week.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {Object.entries(subjectHours).map(([sub, hrs]) => (
              <div key={sub} className="p-2.5 rounded-xl bg-[#111111] border border-white/5 text-center">
                <span className="block text-xs font-semibold text-neutral-300 truncate">{sub}</span>
                <span className="block text-lg font-black text-white font-mono mt-0.5">{hrs}h</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Weekly Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {dayNames.map((dayLabel, dayIdx) => {
          const dayBlocks = blocks.filter((b) => b.dayIndex === dayIdx);
          const dayTotalHours = dayBlocks.reduce((sum, b) => sum + b.hours, 0);

          return (
            <div
              key={dayIdx}
              className="bg-[#0a0a0a] rounded-xl p-3 flex flex-col space-y-2.5 min-h-[220px] border border-white/10"
            >
              <div className="pb-2 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white truncate">
                  {dayLabel.split(' ')[0]}
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">{dayTotalHours}h</span>
              </div>

              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {dayBlocks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center py-6 text-[10px] text-neutral-600">
                    Rest
                  </div>
                ) : (
                  dayBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="p-2 rounded-lg bg-[#141414] border border-white/5 group relative text-xs"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-neutral-200">{block.subject}</span>
                        <button
                          onClick={() => handleDeleteBlock(block.id)}
                          className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1 font-mono">
                        <span>{block.timeSlot}</span>
                        <span className="text-white font-bold">{block.hours}h</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={() => {
                  setSelectedDay(dayIdx);
                  setIsModalOpen(true);
                }}
                className="w-full py-1 rounded bg-[#111111] hover:bg-[#1a1a1a] text-[10px] text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Study Block"
      >
        <form onSubmit={handleAddBlock} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Day</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
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
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs bg-[#0d0d0d] text-white"
              >
                {THANAWEYA_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.name.split(' ')[0]}>
                    {s.name}
                  </option>
                ))}
                <option value="Revision">General Revision</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Hours</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="12"
                required
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Time Slot</label>
              <input
                type="text"
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
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
