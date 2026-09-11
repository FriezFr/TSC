'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { Moon, Flame, Check, Sparkles } from 'lucide-react';

export default function HabitTrackerPage() {
  const { habits, habitLogs, toggleHabitToday, setHabitValueToday } = useApp();

  const [sleepInput, setSleepInput] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];

  const pastDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    return { dateStr, dayName };
  });

  const handleSaveSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    const sleepHabit = habits.find((h) => h.type === 'sleep');
    if (sleepHabit) {
      await setHabitValueToday(sleepHabit.id, Number(sleepInput));
    }
  };

  // Streak Calculation
  const revisionHabit = habits.find((h) => h.type === 'revision');
  let currentStreak = 0;
  if (revisionHabit) {
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const log = habitLogs.find((l) => l.habit_id === revisionHabit.id && l.date === dStr);
      if (log && log.completed) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Habit & Sleep Tracker
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Build consistent daily revision and sleep habits.
          </p>
        </div>
      </div>

      {/* Top Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs">Revision Streak</span>
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div className="text-3xl font-black text-white font-mono mt-1">
            {currentStreak}
          </div>
          <span className="text-[11px] text-neutral-500">Days consecutive</span>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs">Sleep Target</span>
            <Moon className="w-4 h-4 text-white" />
          </div>
          <div className="text-3xl font-black text-white font-mono mt-1">
            7.5h
          </div>
          <span className="text-[11px] text-neutral-500">Target for memory consolidation</span>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-xs">Active Habits</span>
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-3xl font-black text-white font-mono mt-1">
            {habits.length}
          </div>
          <span className="text-[11px] text-neutral-500">Daily tracked rituals</span>
        </GlassCard>
      </div>

      {/* Log Sleep */}
      <GlassCard className="p-5">
        <form onSubmit={handleSaveSleep} className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-white">Log Sleep Hours</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">Track sleep for yesterday night.</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="2"
              max="14"
              value={sleepInput}
              onChange={(e) => setSleepInput(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-lg text-xs font-mono w-20 text-center"
            />
            <span className="text-xs text-neutral-400">hrs</span>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg glass-button-primary text-xs font-bold cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Habits Table */}
      <GlassCard className="p-5">
        <h2 className="text-xs font-bold text-white mb-4">Past 7 Days Consistency</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-neutral-400">
                <th className="pb-2 font-medium">Habit</th>
                {pastDays.map((d) => (
                  <th key={d.dateStr} className="pb-2 text-center font-mono">
                    <span className="block text-[10px] text-neutral-500">{d.dayName}</span>
                    <span className="text-[11px] text-neutral-300">{d.dateStr.slice(8)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {habits.map((habit) => (
                <tr key={habit.id}>
                  <td className="py-3 text-white font-medium">
                    {habit.name}
                  </td>

                  {pastDays.map((d) => {
                    const log = habitLogs.find(
                      (l) => l.habit_id === habit.id && l.date === d.dateStr
                    );
                    const isCompleted = Boolean(log && log.completed);
                    const isToday = d.dateStr === todayStr;

                    return (
                      <td key={d.dateStr} className="py-3 text-center">
                        <button
                          onClick={() => {
                            if (isToday) toggleHabitToday(habit.id);
                          }}
                          className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-white text-black font-bold'
                              : isToday
                              ? 'bg-[#141414] border border-white/20 text-neutral-400 hover:border-white'
                              : 'text-neutral-700'
                          }`}
                        >
                          {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '-'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
