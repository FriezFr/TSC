import { TimetableSlot, Assignment, Exam, ScheduleConflict } from '@/lib/types';

const EGYPTIAN_DAYS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

// Convert "HH:MM" string to minutes from midnight
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

/**
 * Detects schedule conflicts across timetable slots, assignments, and exams.
 */
export function detectScheduleConflicts(
  timetable: TimetableSlot[],
  assignments: Assignment[],
  exams: Exam[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // 1. Check Overlapping Lessons on the same day
  for (let day = 0; day <= 6; day++) {
    const dayClasses = timetable.filter((slot) => slot.day_of_week === day && slot.start_time && slot.end_time);

    for (let i = 0; i < dayClasses.length; i++) {
      for (let j = i + 1; j < dayClasses.length; j++) {
        const a = dayClasses[i];
        const b = dayClasses[j];

        const aStart = timeToMinutes(a.start_time);
        const aEnd = timeToMinutes(a.end_time);
        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time);

        // Overlap condition: max(start) < min(end)
        if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
          conflicts.push({
            id: `overlap-${a.id}-${b.id}`,
            type: 'overlapping_lessons',
            severity: 'high',
            title: `تداخل حصص: ${a.subject} و ${b.subject}`,
            description: `يوم ${EGYPTIAN_DAYS[day]}: حصة ${a.subject} (${a.start_time}-${a.end_time}) تتعارض مع حصة ${b.subject} (${b.start_time}-${b.end_time}).`,
            recommendation: `ننصح بتعديل موعد إحدى الحصتين لتجنب التضارب.`,
            relatedItems: [a.id, b.id],
          });
        }
      }
    }
  }

  // 2. Check Multiple Exams on the same day
  const examsByDate: { [date: string]: Exam[] } = {};
  for (const ex of exams) {
    if (!ex.exam_date) continue;
    if (!examsByDate[ex.exam_date]) examsByDate[ex.exam_date] = [];
    examsByDate[ex.exam_date].push(ex);
  }

  for (const [date, examList] of Object.entries(examsByDate)) {
    if (examList.length >= 2) {
      const subjects = examList.map((e) => e.subject).join(' و ');
      conflicts.push({
        id: `exam-conflict-${date}`,
        type: 'multiple_exams_same_day',
        severity: 'high',
        date,
        title: `امتحانين في نفس اليوم (${date})`,
        description: `عندك امتحانات في (${subjects}) في نفس اليوم.`,
        recommendation: `ابدأ مراجعة المادتين قبل موعد الامتحان بـ 3 أيام على الأقل لتوزيع الجهد.`,
        relatedItems: examList.map((e) => e.id),
      });
    }
  }

  // 3. Check Excessive Homework Deadlines (>= 3 pending assignments on same due date)
  const assignmentsByDate: { [date: string]: Assignment[] } = {};
  for (const a of assignments) {
    if (a.is_completed || !a.due_date) continue;
    if (!assignmentsByDate[a.due_date]) assignmentsByDate[a.due_date] = [];
    assignmentsByDate[a.due_date].push(a);
  }

  for (const [date, taskList] of Object.entries(assignmentsByDate)) {
    if (taskList.length >= 3) {
      const subjects = taskList.map((t) => t.subject).join(', ');
      conflicts.push({
        id: `workload-${date}`,
        type: 'excessive_workload',
        severity: 'medium',
        date,
        title: `ضغط واجبات مطلوب تسليمها (${date})`,
        description: `عندك ${taskList.length} واجبات مطلوبة في هذا اليوم (${subjects}).`,
        recommendation: `ننصح بإنهاء واجب ${taskList[0].subject} في اليوم السابق لتجنب تراكم المهام.`,
        relatedItems: taskList.map((t) => t.id),
      });
    }
  }

  return conflicts;
}

/**
 * Checks if an incoming lesson is a rescheduling of an existing slot.
 */
export function checkLessonChange(
  timetable: TimetableSlot[],
  subject: string,
  newDay: number,
  newStart?: string
): { existingSlot?: TimetableSlot; isRescheduled: boolean } {
  const normSubject = subject.toLowerCase().trim();
  const existing = timetable.find((s) => s.subject.toLowerCase().trim() === normSubject);

  if (existing) {
    const dayChanged = existing.day_of_week !== newDay;
    const timeChanged = newStart && existing.start_time !== newStart;
    if (dayChanged || timeChanged) {
      return { existingSlot: existing, isRescheduled: true };
    }
  }

  return { existingSlot: existing, isRescheduled: false };
}
