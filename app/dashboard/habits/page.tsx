'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { Sparkles, Moon, Flame, Check, Plus, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HabitTrackerPage() {
  const { habits, habitLogs, toggleHabitToday, setHabitValueToday } = useApp();

  const [sleepInput, setSleepInput] = useState('7.5');

  const todayStr = new Date().toISOString().split('T')[0];

  // Generate past 7 days dates
  const pastDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    return { dateStr, dayName };
  });

  const handleToggle = async (habitId: string) => {
    await toggleHabitToday(habitId);
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.8 },
    });
  };

  const handleSaveSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    const sleepHabit = habits.find((h) => h.type === 'sleep');
    if (sleepHabit) {
      await setHabitValueToday(sleepHabit.id, Number(sleepInput));
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { y: 0.8 },
      });
    }
  };

  // Calculate Revision Streak
  const revisionHabit = habits.find((h) => h.type === 'revision');
  let currentStreak = 0;
  if (revisionHabit) {
    const todayOrYesterdayLogged = habitLogs.some(
      (l) => l.habit_id === revisionHabit.id && l.completed
    );
    if (todayOrYesterdayLogged) {
      // count consecutive completed days
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
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Habit & Sleep Tracker
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Maintain high cognitive stamina: log sleep hours, protect your study streaks, and build discipline.
          </p>
        </div>
      </div>

      {/* Top Streak & Sleep Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard glow className="p-5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Revision Streak</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-rose-400 font-mono">
              {currentStreak}
            </span>
            <span className="text-xs text-slate-300 font-semibold">Days in a row 🔥</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Keep the momentum unbroken!</p>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Target Sleep</span>
            <Moon className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono">7.5h</span>
            <span className="text-xs text-emerald-400 font-semibold">Optimal Memory</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Sleep consolidates newly learned neural synapses.</p>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Daily Habits Active</span>
            <Award className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono">
              {habits.length}
            </span>
            <span className="text-xs text-slate-300">Habits</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Small rituals compound into Thanaweya triumphs.</p>
        </GlassCard>
      </div>

      {/* Log Today's Sleep Widget */}
      <GlassCard className="p-6 border border-indigo-500/20">
        <form onSubmit={handleSaveSleep} className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Log Last Night's Sleep Hours</h3>
              <p className="text-xs text-slate-400">Essential for mental focus during intense solving sessions.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="3"
              max="14"
              value={sleepInput}
              onChange={(e) => setSleepInput(e.target.value)}
              className="glass-input px-4 py-2 rounded-xl text-sm font-mono w-24 text-center"
            />
            <span className="text-xs text-slate-300 font-medium">hours</span>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl glass-button-primary text-xs font-bold"
            >
              Save Sleep
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Weekly Completion Grid Matrix */}
      <GlassCard className="p-6">
        <h2 className="text-sm font-bold text-white mb-4">Past 7 Days Consistency Matrix</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="pb-3 font-semibold text-slate-300">Habit Name</th>
                {pastDays.map((d) => (
                  <th key={d.dateStr} className="pb-3 text-center font-mono">
                    <span className="block text-[10px] text-slate-400">{d.dayName}</span>
                    <span className="text-[11px] text-slate-200">{d.dateStr.slice(8)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {habits.map((habit) => (
                <tr key={habit.id} className="hover:bg-white/[0.02]">
                  <td className="py-4 font-semibold text-white">
                    {habit.name}
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Target: {habit.target_value} {habit.unit}
                    </span>
                  </td>

                  {pastDays.map((d) => {
                    const log = habitLogs.find(
                      (l) => l.habit_id === habit.id && l.date === d.dateStr
                    );
                    const isCompleted = Boolean(log && log.completed);
                    const isToday = d.dateStr === todayStr;

                    return (
                      <td key={d.dateStr} className="py-4 text-center">
                        <button
                          onClick={() => {
                            if (isToday) handleToggle(habit.id);
                          }}
                          className={`w-8 h-8 rounded-xl mx-auto flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                              : isToday
                              ? 'bg-white/5 border border-white/15 text-slate-500 hover:border-cyan-400'
                              : 'bg-white/[0.02] border border-white/5 text-slate-600'
                          }`}
                          title={isToday ? 'Click to toggle today' : d.dateStr}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : isToday ? (
                            <span className="text-[10px] text-cyan-400 font-bold">•</span>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
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
