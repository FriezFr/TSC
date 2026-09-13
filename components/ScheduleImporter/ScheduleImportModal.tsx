'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { GlassModal } from '@/components/ui/GlassModal';
import {
  Sparkles,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Plus,
  ArrowRight,
  RefreshCw,
  Edit2,
  Check,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ParsedLessonSlot, ParsedScheduleTask, Priority } from '@/lib/types';

interface ScheduleImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SAMPLE_ENGLISH_SCHEDULE = `Math: Sunday, Tuesday and Thursday at 6 PM
English: Monday and Wednesday with Mom, with homework after each session
Science: Saturday at 8 PM, homework due before the next lesson. Science finishes at 10:30 PM.
Derasat: Tuesday at 7 PM, same system as Science`;

const SAMPLE_ARABIC_SCHEDULE = `رياضيات: السبت والإثنين والأربعاء الساعة 6 مساءً
English: الأحد والتلات مع ماما، وواجب بعد كل حصة
Science: السبت الساعة 8 مساءً، بيخلص 10:30، والـ homework لازم يخلص قبل الحصة الجاية
دراسات: الخميس الساعة 7 مساءً نفس نظام الساينس`;

const DAY_LABELS_EN = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_LABELS_AR = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

export default function ScheduleImportModal({
  isOpen,
  onClose,
  onSuccess,
}: ScheduleImportModalProps) {
  const { language, profile, importScheduleData } = useApp();

  const [scheduleText, setScheduleText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parsed results state
  const [parsedSummary, setParsedSummary] = useState('');
  const [clarifications, setClarifications] = useState<string[]>([]);
  const [lessons, setLessons] = useState<ParsedLessonSlot[]>([]);
  const [tasks, setTasks] = useState<ParsedScheduleTask[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    lessons: number;
    tasks: number;
    updated: number;
  } | null>(null);

  const isArabic = language === 'ar';

  const resetState = () => {
    setStep('input');
    setErrorMsg(null);
    setImportResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleAnalyze = async () => {
    if (!scheduleText.trim()) {
      setErrorMsg(isArabic ? 'يرجى كتابة أو لصق جدولك أولاً' : 'Please paste or type your schedule first');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/schedule/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scheduleText.trim(),
          userLanguage: language,
          track: profile?.study_division || 'general',
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to parse schedule');
      }

      setParsedSummary(data.summary || '');
      setClarifications(data.clarifications || []);
      setLessons(data.lessons || []);
      setTasks(data.tasks || []);
      setStep('preview');
    } catch (err: any) {
      console.error('Schedule analysis failed:', err);
      setErrorMsg(err.message || (isArabic ? 'حدث خطأ أثناء تحليل الجدول' : 'Failed to analyze schedule. Please check your text.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Preview Editing Handlers
  const handleUpdateLesson = (idx: number, field: keyof ParsedLessonSlot, value: any) => {
    setLessons((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleDeleteLesson = (idx: number) => {
    setLessons((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateTask = (idx: number, field: keyof ParsedScheduleTask, value: any) => {
    setTasks((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleDeleteTask = (idx: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  // Confirm and Save to TTASKER
  const handleAddToTTASKER = async () => {
    setIsSubmitting(true);
    try {
      const result = await importScheduleData(lessons, tasks);
      setImportResult({
        lessons: result.importedLessons,
        tasks: result.importedTasks,
        updated: result.updatedCount,
      });

      // Confetti celebration!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#ffffff', '#38bdf8', '#818cf8', '#34d399'],
      });

      if (onSuccess) onSuccess();

      // Auto close after 1.8 seconds so the user can see their success
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err: any) {
      console.error('Failed to import to TTASKER:', err);
      setErrorMsg(isArabic ? 'حدث خطأ أثناء الحفظ' : 'Failed to save items to TTASKER');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isArabic ? 'مستورد الجدول الذكي (AI Schedule Importer)' : 'AI Schedule Importer'}
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {step === 'input' ? (
          /* Step 1: Input Natural Language Text */
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
              <div className="leading-relaxed">
                {isArabic ? (
                  <>
                    اكتب أو الصق جدول دروسك ومذاكرتك بأي لغة (عربي، إنجليزي، أو مكس). الذكاء الاصطناعي هيتعرف تلقائياً على المواد، الأيام، المواعيد، الواجبات المتكررة، والمواعيد النهائية.
                  </>
                ) : (
                  <>
                    Type or paste your study schedule in plain English, Arabic, or mixed Franco. TTASKER will automatically detect subjects, lesson days, exact times, recurring sessions, and homework deadlines.
                  </>
                )}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-neutral-300">
                  {isArabic ? 'الصق جدولك هنا:' : 'Paste your schedule:'}
                </label>
                <span className="text-[11px] text-neutral-500 font-mono">
                  {scheduleText.length} {isArabic ? 'حرف' : 'chars'}
                </span>
              </div>
              <textarea
                rows={7}
                value={scheduleText}
                onChange={(e) => setScheduleText(e.target.value)}
                placeholder={`Math: Sunday, Tuesday and Thursday at 6 PM\nEnglish: Monday and Wednesday with Mom\nScience: Saturday at 8 PM, homework due before the next lesson. Science finishes at 10:30 PM.\nDerasat: Tuesday at 7 PM`}
                className="w-full glass-input p-3.5 rounded-xl text-xs leading-relaxed font-sans placeholder:text-neutral-600 focus:border-blue-400/50"
              />
            </div>

            {/* Quick Templates */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-neutral-400">
                {isArabic ? 'أو جرب نموذج جاهز بنقرة واحدة:' : 'Or load a sample with 1 click:'}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleText(SAMPLE_ENGLISH_SCHEDULE)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-neutral-300 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{isArabic ? 'نموذج إنجليزي' : 'English Sample'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleText(SAMPLE_ARABIC_SCHEDULE)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-neutral-300 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3 h-3 text-emerald-400" />
                  <span>{isArabic ? 'نموذج عامية مصرية' : 'Egyptian Arabic Sample'}</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Analyze Action */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl glass-button-secondary text-xs"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !scheduleText.trim()}
                className="px-5 py-2.5 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/10"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isArabic ? 'جاري التحليل بالذكاء الاصطناعي...' : 'Analyzing with AI...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>{isArabic ? 'تحليل الجدول' : 'Analyze Schedule'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Interactive Preview & In-Place Editing */
          <div className="space-y-4">
            {/* Summary Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="font-semibold">{parsedSummary || (isArabic ? 'تم تحليل الجدول بنجاح' : 'Schedule detected successfully')}</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200">
                {lessons.length} {isArabic ? 'حصص' : 'lessons'} • {tasks.length} {isArabic ? 'واجبات' : 'tasks'}
              </span>
            </div>

            {/* Clarification notices */}
            {clarifications.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isArabic ? 'ملاحظات وتوضيحات:' : 'Clarifications & Assumptions:'}</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/90 pl-1">
                  {clarifications.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* SECTION 1: Weekly Lessons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isArabic ? 'الحصص والمحاضرات الأسبوعية' : 'Detected Weekly Lessons'}</span>
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {lessons.length} {isArabic ? 'موعد' : 'slots'}
                </span>
              </div>

              {lessons.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#111111] text-neutral-500 text-xs text-center border border-white/5">
                  {isArabic ? 'لم يتم تحديد حصص أسبوعية' : 'No lesson slots detected'}
                </div>
              ) : (
                <div className="space-y-2">
                  {lessons.map((lesson, idx) => (
                    <div
                      key={lesson.importId || idx}
                      className="p-3 rounded-xl bg-[#111111] border border-white/10 space-y-2 group transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={lesson.subject}
                            onChange={(e) => handleUpdateLesson(idx, 'subject', e.target.value)}
                            className="bg-transparent text-xs font-bold text-white border-b border-transparent hover:border-white/20 focus:border-blue-400 focus:outline-none px-1 py-0.5 rounded w-36"
                          />
                          {lesson.roomOrTeacher && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-neutral-400 border border-white/10">
                              {lesson.roomOrTeacher}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteLesson(idx)}
                          className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                          title="Delete lesson"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Days & Time Controls */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1 bg-[#171717] px-2 py-1 rounded-lg border border-white/5 text-[11px]">
                          <Calendar className="w-3 h-3 text-neutral-400" />
                          <span className="text-neutral-300 font-medium">
                            {lesson.days.join(', ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[#171717] px-2 py-1 rounded-lg border border-white/5">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          <input
                            type="time"
                            value={lesson.startTime}
                            onChange={(e) => handleUpdateLesson(idx, 'startTime', e.target.value)}
                            className="bg-transparent text-[11px] font-mono text-white focus:outline-none"
                          />
                          <span className="text-neutral-500 text-[10px]">-</span>
                          <input
                            type="time"
                            value={lesson.endTime}
                            onChange={(e) => handleUpdateLesson(idx, 'endTime', e.target.value)}
                            className="bg-transparent text-[11px] font-mono text-white focus:outline-none"
                          />
                        </div>

                        <span className="text-[10px] text-neutral-500 font-mono ml-auto">
                          {isArabic ? 'متكرر أسبوعياً' : 'Weekly recurring'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 2: Homework & Tasks */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isArabic ? 'الواجبات والمهام المحسوبة' : 'Detected Homework & Tasks'}</span>
                </h3>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {tasks.length} {isArabic ? 'مهام' : 'tasks'}
                </span>
              </div>

              {tasks.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#111111] text-neutral-500 text-xs text-center border border-white/5">
                  {isArabic ? 'لا توجد واجبات مكتشفة' : 'No homework tasks detected'}
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task, idx) => (
                    <div
                      key={task.importId || idx}
                      className="p-3 rounded-xl bg-[#111111] border border-white/10 space-y-2 group transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => handleUpdateTask(idx, 'title', e.target.value)}
                            className="bg-transparent text-xs font-bold text-neutral-200 border-b border-transparent hover:border-white/20 focus:border-blue-400 focus:outline-none px-1 py-0.5 rounded w-44"
                          />
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {task.subject}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(idx)}
                          className="text-neutral-500 hover:text-red-400 p-1 cursor-pointer transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Due date, priority, rule */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5 bg-[#171717] px-2 py-1 rounded-lg border border-white/5">
                          <span className="text-[10px] text-neutral-400">{isArabic ? 'موعد التسليم:' : 'Due:'}</span>
                          <input
                            type="date"
                            value={task.calculatedDueDate}
                            onChange={(e) => handleUpdateTask(idx, 'calculatedDueDate', e.target.value)}
                            className="bg-transparent text-[11px] font-mono text-white focus:outline-none"
                          />
                        </div>

                        {/* Priority Selector */}
                        <div className="flex items-center rounded-lg bg-[#171717] p-0.5 border border-white/5 text-[10px]">
                          {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handleUpdateTask(idx, 'priority', p)}
                              className={`px-2 py-0.5 rounded uppercase font-bold transition-all cursor-pointer ${
                                task.priority === p
                                  ? p === 'high'
                                    ? 'bg-red-500/30 text-red-200'
                                    : 'bg-white text-black'
                                  : 'text-neutral-500 hover:text-neutral-300'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>

                        {task.notes && (
                          <span className="text-[10px] text-neutral-400 truncate max-w-[180px] italic">
                            {task.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Success Feedback Alert */}
            {importResult && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 stroke-[3] text-emerald-400" />
                <span>
                  {isArabic
                    ? `تم بنجاح! تم إضافة ${importResult.lessons} حصص و ${importResult.tasks} واجبات إلى جدول TTASKER!`
                    : `Success! Added ${importResult.lessons} lessons and ${importResult.tasks} tasks to TTASKER!`}
                </span>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-3.5 py-2 rounded-xl glass-button-secondary text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>{isArabic ? 'تعديل النص' : 'Edit Text'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-2 rounded-xl glass-button-secondary text-xs"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleAddToTTASKER}
                  disabled={isSubmitting || (lessons.length === 0 && tasks.length === 0)}
                  className="px-5 py-2.5 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isArabic ? 'جاري الحفظ في TTASKER...' : 'Adding to TTASKER...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{isArabic ? 'إضافة إلى TTASKER' : 'Add to TTASKER'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GlassModal>
  );
}
