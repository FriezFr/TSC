'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassModal } from '@/components/ui/GlassModal';
import { Award, Plus, Trash2, Calculator } from 'lucide-react';
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

  // "What do I need" Calculator State
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

  const subjectGroups: { [subject: string]: typeof grades } = {};
  grades.forEach((g) => {
    if (!subjectGroups[g.subject]) subjectGroups[g.subject] = [];
    subjectGroups[g.subject].push(g);
  });

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

  let totalAllWeightedScore = 0;
  let totalAllWeightedMax = 0;
  grades.forEach((g) => {
    const w = g.weight || 1;
    totalAllWeightedScore += (g.score / g.max_score) * 100 * w;
    totalAllWeightedMax += 100 * w;
  });
  const overallPercentage =
    totalAllWeightedMax > 0 ? (totalAllWeightedScore / totalAllWeightedMax) * 100 : 0;

  // Next Test Calculator
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Grade Tracker
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Log scores and calculate requirements for your target percentage.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl glass-button-primary text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Log Score</span>
        </button>
      </div>

      {/* Top Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GlassCard className="p-4">
          <span className="text-xs text-neutral-400">Average Percentage</span>
          <div className="text-3xl font-black text-white font-mono mt-1">
            {overallPercentage > 0 ? `${overallPercentage.toFixed(1)}%` : '-'}
          </div>
          <span className="text-[11px] text-neutral-500">{grades.length} scores recorded</span>
        </GlassCard>

        <GlassCard className="p-4">
          <span className="text-xs text-neutral-400">Target Goal</span>
          <div className="text-3xl font-black text-white font-mono mt-1">
            {profile?.target_percentage || 95}%
          </div>
          <span className="text-[11px] text-neutral-500">Student target</span>
        </GlassCard>

        <GlassCard className="p-4">
          <span className="text-xs text-neutral-400">Active Subjects</span>
          <div className="text-3xl font-black text-white font-mono mt-1">
            {Object.keys(subjectGroups).length}
          </div>
          <span className="text-[11px] text-neutral-500">Subjects with grades</span>
        </GlassCard>
      </div>

      {/* Target Calculator */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-4 h-4 text-white" />
          <h2 className="text-sm font-bold text-white">Target Score Calculator</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Subject</label>
            <select
              value={calcSubject}
              onChange={(e) => setCalcSubject(e.target.value)}
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
            <label className="block text-xs font-medium text-neutral-300 mb-1">Target %</label>
            <input
              type="number"
              min={1}
              max={100}
              value={targetPercentage}
              onChange={(e) => setTargetPercentage(Number(e.target.value))}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Next Test Out Of</label>
            <input
              type="number"
              min={1}
              value={nextTestMax}
              onChange={(e) => setNextTestMax(Number(e.target.value))}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#111111] border border-white/10 text-center">
            <span className="block text-[11px] text-neutral-400">Score Needed:</span>
            <span className="text-lg font-black text-white font-mono">
              {neededRawScore > nextTestMax ? (
                <span className="text-red-400 text-xs">Exceeds 100%</span>
              ) : neededRawScore <= 0 ? (
                <span className="text-emerald-400 text-xs">Goal met</span>
              ) : (
                `${Math.ceil(neededRawScore)} / ${nextTestMax} (${neededScorePct.toFixed(1)}%)`
              )}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Grades List */}
      {grades.length === 0 ? (
        <GlassCard className="p-12 text-center text-neutral-500 space-y-2">
          <Award className="w-8 h-8 mx-auto text-neutral-600" />
          <p className="text-sm font-semibold text-neutral-300">No grades recorded yet</p>
          <p className="text-xs">Click "+ Log Score" to record your test scores.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Object.entries(subjectGroups).map(([subj, items]) => {
            const stats = calculateSubjectStats(items);

            return (
              <GlassCard key={subj} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{subj}</h3>
                    <span className="text-[11px] text-neutral-400">{stats.count} tests</span>
                  </div>
                  <span className="text-xl font-bold text-white font-mono">
                    {stats.percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  {items.map((grade) => (
                    <div
                      key={grade.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#111111] group"
                    >
                      <div>
                        <p className="text-xs font-medium text-neutral-200">{grade.title}</p>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {grade.date} • Weight: {grade.weight}x
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-white">
                          {grade.score}/{grade.max_score}
                        </span>
                        <button
                          onClick={() => deleteGrade(grade.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 cursor-pointer"
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
      )}

      {/* Add Modal */}
      <GlassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Test Score"
      >
        <form onSubmit={handleAddGrade} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">Subject</label>
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
            <label className="block text-xs font-medium text-neutral-300 mb-1">Assessment Name</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full glass-input px-3 py-2 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Score</label>
              <input
                type="number"
                step="0.5"
                required
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Max Score</label>
              <input
                type="number"
                step="1"
                required
                value={maxScore}
                onChange={(e) => setMaxScore(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Weight</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full glass-input px-3 py-2 rounded-xl text-xs font-mono"
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
