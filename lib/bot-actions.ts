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
  | 'habit_log';

export interface BotAction {
  type: BotActionType;
  title?: string;
  subject?: string;
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
 * (Timetable, Assignments, Exams, Flashcard Decks, Notes) to pass as rich context to Gemini.
 */
export async function buildFullStudentContext(supabase: SupabaseClient | any, userId: string): Promise<string> {
  try {
    const [timetableRes, assignmentsRes, examsRes, decksRes, notesRes] = await Promise.all([
      supabase.from('timetable').select('*').eq('user_id', userId).order('day_of_week', { ascending: true }),
      supabase.from('assignments').select('*').eq('user_id', userId).eq('is_completed', false).order('due_date', { ascending: true }).limit(15),
      supabase.from('exams').select('*').eq('user_id', userId).order('exam_date', { ascending: true }).limit(10),
      supabase.from('flashcard_decks').select('id, subject, title, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('notes').select('content, tags').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
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

=== EXISTING FLASHCARD & QUIZ DECKS ===
${deckLines.length > 0 ? deckLines.join('\n') : 'No flashcard decks yet.'}

=== RECENT NOTES ===
${noteLines.length > 0 ? noteLines.join('\n') : 'No recent notes.'}`;
  } catch (err) {
    console.error('Error building student context:', err);
    return '';
  }
}
