import { SupabaseClient } from '@supabase/supabase-js';

export type BotActionType =
  | 'assignment'          // alias for assignment_create
  | 'assignment_create'
  | 'assignment_update'
  | 'assignment_complete'
  | 'assignment_delete'
  | 'exam'                // alias for exam_create
  | 'exam_create'
  | 'exam_update'
  | 'exam_delete'
  | 'flashcard_create'
  | 'flashcard_add'
  | 'flashcard_delete'
  | 'lesson_change'
  | 'lesson_add'
  | 'lesson_cancel'
  | 'schedule_import'
  | 'note_create'
  | 'grade'
  | 'grade_create'
  | 'habit'
  | 'habit_log'
  | 'memory_record'
  | 'mistake_record'
  | 'mistake_mastered';

export interface BotAction {
  type: BotActionType;
  title?: string;
  subject?: string;
  topic?: string;
  confidence_level?: 'low' | 'medium' | 'high';
  common_errors?: string[];
  question?: string;
  student_answer?: string;
  correct_answer?: string;
  explanation?: string;
  mistake_type?: 'sign_error' | 'concept_gap' | 'calculation' | 'careless' | 'unknown';
  date?: string; // YYYY-MM-DD
  due_date?: string; // alias for date
  dayIndex?: number; // 0: Sat, 1: Sun, ..., 6: Fri
  dayName?: string;
  startTime?: string;
  endTime?: string;
  priority?: 'low' | 'medium' | 'high';
  is_completed?: boolean;
  notes?: string;
  score?: number;
  max_score?: number;
  value?: number;
  unit?: string;
  deckTitle?: string;
  description?: string;
  cards?: { question: string; answer: string }[];
  lessons?: any[];
  assignments?: any[];
  replaceExisting?: boolean;
  targetId?: string;
  content?: string;
  tags?: string[];
  [key: string]: any;
}

export interface BotExecutionResult {
  success: boolean;
  actionResults: {
    actionType: string;
    success: boolean;
    feedback: string;
    targetId?: string;
  }[];
  combinedFeedback: string;
}

/**
 * Normalizes subject names for fuzzy matching between English and Arabic
 */
function normalizeSubject(input: string = ''): string {
  const s = input.trim().toLowerCase();
  if (/math|رياضة|تفاضل|جبر|هندسة|حساب/i.test(s)) return 'Mathematics';
  if (/physic|فيزيا/i.test(s)) return 'Physics';
  if (/chem|كيميا/i.test(s)) return 'Chemistry';
  if (/bio|أحياء|احياء/i.test(s)) return 'Biology';
  if (/eng|إنجليزي|انجليزي/i.test(s)) return 'English';
  if (/arab|عربي/i.test(s)) return 'Arabic';
  if (/french|français|فرنساوي/i.test(s)) return 'French';
  if (/german|deutsch|ألماني|الماني/i.test(s)) return 'German';
  if (/geo|جغرافيا/i.test(s)) return 'Geography';
  if (/hist|تاريخ/i.test(s)) return 'History';
  if (/program|computer|حاسب|برمجة/i.test(s)) return 'Programming & AI';
  if (/social|derasat|دراسات/i.test(s)) return 'Social Studies';
  return input.trim();
}

/**
 * Execute one or multiple bot actions in Supabase, with automatic activity logging and bilingual confirmation.
 */
export async function executeBotActions(
  supabase: SupabaseClient | any,
  userId: string,
  actionsInput: BotAction | BotAction[] | null | undefined,
  options: {
    source: 'whatsapp' | 'telegram' | 'web';
    isEnglish?: boolean;
  }
): Promise<BotExecutionResult> {
  const isEnglish = !!options.isEnglish;
  const source = options.source;
  const today = new Date().toISOString().split('T')[0];

  if (!actionsInput) {
    return { success: true, actionResults: [], combinedFeedback: '' };
  }

  const rawActions = Array.isArray(actionsInput) ? actionsInput : [actionsInput];
  const actions = rawActions.filter((a) => a && typeof a === 'object' && a.type);

  if (actions.length === 0) {
    return { success: true, actionResults: [], combinedFeedback: '' };
  }

  const results: { actionType: string; success: boolean; feedback: string; targetId?: string }[] = [];

  for (const action of actions) {
    try {
      const type = action.type;

      // -------------------------------------------------------------
      // 1. FLASHCARDS & QUIZZES
      // -------------------------------------------------------------
      if (type === 'flashcard_create') {
        const subject = action.subject ? normalizeSubject(action.subject) : 'General';
        const title = action.title || (isEnglish ? `${subject} Quiz / Flashcards` : `كويز وفلاش كاردز ${subject}`);
        const description = action.description || (isEnglish ? `Created via ${source}` : `تم إنشاؤه عبر ${source}`);
        const cards = Array.isArray(action.cards) ? action.cards : [];

        const { data: newDeck, error: deckErr } = await supabase
          .from('flashcard_decks')
          .insert({
            user_id: userId,
            subject,
            title,
            description,
          })
          .select('*')
          .single();

        if (deckErr || !newDeck) {
          throw new Error(`Failed to create flashcard deck: ${deckErr?.message}`);
        }

        if (cards.length > 0) {
          const cardRows = cards.map((c: any) => ({
            deck_id: newDeck.id,
            user_id: userId,
            question: c.question || '',
            answer: c.answer || '',
            times_reviewed: 0,
            times_correct: 0,
          }));

          const { error: cardsErr } = await supabase.from('flashcards').insert(cardRows);
          if (cardsErr) {
            console.error('Error adding flashcard questions:', cardsErr);
          }
        }

        await supabase.from('ai_activity_logs').insert({
          user_id: userId,
          action_type: 'CREATE_TASK',
          title: isEnglish ? `Created Quiz: ${title}` : `إنشاء كويز / فلاش كاردز: ${title}`,
          description: isEnglish
            ? `Created deck with ${cards.length} questions from ${source}`
            : `تم إنشاء كويز وفلاش كاردز يحتوي على ${cards.length} أسئلة من ${source}`,
          source,
          target_id: newDeck.id,
          target_table: 'flashcard_decks',
          previous_state: null,
        });

        const feedback = isEnglish
          ? `🃏 Created new quiz/flashcard deck "${title}" with ${cards.length} questions on your dashboard! You can practice or review them anytime under Flashcards.`
          : `🃏 تم إنشاء كويز وفلاش كاردز جديدة "${title}" تحتوي على ${cards.length} سؤال على لوحة التحكم بموقعك! تقدر تتدرب عليها وتراجعها في أي وقت من قسم الفلاش كاردز.`;

        results.push({ actionType: type, success: true, feedback, targetId: newDeck.id });
        continue;
      }

      if (type === 'flashcard_add') {
        const subject = action.subject ? normalizeSubject(action.subject) : '';
        const deckTitle = action.deckTitle || action.title || '';
        const cards = Array.isArray(action.cards) ? action.cards : [];

        // Find existing deck
        let query = supabase.from('flashcard_decks').select('*').eq('user_id', userId);
        if (deckTitle) {
          query = query.ilike('title', `%${deckTitle}%`);
        } else if (subject) {
          query = query.ilike('subject', `%${subject}%`);
        }
        const { data: matchedDecks } = await query.order('created_at', { ascending: false }).limit(1);
        let targetDeck = matchedDecks?.[0];

        // If no deck found, create one
        if (!targetDeck) {
          const newTitle = deckTitle || `${subject || 'General'} Quiz`;
          const { data: created } = await supabase
            .from('flashcard_decks')
            .insert({
              user_id: userId,
              subject: subject || 'General',
              title: newTitle,
              description: 'Created via bot',
            })
            .select('*')
            .single();
          targetDeck = created;
        }

        if (targetDeck && cards.length > 0) {
          const cardRows = cards.map((c: any) => ({
            deck_id: targetDeck.id,
            user_id: userId,
            question: c.question || '',
            answer: c.answer || '',
            times_reviewed: 0,
            times_correct: 0,
          }));
          await supabase.from('flashcards').insert(cardRows);
        }

        const feedback = isEnglish
          ? `🃏 Added ${cards.length} new cards to "${targetDeck?.title || 'Quiz Deck'}"!`
          : `🃏 تم إضافة ${cards.length} بطاقة جديدة إلى "${targetDeck?.title || 'مجموعة الفلاش كاردز'}"!`;

        results.push({ actionType: type, success: true, feedback, targetId: targetDeck?.id });
        continue;
      }

      if (type === 'flashcard_delete') {
        const titleOrSubject = action.deckTitle || action.title || action.subject || '';
        const { data: matchedDecks } = await supabase
          .from('flashcard_decks')
          .select('*')
          .eq('user_id', userId)
          .or(`title.ilike.%${titleOrSubject}%,subject.ilike.%${titleOrSubject}%`)
          .limit(1);

        const targetDeck = matchedDecks?.[0];
        if (targetDeck) {
          await supabase.from('flashcard_decks').delete().eq('id', targetDeck.id);
          const feedback = isEnglish
            ? `🗑️ Deleted quiz deck "${targetDeck.title}".`
            : `🗑️ تم حذف مجموعة الكويز والفلاش كاردز "${targetDeck.title}".`;
          results.push({ actionType: type, success: true, feedback, targetId: targetDeck.id });
        }
        continue;
      }

      // -------------------------------------------------------------
      // 2. ASSIGNMENTS & DEADLINES
      // -------------------------------------------------------------
      if (type === 'assignment' || type === 'assignment_create') {
        const title = action.title || 'Homework';
        const rawSubject = action.subject || 'General';
        const subject = normalizeSubject(rawSubject);
        const dueDate = action.due_date || action.date || today;
        const priority = action.priority || 'medium';

        // Check for existing assignment to avoid exact duplicates
        const { data: existingA } = await supabase
          .from('assignments')
          .select('*')
          .eq('user_id', userId)
          .ilike('title', title)
          .ilike('subject', subject)
          .maybeSingle();

        if (existingA) {
          // Update existing
          await supabase
            .from('assignments')
            .update({
              due_date: dueDate,
              priority,
              notes: action.notes || existingA.notes,
            })
            .eq('id', existingA.id);

          await supabase.from('ai_activity_logs').insert({
            user_id: userId,
            action_type: 'UPDATE_LESSON',
            title: isEnglish ? `Updated Task: ${title}` : `تحديث موعد: ${title}`,
            description: isEnglish
              ? `Updated ${title} (${subject}) deadline to ${dueDate}`
              : `تم تحديث موعد تسليم ${title} (${subject}) إلى ${dueDate}`,
            source,
            target_id: existingA.id,
            target_table: 'assignments',
            previous_state: existingA,
          });

          const feedback = isEnglish
            ? `🔄 Updated ${title} (${subject}) deadline to ${dueDate}.`
            : `🔄 تم تحديث موعد تسليم ${title} (${subject}) إلى ${dueDate}.`;

          results.push({ actionType: type, success: true, feedback, targetId: existingA.id });
          continue;
        }

        const { data: newAssignment, error: aErr } = await supabase
          .from('assignments')
          .insert({
            user_id: userId,
            title,
            subject,
            due_date: dueDate,
            priority,
            notes: action.notes || undefined,
            is_completed: false,
          })
          .select('*')
          .single();

        if (aErr) throw new Error(`Failed to create assignment: ${aErr.message}`);

        await supabase.from('ai_activity_logs').insert({
          user_id: userId,
          action_type: 'CREATE_TASK',
          title: isEnglish ? `Added Assignment: ${title}` : `إضافة واجب: ${title}`,
          description: isEnglish
            ? `Subject: ${subject} • Due: ${dueDate} (${priority} priority)`
            : `المادة: ${subject} • موعد التسليم: ${dueDate} (أولوية: ${priority})`,
          source,
          target_id: newAssignment.id,
          target_table: 'assignments',
          previous_state: null,
        });

        const feedback = isEnglish
          ? `✓ Added assignment "${title}" (${subject}) due on ${dueDate} to your dashboard!`
          : `✓ تم تسجيل الواجب "${title}" (${subject}) بموعد تسليم ${dueDate} في جدولك!`;

        results.push({ actionType: type, success: true, feedback, targetId: newAssignment.id });
        continue;
      }

      // Complete or uncomplete assignment ("خلصت واجب...", "mark as done")
      if (type === 'assignment_complete') {
        const isCompleted = action.is_completed !== false;
        const targetSearch = action.title || action.subject || '';
        const normalizedSub = normalizeSubject(targetSearch);

        // Find best match among assignments
        const { data: candidates } = await supabase
          .from('assignments')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        let target = candidates?.find(
          (a: any) =>
            a.title.toLowerCase().includes(targetSearch.toLowerCase()) ||
            a.subject.toLowerCase().includes(targetSearch.toLowerCase()) ||
            a.subject.toLowerCase().includes(normalizedSub.toLowerCase())
        );

        if (target) {
          await supabase
            .from('assignments')
            .update({ is_completed: isCompleted })
            .eq('id', target.id);

          await supabase.from('ai_activity_logs').insert({
            user_id: userId,
            action_type: 'UPDATE_LESSON',
            title: isEnglish
              ? (isCompleted ? `Completed Task: ${target.title}` : `Reopened Task: ${target.title}`)
              : (isCompleted ? `إكمال الواجب: ${target.title}` : `إعادة فتح الواجب: ${target.title}`),
            description: isEnglish
              ? `Marked ${target.title} (${target.subject}) as ${isCompleted ? 'completed' : 'pending'}`
              : `تم تحديد ${target.title} (${target.subject}) كـ ${isCompleted ? 'مكتمل' : 'غير مكتمل'}`,
            source,
            target_id: target.id,
            target_table: 'assignments',
            previous_state: target,
          });

          const feedback = isEnglish
            ? (isCompleted
                ? `🎉 Great job! Marked "${target.title}" as completed in your dashboard.`
                : `🔄 Reopened "${target.title}" as pending.`)
            : (isCompleted
                ? `🎉 عاش يا بطل! تم تحديد واجب "${target.title}" كمكتمل في لوحة التحكم.`
                : `🔄 تم إعادة فتح واجب "${target.title}" كواجب معلق.`);

          results.push({ actionType: type, success: true, feedback, targetId: target.id });
        } else {
          const feedback = isEnglish
            ? `⚠️ Could not find an assignment matching "${targetSearch}".`
            : `⚠️ لم يتم العثور على واجب يطابق "${targetSearch}".`;
          results.push({ actionType: type, success: false, feedback });
        }
        continue;
      }

      // Update deadline or priority of existing assignment
      if (type === 'assignment_update') {
        const targetSearch = action.title || action.subject || '';
        const normalizedSub = normalizeSubject(targetSearch);
        const newDueDate = action.due_date || action.date;

        const { data: candidates } = await supabase
          .from('assignments')
          .select('*')
          .eq('user_id', userId)
          .eq('is_completed', false)
          .order('due_date', { ascending: true });

        const target = candidates?.find(
          (a: any) =>
            a.title.toLowerCase().includes(targetSearch.toLowerCase()) ||
            a.subject.toLowerCase().includes(targetSearch.toLowerCase()) ||
            a.subject.toLowerCase().includes(normalizedSub.toLowerCase())
        );

        if (target) {
          const updates: any = {};
          if (newDueDate) updates.due_date = newDueDate;
          if (action.priority) updates.priority = action.priority;
          if (action.newTitle) updates.title = action.newTitle;

          await supabase.from('assignments').update(updates).eq('id', target.id);

          await supabase.from('ai_activity_logs').insert({
            user_id: userId,
            action_type: 'UPDATE_LESSON',
            title: isEnglish ? `Updated Deadline: ${target.title}` : `تعديل موعد تسليم: ${target.title}`,
            description: isEnglish
              ? `New deadline: ${newDueDate || target.due_date}`
              : `الموعد الجديد: ${newDueDate || target.due_date}`,
            source,
            target_id: target.id,
            target_table: 'assignments',
            previous_state: target,
          });

          const feedback = isEnglish
            ? `🔄 Updated deadline for "${target.title}" to ${newDueDate || target.due_date}.`
            : `🔄 تم تعديل موعد تسليم "${target.title}" إلى ${newDueDate || target.due_date}.`;

          results.push({ actionType: type, success: true, feedback, targetId: target.id });
        }
        continue;
      }

      // Delete assignment
      if (type === 'assignment_delete') {
        const targetSearch = action.title || action.subject || '';
        const normalizedSub = normalizeSubject(targetSearch);

        const { data: candidates } = await supabase
          .from('assignments')
          .select('*')
          .eq('user_id', userId);

        const target = candidates?.find(
          (a: any) =>
            a.title.toLowerCase().includes(targetSearch.toLowerCase()) ||
            a.subject.toLowerCase().includes(targetSearch.toLowerCase()) ||
            a.subject.toLowerCase().includes(normalizedSub.toLowerCase())
        );

        if (target) {
          await supabase.from('assignments').delete().eq('id', target.id);

          await supabase.from('ai_activity_logs').insert({
            user_id: userId,
            action_type: 'CANCEL_LESSON',
            title: isEnglish ? `Deleted Task: ${target.title}` : `حذف واجب: ${target.title}`,
            description: `Deleted ${target.title} (${target.subject})`,
            source,
            target_id: target.id,
            target_table: 'assignments',
            previous_state: target,
          });

          const feedback = isEnglish
            ? `🗑️ Deleted assignment "${target.title}".`
            : `🗑️ تم حذف واجب "${target.title}" من جدولك.`;

          results.push({ actionType: type, success: true, feedback, targetId: target.id });
        }
        continue;
      }

      // -------------------------------------------------------------
      // 3. EXAMS & EXAM COUNTDOWNS
      // -------------------------------------------------------------
      if (type === 'exam' || type === 'exam_create') {
        const rawSubject = action.subject || 'General';
        const subject = normalizeSubject(rawSubject);
        const examDate = action.date || action.exam_date || today;
        const notes = action.notes || action.title || undefined;

        const { data: newExam, error: examErr } = await supabase
          .from('exams')
          .insert({
            user_id: userId,
            subject,
            exam_date: examDate,
            notes,
          })
          .select('*')
          .single();

        if (examErr) throw new Error(`Failed to create exam: ${examErr.message}`);

        await supabase.from('ai_activity_logs').insert({
          user_id: userId,
          action_type: 'CREATE_TASK',
          title: isEnglish ? `Added Exam: ${subject}` : `تسجيل امتحان: ${subject}`,
          description: isEnglish ? `Scheduled for: ${examDate}` : `الموعد: ${examDate}`,
          source,
          target_id: newExam.id,
          target_table: 'exams',
          previous_state: null,
        });

        const feedback = isEnglish
          ? `📅 Scheduled ${subject} exam on ${examDate}. Added to Exam Countdown!`
          : `📅 تم تسجيل امتحان ${subject} يوم ${examDate} في عداد الامتحانات على لوحة التحكم!`;

        results.push({ actionType: type, success: true, feedback, targetId: newExam.id });
        continue;
      }

      if (type === 'exam_update') {
        const rawSubject = action.subject || '';
        const subject = normalizeSubject(rawSubject);
        const newDate = action.date || action.exam_date;

        const { data: matchedExams } = await supabase
          .from('exams')
          .select('*')
          .eq('user_id', userId)
          .ilike('subject', `%${subject}%`)
          .order('exam_date', { ascending: true })
          .limit(1);

        const targetExam = matchedExams?.[0];
        if (targetExam) {
          const updates: any = {};
          if (newDate) updates.exam_date = newDate;
          if (action.notes) updates.notes = action.notes;

          await supabase.from('exams').update(updates).eq('id', targetExam.id);

          await supabase.from('ai_activity_logs').insert({
            user_id: userId,
            action_type: 'UPDATE_LESSON',
            title: isEnglish ? `Rescheduled Exam: ${targetExam.subject}` : `تأجيل امتحان: ${targetExam.subject}`,
            description: isEnglish ? `Moved to: ${newDate}` : `تم نقله إلى: ${newDate}`,
            source,
            target_id: targetExam.id,
            target_table: 'exams',
            previous_state: targetExam,
          });

          const feedback = isEnglish
            ? `📅 Rescheduled ${targetExam.subject} exam to ${newDate}.`
            : `📅 تم تعديل موعد امتحان ${targetExam.subject} ليصبح يوم ${newDate}.`;

          results.push({ actionType: type, success: true, feedback, targetId: targetExam.id });
        }
        continue;
      }

      if (type === 'exam_delete') {
        const rawSubject = action.subject || '';
        const subject = normalizeSubject(rawSubject);

        const { data: matchedExams } = await supabase
          .from('exams')
          .select('*')
          .eq('user_id', userId)
          .ilike('subject', `%${subject}%`)
          .limit(1);

        const targetExam = matchedExams?.[0];
        if (targetExam) {
          await supabase.from('exams').delete().eq('id', targetExam.id);

          await supabase.from('ai_activity_logs').insert({
            user_id: userId,
            action_type: 'CANCEL_LESSON',
            title: isEnglish ? `Cancelled Exam: ${targetExam.subject}` : `إلغاء امتحان: ${targetExam.subject}`,
            description: `Removed from schedule`,
            source,
            target_id: targetExam.id,
            target_table: 'exams',
            previous_state: targetExam,
          });

          const feedback = isEnglish
            ? `🗑️ Cancelled and removed ${targetExam.subject} exam.`
            : `🗑️ تم إلغاء وحذف امتحان ${targetExam.subject} من لوحة التحكم.`;

          results.push({ actionType: type, success: true, feedback, targetId: targetExam.id });
        }
        continue;
      }

      // -------------------------------------------------------------
      // 4. TIMETABLE LESSONS (RESCHEDULE, ADD, CANCEL)
      // -------------------------------------------------------------
      if (type === 'lesson_change' || type === 'lesson_add') {
        const subject = normalizeSubject(action.subject || 'General');
        const dayIndex = typeof action.dayIndex === 'number' ? action.dayIndex : 0;
        const startTime = action.startTime || '08:00';
        const endTime = action.endTime || '09:30';
        const roomOrTeacher = action.room_or_teacher || action.notes || '';

        // Check existing slot for this subject
        const { data: existingSlots } = await supabase
          .from('timetable')
          .select('*')
          .eq('user_id', userId)
          .ilike('subject', `%${subject}%`);

        const targetSlot = existingSlots?.[0];

        if (targetSlot && type === 'lesson_change') {
          // Update existing
          await supabase
            .from('timetable')
            .update({
              day_of_week: dayIndex,
              start_time: startTime,
              end_time: endTime,
              room_or_teacher: roomOrTeacher || targetSlot.room_or_teacher,
            })
            .eq('id', targetSlot.id);

          await supabase.from('ai_activity_logs').insert({
            user_id: userId,
            action_type: 'UPDATE_LESSON',
            title: isEnglish ? `Rescheduled Lesson: ${subject}` : `تعديل موعد حصة: ${subject}`,
            description: isEnglish
              ? `Moved to day ${action.dayName || dayIndex} at ${startTime}`
              : `تم نقل الموعد ليوم ${action.dayName || dayIndex} الساعة ${startTime}`,
            source,
            target_id: targetSlot.id,
            target_table: 'timetable',
            previous_state: targetSlot,
          });

          const feedback = isEnglish
            ? `🔄 Rescheduled ${subject} class to day ${action.dayName || dayIndex} (${startTime} - ${endTime}) in your timetable!`
            : `🔄 تم تعديل موعد حصة ${subject} في جدولك ليوم ${action.dayName || dayIndex} (${startTime} - ${endTime})!`;

          results.push({ actionType: type, success: true, feedback, targetId: targetSlot.id });
        } else {
          // Insert new slot
          const { data: newSlot } = await supabase
            .from('timetable')
            .insert({
              user_id: userId,
              subject,
              day_of_week: dayIndex,
              start_time: startTime,
              end_time: endTime,
              room_or_teacher: roomOrTeacher,
            })
            .select('*')
            .single();

          await supabase.from('ai_activity_logs').insert({
            user_id: userId,
            action_type: 'UPDATE_LESSON',
            title: isEnglish ? `Added Class: ${subject}` : `إضافة حصة: ${subject}`,
            description: `Day ${action.dayName || dayIndex} at ${startTime}`,
            source,
            target_id: newSlot?.id,
            target_table: 'timetable',
            previous_state: null,
          });

          const feedback = isEnglish
            ? `✓ Added ${subject} class to your timetable for day ${action.dayName || dayIndex} (${startTime} - ${endTime})!`
            : `✓ تم إضافة حصة ${subject} لجدولك ليوم ${action.dayName || dayIndex} (${startTime} - ${endTime})!`;

          results.push({ actionType: type, success: true, feedback, targetId: newSlot?.id });
        }
        continue;
      }

      if (type === 'lesson_cancel') {
        const subject = normalizeSubject(action.subject || 'General');
        const { data: existingSlots } = await supabase
          .from('timetable')
          .select('*')
          .eq('user_id', userId)
          .ilike('subject', `%${subject}%`);

        const targetSlot = existingSlots?.[0];
        if (targetSlot) {
          await supabase.from('timetable').delete().eq('id', targetSlot.id);

          await supabase.from('ai_activity_logs').insert({
            user_id: userId,
            action_type: 'CANCEL_LESSON',
            title: isEnglish ? `Cancelled Class: ${subject}` : `إلغاء حصة: ${subject}`,
            description: `Removed from timetable`,
            source,
            target_id: targetSlot.id,
            target_table: 'timetable',
            previous_state: targetSlot,
          });

          const feedback = isEnglish
            ? `✓ Cancelled ${subject} lesson and removed it from your weekly timetable.`
            : `✓ تم تسجيل إلغاء حصة ${subject} وحذفها من جدولك الأسبوعي.`;

          results.push({ actionType: type, success: true, feedback, targetId: targetSlot.id });
        }
        continue;
      }

      // -------------------------------------------------------------
      // 5. FULL SCHEDULE IMPORT
      // -------------------------------------------------------------
      if (type === 'schedule_import') {
        const lessons = Array.isArray(action.lessons) ? action.lessons : [];
        const assignments = Array.isArray(action.assignments) ? action.assignments : [];

        if (action.replaceExisting !== false) {
          await supabase.from('timetable').delete().eq('user_id', userId);
        }

        const rowsToInsert = lessons.map((l: any) => ({
          user_id: userId,
          subject: normalizeSubject(l.subject || 'General'),
          day_of_week: typeof l.dayIndex === 'number' ? l.dayIndex : 0,
          start_time: l.startTime || '08:00',
          end_time: l.endTime || '09:30',
          room_or_teacher: l.room_or_teacher || l.notes || 'Weekly Routine',
        }));

        if (rowsToInsert.length > 0) {
          await supabase.from('timetable').insert(rowsToInsert);
        }

        if (assignments.length > 0) {
          const hwRows = assignments.map((a: any) => ({
            user_id: userId,
            title: a.title || 'Homework',
            subject: normalizeSubject(a.subject || 'General'),
            due_date: a.date || a.due_date || today,
            priority: a.priority || 'medium',
            is_completed: false,
          }));
          await supabase.from('assignments').insert(hwRows);
        }

        await supabase.from('ai_activity_logs').insert({
          user_id: userId,
          action_type: 'UPDATE_LESSON',
          title: 'Import Weekly Routine',
          description: `Imported ${rowsToInsert.length} classes and ${assignments.length} assignments`,
          source,
        });

        const feedback = isEnglish
          ? `✅ Successfully imported your weekly routine: ${rowsToInsert.length} classes and ${assignments.length} tasks recorded!`
          : `✅ تم تثبيت وتحديث جدولك الأسبوعي الجديد (${rowsToInsert.length} حصة) وتسجيل المهام في نظام TaskerBot!`;

        results.push({ actionType: type, success: true, feedback });
        continue;
      }

      // -------------------------------------------------------------
      // 6. NOTES, GRADES & HABITS
      // -------------------------------------------------------------
      if (type === 'note_create') {
        const content = action.content || action.title || '';
        const tags = Array.isArray(action.tags) ? action.tags : ['Bot-Note'];

        if (content) {
          const { data: newNote } = await supabase
            .from('notes')
            .insert({
              user_id: userId,
              content,
              tags,
            })
            .select('*')
            .single();

          const feedback = isEnglish
            ? `📝 Saved note to your Notes page.`
            : `📝 تم حفظ الملاحظة في صفحة الملاحظات.`;

          results.push({ actionType: type, success: true, feedback, targetId: newNote?.id });
        }
        continue;
      }

      if (type === 'grade' || type === 'grade_create') {
        const score = Number(action.score) || 0;
        const maxScore = Number(action.max_score) || 60;
        const subject = normalizeSubject(action.subject || 'General');

        await supabase.from('grades').insert({
          user_id: userId,
          subject,
          title: action.title || `${source} Log (${today})`,
          score,
          max_score: maxScore,
          weight: 1.0,
          date: today,
        });

        const feedback = isEnglish
          ? `📊 Recorded grade for ${subject}: ${score}/${maxScore}.`
          : `📊 تم تسجيل الدرجة في ${subject}: (${score}/${maxScore}).`;

        results.push({ actionType: type, success: true, feedback });
        continue;
      }

      if (type === 'habit' || type === 'habit_log') {
        const habitValue = Number(action.value) || 1;
        const { data: userHabits } = await supabase.from('habits').select('*').eq('user_id', userId);
        const targetHabit = userHabits?.[0];

        if (targetHabit) {
          await supabase.from('habit_logs').upsert(
            {
              user_id: userId,
              habit_id: targetHabit.id,
              date: today,
              value: habitValue,
              completed: true,
            },
            { onConflict: 'user_id,habit_id,date' }
          );
        }

        const feedback = isEnglish
          ? `⚡ Logged daily habit progress.`
          : `⚡ تم تسجيل العادة اليومية.`;

        results.push({ actionType: type, success: true, feedback });
        continue;
      }

      // -------------------------------------------------------------
      // 7. ACADEMIC MEMORY (WEAK TOPICS & PITFALLS)
      // -------------------------------------------------------------
      if (type === 'memory_record') {
        const subject = normalizeSubject(action.subject || 'General');
        const topic = action.topic || action.title || 'General Concept';
        const confidence = action.confidence_level || 'low';
        const commonErrors = Array.isArray(action.common_errors) ? action.common_errors : [];
        const notes = action.notes || '';

        const { data: existingMem } = await supabase
          .from('academic_memories')
          .select('*')
          .eq('user_id', userId)
          .ilike('subject', `%${subject}%`)
          .ilike('topic', `%${topic}%`)
          .maybeSingle();

        if (existingMem) {
          await supabase
            .from('academic_memories')
            .update({
              confidence_level: confidence,
              common_errors: commonErrors.length > 0 ? commonErrors : existingMem.common_errors,
              notes: notes || existingMem.notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingMem.id);
        } else {
          await supabase.from('academic_memories').insert({
            user_id: userId,
            subject,
            topic,
            confidence_level: confidence,
            common_errors: commonErrors,
            notes,
          });
        }

        const feedback = isEnglish
          ? `🧠 Study Memory: Recorded "${topic}" in ${subject} (${confidence} confidence). I will prioritize this in your revision plans and mock tests!`
          : `🧠 ذاكرة TSC الأكاديمية: تم تسجيل نقطة "${topic}" في ${subject} (مستوى: ${confidence}). سأعطيها الأولوية في خطط مذاكرتك والاختبارات القادمة!`;

        results.push({ actionType: type, success: true, feedback });
        continue;
      }

      // -------------------------------------------------------------
      // 8. MISTAKE BANK
      // -------------------------------------------------------------
      if (type === 'mistake_record') {
        const subject = normalizeSubject(action.subject || 'General');
        const topic = action.topic || '';
        const question = action.question || action.title || '';
        const studentAnswer = action.student_answer || '';
        const correctAnswer = action.correct_answer || '';
        const explanation = action.explanation || '';
        const mistakeType = action.mistake_type || 'concept_gap';

        if (question && correctAnswer) {
          const { data: existingMistake } = await supabase
            .from('mistake_bank')
            .select('*')
            .eq('user_id', userId)
            .ilike('question', `%${question.slice(0, 50)}%`)
            .maybeSingle();

          if (existingMistake) {
            await supabase
              .from('mistake_bank')
              .update({
                times_repeated: (existingMistake.times_repeated || 1) + 1,
                is_mastered: false,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingMistake.id);
          } else {
            await supabase.from('mistake_bank').insert({
              user_id: userId,
              subject,
              topic,
              question,
              student_answer: studentAnswer,
              correct_answer: correctAnswer,
              explanation,
              mistake_type: mistakeType,
              times_repeated: 1,
              is_mastered: false,
            });
          }

          const feedback = isEnglish
            ? `📚 Saved mistake to your Mistake Bank (${subject}). You can practice your mistakes anytime under Mistake Bank!`
            : `📚 تم حفظ السؤال في بنك الأخطاء (${subject}). يمكنك مراجعة وتصفير أخطائك في أي وقت لتثبيت الإجابة النموذجية!`;

          results.push({ actionType: type, success: true, feedback });
        }
        continue;
      }

      if (type === 'mistake_mastered') {
        const questionOrTopic = action.question || action.topic || action.title || '';
        const { data: matched } = await supabase
          .from('mistake_bank')
          .select('*')
          .eq('user_id', userId)
          .eq('is_mastered', false)
          .or(`question.ilike.%${questionOrTopic}%,topic.ilike.%${questionOrTopic}%`)
          .limit(1);

        const target = matched?.[0];
        if (target) {
          await supabase
            .from('mistake_bank')
            .update({ is_mastered: true, updated_at: new Date().toISOString() })
            .eq('id', target.id);

          const feedback = isEnglish
            ? `🎉 Great job! Marked mistake as Mastered in your Mistake Bank.`
            : `🎉 عاش يا بطل! تم تحديد السؤال كـ "تم إتقانه" في بنك الأخطاء.`;

          results.push({ actionType: type, success: true, feedback, targetId: target.id });
        }
        continue;
      }
    } catch (err) {
      console.error(`Error executing action ${action.type}:`, err);
      results.push({
        actionType: action.type,
        success: false,
        feedback: isEnglish ? `⚠️ Could not complete ${action.type}.` : `⚠️ تعذر تنفيذ العملية المطلوبة.`,
      });
    }
  }

  const combinedFeedback = results
    .map((r) => r.feedback)
    .filter(Boolean)
    .join('\n');

  return {
    success: results.every((r) => r.success),
    actionResults: results,
    combinedFeedback,
  };
}

/**
 * Builds a comprehensive overview of the student's active database items
 * (Timetable, Assignments, Exams, Flashcard Decks, Notes, Academic Memories, Mistake Bank)
 * to pass as rich context to Gemini.
 */
export async function buildFullStudentContext(supabase: SupabaseClient | any, userId: string): Promise<string> {
  try {
    const [timetableRes, assignmentsRes, examsRes, decksRes, notesRes, memoriesRes, mistakesRes] = await Promise.all([
      supabase.from('timetable').select('*').eq('user_id', userId).order('day_of_week', { ascending: true }),
      supabase.from('assignments').select('*').eq('user_id', userId).eq('is_completed', false).order('due_date', { ascending: true }).limit(15),
      supabase.from('exams').select('*').eq('user_id', userId).order('exam_date', { ascending: true }).limit(10),
      supabase.from('flashcard_decks').select('id, subject, title, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('notes').select('content, tags').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      supabase.from('academic_memories').select('*').eq('user_id', userId).order('confidence_level', { ascending: true }).limit(10),
      supabase.from('mistake_bank').select('*').eq('user_id', userId).eq('is_mastered', false).order('times_repeated', { ascending: false }).limit(10),
    ]);

    const dayNames = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timetableLines = (timetableRes.data || []).map(
      (s: any) => `- Day ${s.day_of_week} (${dayNames[s.day_of_week] || s.day_of_week}): ${s.subject} (${s.start_time} - ${s.end_time}${s.room_or_teacher ? `, ${s.room_or_teacher}` : ''})`
    );

    const assignmentLines = (assignmentsRes.data || []).map(
      (a: any) => `- [Assignment ID: ${a.id}] ${a.title} (${a.subject}, Due: ${a.due_date}, Priority: ${a.priority || 'medium'})`
    );

    const examLines = (examsRes.data || []).map(
      (e: any) => `- [Exam ID: ${e.id}] ${e.subject} on ${e.exam_date}${e.notes ? ` (${e.notes})` : ''}`
    );

    const deckLines = (decksRes.data || []).map(
      (d: any) => `- [Deck ID: ${d.id}] ${d.title} (${d.subject})`
    );

    const memoryLines = (memoriesRes.data || []).map(
      (m: any) => `- [Weak Topic] ${m.subject} -> ${m.topic} (Confidence: ${m.confidence_level}${m.common_errors?.length ? `, Errors: ${m.common_errors.join(', ')}` : ''})`
    );

    const mistakeLines = (mistakesRes.data || []).map(
      (mis: any) => `- [Mistake Bank] ${mis.subject}${mis.topic ? ` (${mis.topic})` : ''}: Q: "${mis.question.slice(0, 80)}" -> Correct: "${mis.correct_answer.slice(0, 60)}" (Repeated: ${mis.times_repeated}x)`
    );

    const noteLines = (notesRes.data || []).map(
      (n: any) => `- ${n.content}`
    );

    return `CURRENT ACTIVE STUDENT DATABASE STATE:
=== WEEKLY TIMETABLE CLASSES ===
${timetableLines.length > 0 ? timetableLines.join('\n') : 'No classes scheduled.'}

=== PENDING ASSIGNMENTS & HOMEWORK ===
${assignmentLines.length > 0 ? assignmentLines.join('\n') : 'No pending assignments.'}

=== UPCOMING EXAMS ===
${examLines.length > 0 ? examLines.join('\n') : 'No upcoming exams scheduled.'}

=== AI STUDY MEMORY (WEAK TOPICS TO PRIORITIZE) ===
${memoryLines.length > 0 ? memoryLines.join('\n') : 'No weak topics logged yet.'}

=== UNMASTERED MISTAKE BANK (FREQUENT ERRORS) ===
${mistakeLines.length > 0 ? mistakeLines.join('\n') : 'No unmastered mistakes logged.'}

=== EXISTING FLASHCARD & QUIZ DECKS ===
${deckLines.length > 0 ? deckLines.join('\n') : 'No flashcard decks yet.'}

=== RECENT NOTES ===
${noteLines.length > 0 ? noteLines.join('\n') : 'No recent notes.'}`;
  } catch (err) {
    console.error('Error building student context:', err);
    return '';
  }
}

/**
 * Comprehensive guide explaining all Dashboard features and Voice/Chat commands in TSC.
 * Clean plain text with NO asterisks (*, **).
 */
export function getTSCCommandsGuide(options: {
  isEnglish: boolean;
  isLinked: boolean;
  userName?: string;
}): string {
  const { isEnglish, isLinked, userName } = options;
  const firstName = userName ? userName.split(' ')[0] : '';

  if (isEnglish) {
    const greeting = firstName ? `👋 Welcome, ${firstName}!` : '👋 Welcome to TSC!';
    let guide =
      `${greeting} I am TSC (The Student Companion) — your Smart School Operating System for Thanaweya & Baccalaureate.\n\n` +
      'Here is your complete guide to your Dashboard features and all the Voice/Chat Commands you can tell me anytime:\n\n' +
      '📊 WHAT DOES YOUR DASHBOARD DO?\n' +
      '• 📚 Timetable (الجدول): Organizes your weekly school lessons, private tutors, and study slots.\n' +
      '• 📝 Assignments (الواجبات): Tracks all your homework, deadlines, and urgency priorities.\n' +
      '• 🎯 Exams (الامتحانات): Live countdown to all your upcoming test dates.\n' +
      '• 🗂️ Flashcards & Quizzes: Generates smart revision cards and mock exams from your notes and photos.\n' +
      '• 🧠 AI Study Memory: Automatically tracks difficult topics and sign mistakes so you master them before exams.\n' +
      '• ❌ Mistake Bank: Collects questions you previously missed so you can re-test yourself until 100% mastered.\n' +
      '• ⏱️ Pomodoro Focus: Logs your genuine study blocks and focus cycles.\n' +
      '• 📈 Grades & Notes: Records your report card scores and lecture takeaways.\n\n' +
      '💬 VOICE & CHAT COMMANDS YOU CAN USE:\n' +
      '1. TIMETABLE & CLASSES:\n' +
      '• "What is my schedule this week?" / "قولي جدول الأسبوع" -> Shows your day-by-day classes and times.\n' +
      '• "Add Physics lesson on Sunday at 8 PM" -> Adds a new class to your timetable.\n' +
      '• "Move Math class to Saturday at 10 AM" -> Automatically reschedules a class.\n' +
      '• "Cancel Arabic class tomorrow" -> Removes the lesson.\n\n' +
      '2. HOMEWORK & ASSIGNMENTS:\n' +
      '• "What tasks do I have today?" / "عليا إيه النهارده؟" -> Lists all pending homework due soon.\n' +
      '• "Add Chemistry homework page 45 due Tuesday" -> Registers new assignment with deadline.\n' +
      '• "I finished Math homework" / "خلصت واجب الماث" -> Marks it completed in your dashboard!\n' +
      '• "Change English homework deadline to Thursday" -> Reschedules the due date.\n\n' +
      '3. SMART STUDY ADVISOR:\n' +
      '• "What should I study right now?" / "أذاكر إيه دلوقتي؟" -> Analyzes exams, pending tasks, and weak topics to give you ONE clear, decisive study action.\n' +
      '• "Start focus session" / "ابدأ جلسة تركيز" -> Starts a focused study timer.\n\n' +
      '4. PHOTOS, WORKSHEETS & PDF SCANNER:\n' +
      '• Send ANY photo of a book, worksheet, or exam -> I solve and explain ALL questions step-by-step and create flashcards!\n' +
      '• Forward ANY lecture PDF or document -> I summarize key takeaways and definitions.\n\n' +
      '5. AI STUDY MEMORY & MISTAKE BANK:\n' +
      '• "I keep messing up quadratic equations" -> Saves the weak topic to your AI Memory.\n' +
      '• "Quiz me on my mistakes" / "امتحني في بنك أخطائي" -> Tests you on questions you previously got wrong.\n\n' +
      '6. EXAMS & COUNTDOWN:\n' +
      '• "Chemistry comprehensive exam on Sep 25" -> Adds exam countdown.\n' +
      '• "What upcoming exams do I have?" -> Lists all scheduled tests.';

    if (!isLinked) {
      guide +=
        '\n\n🔗 CONNECT YOUR WHATSAPP TO YOUR DASHBOARD:\n' +
        '1. Open Settings: https://taskerbot.vercel.app/dashboard/settings\n' +
        '2. Click "Generate Code"\n' +
        '3. Send the 6-character code here to connect your schedule instantly!';
    } else {
      guide += '\n\n💡 What would you like to check or work on right now?';
    }

    return guide;
  }

  // Arabic version
  const greeting = firstName ? `👋 مرحباً يا ${firstName}!` : '👋 أهلاً بك في TSC!';
  let guide =
    `${greeting} أنا رفيقك الدراسي الشامل ونظام التشغيل المدرسي الذكي للثانوية العامة والبكالوريا (TSC AI).\n\n` +
    'إليك الدليل الكامل لكل أقسام لوحة التحكم (Dashboard) وأهم الأوامر الصوتية والنصية اللي تقدر تستخدمها:\n\n' +
    '📊 أقسام لوحة التحكم (DASHBOARD) وبتعمل إيه:\n' +
    '• 📚 الجدول الأسبوعي (Timetable): تنظيم كل حصصك المدرسية ودروسك الخاصة وأوقات المذاكرة يوم بيوم.\n' +
    '• 📝 الواجبات والمهام (Assignments): متابعة كل الواجبات ومواعيد تسليمها مع تحديد الأولويات المهمة.\n' +
    '• 🎯 الامتحانات (Exams): عد تنازلي لمواعيد امتحاناتك وجداول المراجعة الشاملة.\n' +
    '• 🗂️ الفلاش كاردز والكويزات: بطاقات استذكار واختبارات تدريبية بتتولد تلقائياً من مذكراتك وأسئلتك.\n' +
    '• 🧠 ذاكرة المذاكرة (AI Study Memory): بنسجل الدروس والمفاهيم اللي بتتلخبط فيها عشان نركز عليها قبل الامتحانات.\n' +
    '• ❌ بنك الأخطاء (Mistake Bank): حفظ الأسئلة اللي غلطت فيها وإعادة التدريب عليها لحد ما تتقنها 100%.\n' +
    '• ⏱️ جلسات التركيز وبومودورو (Pomodoro): حساب ساعات المذاكرة الصافية بدون تشتت.\n' +
    '• 📈 الدرجات والملاحظات: تسجيل درجات الامتحانات والتلخيصات السريعة.\n\n' +
    '💬 أهم الأوامر اللي تقدر تبعتهالي فويس أو شات:\n' +
    '1. الجدول والحصص:\n' +
    '• "قولي جدول الأسبوع كلو" -> بعرضلك جدولك بالتفصيل ومواعيد الحصص.\n' +
    '• "ضيف حصة فيزيا الأحد الساعة 8 بالليل" -> بضيفها فوراً في جدولك.\n' +
    '• "مستر محمد نقل حصة الماث للسبت الساعة 10 الصبح" -> بعدل الميعاد تلقائياً.\n' +
    '• "الغي حصة العربي بكرة" -> بحذفها من الجدول.\n\n' +
    '2. الواجبات والمهام:\n' +
    '• "عليا إيه النهارده؟" أو "عليا إيه بكرة؟" -> بعرضلك كل الواجبات القريبة.\n' +
    '• "عندي واجب كيمياء صفحة 30 تسليمه يوم الأربعاء" -> بسجله كواجب جديد.\n' +
    '• "خلصت واجب الإنجليزي" -> بعلم عليه فوراً كـ تم الإنجاز في لوحة التحكم!\n' +
    '• "أجل تسليم واجب الماث ليوم الخميس" -> بعدل ميعاد التسليم.\n\n' +
    '3. المرشد الذكي وقرار المذاكرة:\n' +
    '• "أذاكر إيه دلوقتي؟" (What should I study now?) -> بفحص امتحاناتك القريبة والواجبات ونقاط ضعفك وبديك قرار واحد واضح ومحدد تبدأ فيه حالاً.\n' +
    '• "ابدأ جلسة تركيز" -> بدء تايمر بومودورو.\n\n' +
    '4. حل وتلخيص الصور والـ PDF:\n' +
    '• ابعت أي صورة لمسألة أو ورقة امتحان -> هحل كل الأسئلة خطوة بخطوة وأعملك منها كروت استذكار!\n' +
    '• ابعت أي مذكرة أو ملخص PDF -> هلخصلك أهم القوانين والمفاهيم.\n\n' +
    '5. ذاكرة المذاكرة وبنك الأخطاء:\n' +
    '• "مش بعرف أحل مسائل المعايرة في الكيمياء" -> بسجلها فوراً كنقطة ضعف في ذاكرتك الدراسية.\n' +
    '• "امتحني في بنك أخطائي" -> هطلعلك كويز سريع من أخطائك السابقة للتأكد من فهمها.\n\n' +
    '6. الامتحانات والعد التنازلي:\n' +
    '• "امتحان فيزياء شامل يوم 25 سبتمبر" -> بضيفه في عداد الامتحانات.\n' +
    '• "إيه الامتحانات اللي قربت؟" -> بعرضلك قائمة الامتحانات القادمة.';

  if (!isLinked) {
    guide +=
      '\n\n🔗 لو معاك حساب على الموقع وعاوز تربط رقمك وجدولك:\n' +
      '1️⃣ افتح الإعدادات: https://taskerbot.vercel.app/dashboard/settings\n' +
      '2️⃣ اضغط "توليد رمز" (Generate Code)\n' +
      '3️⃣ ابعت الرمز المكون من 6 خانات هنا وهيتم ربط رقمك وجدولك فوراً!';
  } else {
    guide += '\n\n💡 حسابك مربوط وجاهز تماماً. تحب نبدأ بإيه أو نراجع إيه دلوقتي؟';
  }

  return guide;
}

