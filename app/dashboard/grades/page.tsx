'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import { Award, Plus, Trash2, Calculator, Sparkles, TrendingUp } from 'lucide-react';
import { THANAWEYA_SUBJECTS } from '@/lib/types';

export default function GradeTrackerPage() {
  const { grades, addGrade, deleteGrade, profile } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Grade Form State
  const [subject, setSubject] = useState('Physics');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('60');
  const [weight, setWeight] = useState('1');

  // "What do I need on the next test" Calculator State
  const [calcSubject, setCalcSubject] = useState('Physics');
  const [targetPercentage, setTargetPercentage] = useState(95);
  const [nextTestWeight, setNextTestWeight] = useState(1);
  const [nextTestMax, setNextTestMax] = useState(60);

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !score) return;

    await addGrade({
      subject,
      title: title.trim(),
      score: Number(score),
      max_score: Number(maxScore) || 100,
      weight: Number(weight) || 1,
      date: new Date().toISOString().split('T')[0],
    });

    setTitle('');
    setScore('');
    setIsModalOpen(false);
  };

  // Group grades by subject
  const subjectGroups: { [subject: string]: typeof grades } = {};
  grades.forEach((g) => {
    if (!subjectGroups[g.subject]) subjectGroups[g.subject] = [];
    subjectGroups[g.subject].push(g);
  });

  // Calculate subject weighted percentage
  const calculateSubjectStats = (subjectGrades: typeof grades) => {
    let totalWeightedScore = 0;
    let totalWeightedMax = 0;
    subjectGrades.forEach((g) => {
      const w = g.weight || 1;
      totalWeightedScore += (g.score / g.max_score) * 100 * w;
      totalWeightedMax += 100 * w;
    });
    const percentage =
      totalWeightedMax > 0 ? (totalWeightedScore / totalWeightedMax) * 100 : 0;
    return { percentage, count: subjectGrades.length };
  };

  // Overall student average
  let totalAllWeightedScore = 0;
  let totalAllWeightedMax = 0;
  grades.forEach((g) => {
    const w = g.weight || 1;
    totalAllWeightedScore += (g.score / g.max_score) * 100 * w;
    totalAllWeightedMax += 100 * w;
  });
  const overallPercentage =
    totalAllWeightedMax > 0 ? (totalAllWeightedScore / totalAllWeightedMax) * 100 : 0;

  // "What do I need" calculation:
  // Target = (CurrentWeightedScore + ScoreNeeded/Max * 100 * W) / (CurrentWeightedMax + 100 * W)
  const calcSubjectGrades = subjectGroups[calcSubject] || [];
  let currWeightedScore = 0;
  let currWeightedMax = 0;
  calcSubjectGrades.forEach((g) => {
    const w = g.weight || 1;
    currWeightedScore += (g.score / g.max_score) * 100 * w;
    currWeightedMax += 100 * w;
  });

  const nextW = Number(nextTestWeight) || 1;
  const targetFraction = targetPercentage / 100;
  const newTotalMax = currWeightedMax + 100 * nextW;
  const neededScorePct = (targetFraction * newTotalMax - currWeightedScore) / nextW;
  const neededRawScore = (neededScorePct / 100) * nextTestMax;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)]">
              <Award className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Grade Tracker & Simulator
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Log scores and weights across chapters, quizzes, and comprehensive center trials.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl glass-button-primary text-xs font-bold flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Log Test Score</span>
        </button>
      </div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard glow className="p-5">
          <span className="text-xs font-medium text-slate-400">Current Cumulative Average</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono">
              {overallPercentage.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">across {grades.length} logs</span>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <span className="text-xs font-medium text-slate-400">Thanaweya Target Goal</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
              {profile.target_percentage}%
            </span>
            <span className="text-xs text-slate-400">
              Gap: {(profile.target_percentage - overallPercentage).toFixed(1)}%
            </span>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <span className="text-xs font-medium text-slate-400">Tracked Subjects</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono">
              {Object.keys(subjectGroups).length}
            </span>
            <span className="text-xs text-slate-400">subjects active</span>
          </div>
        </GlassCard>
      </div>

      {/* "What Do I Need On The Next Test" Calculator Widget */}
      <GlassCard glow className="p-6 border border-cyan-500/30">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              "What Do I Need on the Next Test?" Calculator
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                Interactive Simulator
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Set your target grade and find out the exact score needed on your next exam.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
            <select
              value={calcSubject}
              onChange={(e) => setCalcSubject(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs bg-slate-900 text-slate-200"
            >
              {Object.keys(subjectGroups).length > 0
                ? Object.keys(subjectGroups).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))
                : THANAWEYA_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.name.split(' ')[0]}>
                      {s.name}
                    </option>
                  ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Target Overall % (النسبة المستهدفة)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={targetPercentage}
              onChange={(e) => setTargetPercentage(Number(e.target.value))}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Next Test Out Of (الدرجة النهائية)
            </label>
            <input
              type="number"
              min={1}
              value={nextTestMax}
              onChange={(e) => setNextTestMax(Number(e.target.value))}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-xs font-mono"
            />
          </div>

          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-center">
            <span className="block text-[11px] text-cyan-300 font-semibold">You Need to Score:</span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono">
              {neededRawScore > nextTestMax ? (
                <span className="text-rose-400 text-sm">Target exceeds 100%</span>
              ) : neededRawScore <= 0 ? (
                <span className="text-emerald-400 text-sm">Any score (Goal met!)</span>
              ) : (
                `${Math.ceil(neededRawScore)} / ${nextTestMax} (${neededScorePct.toFixed(1)}%)`
              )}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Subject Grades Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(subjectGroups).map(([subj, items]) => {
          const stats = calculateSubjectStats(items);

          return (
            <GlassCard key={subj} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{subj}</h3>
                  <span className="text-xs text-slate-400">{stats.count} recorded assessments</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-cyan-400 font-mono">
                    {stats.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, stats.percentage))}%` }}
                />
              </div>

              {/* Individual assessment list */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                {items.map((grade) => (
                  <div
                    key={grade.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-200">{grade.title}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {grade.date} • Weight: {grade.weight}x
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold font-mono text-white">
                        {grade.score}/{grade.max_score}{' '}
                        <span className="text-slate-400 font-normal">
                          ({((grade.score / grade.max_score) * 100).toFixed(0)}%)
                        </span>
                      </span>

                      <button
                        onClick={() => deleteGrade(grade.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-400 transition-all"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Add Grade Modal */}
      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Test or Exam Score"
      >
        <form onSubmit={handleAddGrade} className="space-y-4">
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
                <option key={s.id} value={s.name.split(' ')[0]}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Assessment Name (عنوان الامتحان / الكويز)
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Chapter 2 Comprehensive Exam"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full glass-input px-3.5 py-2.5 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Your Score (الدرجة)
              </label>
              <input
                type="number"
                step="0.5"
                required
                placeholder="55"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Score (النهائية)
              </label>
              <input
                type="number"
                step="1"
                required
                placeholder="60"
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Weight (الوزن)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                placeholder="1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full glass-input px-3.5 py-2 rounded-xl text-xs font-mono"
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
              Save Grade
            </button>
          </div>
        </form>
      </GlassModal>
    </div>
  );
}
