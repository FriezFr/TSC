import {
  TimetableSlot,
  Assignment,
  Exam,
  StudySession,
  AcademicMemory,
  MistakeItem,
  StudyRecommendation,
} from '@/lib/types';

export interface DecisionEngineInput {
  timetable?: TimetableSlot[];
  assignments?: Assignment[];
  exams?: Exam[];
  sessions?: { id?: string; subject: string; duration_minutes: number; completed_at: string }[];
  academicMemories?: AcademicMemory[];
  mistakes?: MistakeItem[];
  now?: Date;
  language?: 'en' | 'ar';
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Computes the optimal single next study action based on real-time academic state.
 */
export function computeWhatToStudyNow(input: DecisionEngineInput): StudyRecommendation {
  const {
    timetable = [],
    assignments = [],
    exams = [],
    sessions = [],
    academicMemories = [],
    mistakes = [],
    now = new Date(),
    language = 'ar',
  } = input;

  const isAr = language === 'ar';
  const todayStr = now.toISOString().split('T')[0];

  // Map JS getDay() (0: Sun) to Egyptian week: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
  const jsDay = now.getDay();
  const currentDayIndex = jsDay === 6 ? 0 : jsDay + 1;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Check if an scheduled class is happening right now or in <= 30 mins
  const todayClasses = timetable.filter((s) => s.day_of_week === currentDayIndex);
  for (const slot of todayClasses) {
    const startM = timeToMinutes(slot.start_time);
    const endM = timeToMinutes(slot.end_time);

    // If currently inside class time
    if (currentMinutes >= startM && currentMinutes < endM) {
      return {
        subject: slot.subject,
        durationMinutes: Math.max(15, endM - currentMinutes),
        urgency: 'high',
        actionType: 'regular_study',
        reason: isAr
          ? `حصة ${slot.subject} جارية الآن في جدولك (حتى ${slot.end_time}). ركز مع الأستاذ ودون ملاحظاتك المهمة.`
          : `Your ${slot.subject} class is currently ongoing (until ${slot.end_time}). Stay focused and take notes.`,
      };
    }

    // If class starts in next 30 minutes
    if (startM > currentMinutes && startM - currentMinutes <= 30) {
      const waitTime = startM - currentMinutes;
      return {
        subject: slot.subject,
        durationMinutes: waitTime,
        urgency: 'high',
        actionType: 'regular_study',
        reason: isAr
          ? `حصة ${slot.subject} ستبدأ خلال ${waitTime} دقيقة (الساعة ${slot.start_time}). جهز كشكولك وراجع ملخص الحصة الماضية.`
          : `Your ${slot.subject} class begins in ${waitTime} minutes (${slot.start_time}). Prepare your materials and review notes.`,
      };
    }
  }

  // Calculate fatigue from today's sessions
  const todaySessions = sessions.filter((s) => (s.completed_at || '').startsWith(todayStr));
  const totalFocusMinsToday = todaySessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  const standardDuration = totalFocusMinsToday > 180 ? 25 : 45;

  // Candidates for study actions
  const candidates: StudyRecommendation[] = [];

  // 2. Imminent Exams (Exams within next 7 days)
  const upcomingExams = exams
    .map((e) => {
      const examTime = new Date(e.exam_date).getTime();
      const diffDays = Math.ceil((examTime - now.getTime()) / (1000 * 3600 * 24));
      return { ...e, diffDays };
    })
    .filter((e) => e.diffDays >= 0 && e.diffDays <= 7)
    .sort((a, b) => a.diffDays - b.diffDays);

  if (upcomingExams.length > 0) {
    const closestExam = upcomingExams[0];
    const weakTopic = academicMemories.find(
      (m) =>
        m.subject.toLowerCase() === closestExam.subject.toLowerCase() &&
        m.confidence_level === 'low'
    );

    const reasonAr = closestExam.diffDays === 0
      ? `امتحان ${closestExam.subject} اليوم! مراجعة سريعة لأهم القوانين والنقاط الأساسية قبل الدخول.`
      : closestExam.diffDays === 1
      ? `امتحان ${closestExam.subject} غداً! مراجعة مكثفة شاملة وحل أسئلة متوقعة.`
      : `امتحان ${closestExam.subject} بعد ${closestExam.diffDays} أيام${weakTopic ? `، ونقطة ضعفك الحالية هي: "${weakTopic.topic}"` : ''}. الأولوية القصوى للتثبيت الآن.`;

    const reasonEn = closestExam.diffDays === 0
      ? `Your ${closestExam.subject} exam is today! Do a quick formulas and key concept final check.`
      : closestExam.diffDays === 1
      ? `Your ${closestExam.subject} exam is tomorrow! Prioritize intensive revision and practice questions.`
      : `Your ${closestExam.subject} exam is in ${closestExam.diffDays} days${weakTopic ? ` (flagged weak topic: ${weakTopic.topic})` : ''}. Highest revision priority.`;

    candidates.push({
      subject: closestExam.subject,
      topic: weakTopic?.topic || closestExam.notes || (isAr ? 'مراجعة نهائية للامتحان' : 'Comprehensive Exam Prep'),
      durationMinutes: closestExam.diffDays <= 2 ? 45 : standardDuration,
      urgency: 'high',
      actionType: 'exam_prep',
      reason: isAr ? reasonAr : reasonEn,
    });
  }

  // 3. Urgent Pending Assignments (Due today or tomorrow)
  const pendingAssignments = assignments
    .filter((a) => !a.is_completed)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

  const urgentAssignments = pendingAssignments.filter((a) => {
    const diff = Math.ceil((new Date(a.due_date).getTime() - now.getTime()) / (1000 * 3600 * 24));
    return diff <= 1;
  });

  if (urgentAssignments.length > 0) {
    const topHw = urgentAssignments[0];
    candidates.push({
      subject: topHw.subject,
      topic: topHw.title,
      durationMinutes: standardDuration,
      urgency: topHw.priority === 'high' ? 'high' : 'medium',
      actionType: 'assignment',
      reason: isAr
        ? `واجب "${topHw.title}" مطلوب تسليمه قريباً (${topHw.due_date}). تخلصه الآن يوفر عليك التوتر ويثبت الفهم.`
        : `Assignment "${topHw.title}" is due soon (${topHw.due_date}). Finish it now to clear your schedule.`,
    });
  }

  // 4. Mistakes in Mistake Bank that need practice
  const unmasteredMistakes = mistakes.filter((m) => !m.is_mastered);
  if (unmasteredMistakes.length >= 3) {
    // Group mistakes by subject
    const subjectCounts: Record<string, number> = {};
    for (const m of unmasteredMistakes) {
      subjectCounts[m.subject] = (subjectCounts[m.subject] || 0) + 1;
    }
    const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0];

    if (topSubject) {
      candidates.push({
        subject: topSubject[0],
        topic: isAr ? `مراجعة بنك الأخطاء (${topSubject[1]} أسئلة)` : `Review Mistake Bank (${topSubject[1]} errors)`,
        durationMinutes: 25,
        urgency: 'medium',
        actionType: 'mistake_practice',
        reason: isAr
          ? `عندك ${topSubject[1]} أسئلة سابقة غير محلولة في بنك أخطاء ${topSubject[0]}. تصفير أخطائك يضمن لك العلامة الكاملة.`
          : `You have ${topSubject[1]} unmastered mistakes in ${topSubject[0]}. Practicing them guarantees error-free exam performance.`,
      });
    }
  }

  // 5. Weak Topics from Academic Memory
  const lowConfidenceMemories = academicMemories.filter((m) => m.confidence_level === 'low');
  if (lowConfidenceMemories.length > 0) {
    const mem = lowConfidenceMemories[0];
    candidates.push({
      subject: mem.subject,
      topic: mem.topic,
      durationMinutes: standardDuration,
      urgency: 'medium',
      actionType: 'weak_topic_revision',
      reason: isAr
        ? `ذاكرة TSC تسجل إن موضوع "${mem.topic}" في ${mem.subject} يحتاج تقوية ودقة أكبر. جلسة تركيز عليه الآن ستنقلك لمستوى أعلى.`
        : `Your Study Memory shows "${mem.topic}" in ${mem.subject} needs reinforcement. A focused session now will turn this into a strength.`,
    });
  }

  // 6. Any other pending assignment
  if (pendingAssignments.length > 0) {
    const hw = pendingAssignments[0];
    candidates.push({
      subject: hw.subject,
      topic: hw.title,
      durationMinutes: standardDuration,
      urgency: 'normal',
      actionType: 'assignment',
      reason: isAr
        ? `واجب "${hw.title}" في مادة ${hw.subject} مسجل في خطتك. إنجازه مبكراً يبقيك سابقاً لجدولك دايماً.`
        : `Assignment "${hw.title}" (${hw.subject}) is pending. Completing it keeps you ahead of schedule.`,
    });
  }

  // 7. General review / fallback based on track subjects
  const defaultSubject = 'Mathematics';
  const fallbackRecommendation: StudyRecommendation = {
    subject: defaultSubject,
    topic: isAr ? 'مراجعة واستذكار متقدم' : 'Core Concept Review',
    durationMinutes: standardDuration,
    urgency: 'normal',
    actionType: 'regular_study',
    reason: isAr
      ? 'لا توجد امتحانات أو واجبات ضاغطة حالياً. أفضل استثمار لوقتك هو مراجعة دروس الأسبوع وحل مسائل إضافية.'
      : 'No urgent deadlines right now. The best use of this time is advancing your weekly revision and practice questions.',
  };

  if (candidates.length === 0) {
    return fallbackRecommendation;
  }

  const primary = candidates[0];
  const alternativeCandidate = candidates.length > 1 ? candidates[1] : fallbackRecommendation;

  if (alternativeCandidate.subject !== primary.subject || alternativeCandidate.topic !== primary.topic) {
    primary.alternative = {
      subject: alternativeCandidate.subject,
      topic: alternativeCandidate.topic,
      durationMinutes: alternativeCandidate.durationMinutes,
      reason: alternativeCandidate.reason,
    };
  }

  return primary;
}
