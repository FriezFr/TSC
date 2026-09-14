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
    isGroupContext?: boolean;
    isGroupDump?: boolean;
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

      // Hard Guardrail: NEVER modify student's weekly 7esas (timetable) from a group chat or group chat dump!
      if (
        (options.isGroupContext || options.isGroupDump) &&
        (type === 'lesson_change' || type === 'lesson_add' || type === 'lesson_cancel' || type === 'schedule_import')
      ) {
        console.log(`[Guardrail] Blocked ${type} from group context/dump to preserve student's personal weekly routine.`);
        continue;
      }

      // Hard Guardrail: In group chats or dumps, do not create personal assignments from random chatter
      if (
        (options.isGroupContext || options.isGroupDump) &&
        type === 'assignment_create' &&
        !action.isConfirmedByStudent
      ) {
        console.log(`[Guardrail] Skipped unconfirmed assignment_create from group context/dump.`);
        continue;
      }

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

/**
 * Detects whether incoming text represents a forwarded group chat dump or multi-person discussion.
 */
export function isGroupChatDump(text: string = ''): boolean {
  if (!text || text.length < 30) return false;
  const lines = text.split('\n');
  let timestampSenderCount = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^\[?\d{1,2}[:/.-]\d{1,2}[:/.-]?\d{0,4}.*?\]?\s*[-:]?\s*[^:\n]{1,30}:/i.test(trimmed) ||
      /^\[\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM|am|pm)?\]\s*[^:\n]{1,30}:/i.test(trimmed) ||
      /^\d{1,2}:\d{2}\s*[-–]\s*[^:\n]{1,30}:/i.test(trimmed)
    ) {
      timestampSenderCount++;
    }
  }

  const hasGroupKeywords = /\b(جروب|الجروب|group|chat dump|شات الدفعة|شات السنتر|شات المدرسة|شات المستر|رسائل الجروب)\b/i.test(text);

  return timestampSenderCount >= 2 || (hasGroupKeywords && lines.length >= 3);
}

/**
 * 1. Autonomous Daily Morning Briefing Generator
 * Gathers today's classes, imminent homework, upcoming exams, and 1 smart 45-min focus recommendation.
 * Output is clean plain text with NO asterisks (*, **).
 */
export async function generateDailyMorningBriefing(
  supabase: SupabaseClient | any,
  userId: string,
  isEnglish: boolean = false
): Promise<string> {
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  // 0: Sat, 1: Sun, 2: Mon, 3: Tue, 4: Wed, 5: Thu, 6: Fri
  const todayDayIdx = (todayDate.getDay() + 1) % 7;

  const dayNamesEn = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayNamesAr = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const dayName = isEnglish ? dayNamesEn[todayDayIdx] : dayNamesAr[todayDayIdx];

  try {
    const [profileRes, timetableRes, assignmentsRes, examsRes, memoryRes, mistakeRes] = await Promise.all([
      supabase.from('profiles').select('full_name, study_division').eq('id', userId).maybeSingle(),
      supabase
        .from('timetable')
        .select('*')
        .eq('user_id', userId)
        .eq('day_of_week', todayDayIdx)
        .order('start_time', { ascending: true }),
      supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(6),
      supabase
        .from('exams')
        .select('*')
        .eq('user_id', userId)
        .gte('exam_date', todayStr)
        .order('exam_date', { ascending: true })
        .limit(3),
      supabase
        .from('academic_memories')
        .select('*')
        .eq('user_id', userId)
        .eq('confidence_level', 'low')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('mistake_bank')
        .select('*')
        .eq('user_id', userId)
        .eq('is_mastered', false)
        .order('times_repeated', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const firstName = profileRes.data?.full_name ? profileRes.data.full_name.split(' ')[0] : (isEnglish ? 'Student' : 'إسماعيل');
    const classes = timetableRes.data || [];
    const pendingAssignments = assignmentsRes.data || [];
    const upcomingExams = examsRes.data || [];
    const weakMemory = memoryRes.data;
    const topMistake = mistakeRes.data;

    // 1. Classes Section
    let classesText = '';
    if (classes.length === 0) {
      classesText = isEnglish
        ? '• No classes scheduled today — perfect opportunity for self-study and revision.'
        : '• لا توجد حصص أو دروس مجدولة اليوم — فرصة ممتازة للمذاكرة الحرة والمراجعة.';
    } else {
      classesText = classes
        .map((c: any) => {
          const room = c.room_or_teacher ? ` (${c.room_or_teacher})` : '';
          return `• ${c.start_time} - ${c.end_time}: ${c.subject}${room}`;
        })
        .join('\n');
    }

    // 2. Imminent Assignments
    let assignmentsText = '';
    if (pendingAssignments.length === 0) {
      assignmentsText = isEnglish
        ? '• All registered assignments are completed. Great job!'
        : '• كل الواجبات المسجلة منجزة بالكامل، عاش يا بطل!';
    } else {
      assignmentsText = pendingAssignments
        .map((a: any) => {
          const dueTag = a.due_date === todayStr ? (isEnglish ? 'Due TODAY' : 'تسليمه اليوم') : `${isEnglish ? 'Due' : 'تسليم'}: ${a.due_date}`;
          const priorityTag = a.priority === 'high' ? (isEnglish ? ' [High Priority]' : ' [أولوية قصوى]') : '';
          return `• ${a.title} (${a.subject}) — ${dueTag}${priorityTag}`;
        })
        .join('\n');
    }

    // 3. Upcoming Exams
    let examsText = '';
    if (upcomingExams.length === 0) {
      examsText = isEnglish
        ? '• No upcoming exams currently scheduled on your dashboard.'
        : '• لا توجد امتحانات قادمة مسجلة في لوحة التحكم حالياً.';
    } else {
      examsText = upcomingExams
        .map((e: any) => {
          const diffDays = Math.ceil(
            (new Date(e.exam_date).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const daysText =
            diffDays === 0
              ? (isEnglish ? 'TODAY' : 'اليوم')
              : diffDays === 1
              ? (isEnglish ? 'Tomorrow' : 'غداً')
              : `${isEnglish ? 'In' : 'باقي'} ${diffDays} ${isEnglish ? 'days' : 'أيام'}`;
          return `• ${e.subject}: ${e.exam_date} (${daysText})${e.notes ? ` — ${e.notes}` : ''}`;
        })
        .join('\n');
    }

    // 4. Decisive 45-Min Focus Recommendation
    let recommendationText = '';
    if (upcomingExams.length > 0) {
      const nearestExam = upcomingExams[0];
      const diffDays = Math.ceil(
        (new Date(nearestExam.exam_date).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays <= 5) {
        recommendationText = isEnglish
          ? `Focus on ${nearestExam.subject} for 45 minutes today. Your exam is in ${diffDays} days, making proactive revision the top priority.`
          : `ركز على مادة ${nearestExam.subject} لمدة 45 دقيقة اليوم. امتحانك بعد ${diffDays} أيام، والمراجعة المبكرة هتضمنلك تثبيت المنهج تماماً.`;
      }
    }

    if (!recommendationText && pendingAssignments.length > 0) {
      const topTask = pendingAssignments[0];
      recommendationText = isEnglish
        ? `Complete "${topTask.title}" (${topTask.subject}) for 45 minutes to clear your deadlines early.`
        : `أنجز "${topTask.title}" (${topTask.subject}) في جلسة تركيز 45 دقيقة عشان تصفي واجباتك أول بأول.`;
    }

    if (!recommendationText && weakMemory) {
      recommendationText = isEnglish
        ? `Review "${weakMemory.topic}" in ${weakMemory.subject} for 45 minutes — this was previously logged in your AI Study Memory.`
        : `راجع نقطة "${weakMemory.topic}" في ${weakMemory.subject} لمدة 45 دقيقة — النقطة دي متسجلة في ذاكرتك الدراسية وبتحتاج تثبيت.`;
    }

    if (!recommendationText && topMistake) {
      recommendationText = isEnglish
        ? `Tackle your Mistake Bank in ${topMistake.subject} for 45 minutes to master previous error patterns.`
        : `راجع بنك أخطائك في ${topMistake.subject} لمدة 45 دقيقة لحل المسائل اللي وقفت معاك قبل كده.`;
    }

    if (!recommendationText) {
      recommendationText = isEnglish
        ? 'Start a 45-minute deep focus session reviewing your hardest subject this term.'
        : 'ابدأ جلسة تركيز 45 دقيقة تراجع فيها أثقل مادة عندك في الترم عشان تسبق بخطوة.';
    }

    if (isEnglish) {
      return (
        `☀️ Good morning, ${firstName}! Here is your Daily Morning Briefing for ${dayName} (${todayStr}):\n\n` +
        `📅 TODAY'S CLASSES & SCHEDULE:\n${classesText}\n\n` +
        `📝 ASSIGNMENTS DUE SOON:\n${assignmentsText}\n\n` +
        `🎯 UPCOMING EXAMS:\n${examsText}\n\n` +
        `🧠 RECOMMENDED 45-MIN FOCUS ACTION:\n• ${recommendationText}\n\n` +
        `💡 Send "start focus session" or tap [ 🧠 What to Study? ] anytime to begin!`
      );
    }

    return (
      `☀️ صباح الخير يا ${firstName}! إليك تقرير بداية اليوم وتفاصيل جدولك ليوم ${dayName} (${todayStr}):\n\n` +
      `📅 جدول وحصص اليوم:\n${classesText}\n\n` +
      `📝 الواجبات المطلوب تسليمها قريباً:\n${assignmentsText}\n\n` +
      `🎯 الامتحانات القادمة والعد التنازلي:\n${examsText}\n\n` +
      `🧠 قرار المذاكرة المقترح لليوم (جلسة 45 دقيقة):\n• ${recommendationText}\n\n` +
      `💡 اكتبلي "ابدأ جلسة تركيز" أو اضغط على [ 🧠 أذاكر إيه؟ ] لما تحب تبدأ، ويومك موفق ومنجز!`
    );
  } catch (err) {
    console.error('Error generating daily morning briefing:', err);
    return isEnglish
      ? '☀️ Good morning! Check your dashboard for today\'s classes and pending assignments: https://taskerbot.vercel.app/dashboard'
      : '☀️ صباح الخير! تقدر تتابع حصصك وواجباتك لليوم مباشرة عبر لوحة التحكم: https://taskerbot.vercel.app/dashboard';
  }
}

/**
 * 2. AI Exam Readiness Score Engine
 * Computes realistic readiness % per subject by synthesizing:
 * - Exam proximity
 * - Unmastered mistake bank items
 * - Academic memory confidence levels
 * - Past quiz & assignment grades
 * Output is clean plain text with NO asterisks (*, **).
 */
export async function computeExamReadiness(
  supabase: SupabaseClient | any,
  userId: string,
  isEnglish: boolean = false
): Promise<string> {
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const [examsRes, mistakesRes, memoriesRes, gradesRes, timetableRes] = await Promise.all([
      supabase.from('exams').select('*').eq('user_id', userId).order('exam_date', { ascending: true }),
      supabase.from('mistake_bank').select('*').eq('user_id', userId),
      supabase.from('academic_memories').select('*').eq('user_id', userId),
      supabase.from('grades').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('timetable').select('subject').eq('user_id', userId),
    ]);

    const exams = examsRes.data || [];
    const mistakes = mistakesRes.data || [];
    const memories = memoriesRes.data || [];
    const grades = gradesRes.data || [];
    const timetable = timetableRes.data || [];

    // Gather unique subjects from exams, timetable, and grades
    const subjectsSet = new Set<string>();
    for (const e of exams) if (e.subject) subjectsSet.add(e.subject.trim());
    for (const t of timetable) if (t.subject) subjectsSet.add(t.subject.trim());
    for (const g of grades) if (g.subject) subjectsSet.add(g.subject.trim());

    if (subjectsSet.size === 0) {
      subjectsSet.add('Mathematics');
      subjectsSet.add('Physics');
      subjectsSet.add('Chemistry');
    }

    const readinessList: {
      subject: string;
      score: number;
      statusText: string;
      daysLeft?: number;
      examDate?: string;
      unmasteredCount: number;
      weakTopicsCount: number;
      recommendation: string;
    }[] = [];

    for (const subject of Array.from(subjectsSet)) {
      const subjectExams = exams.filter((e: any) => normalizeSubject(e.subject) === normalizeSubject(subject));
      const subjectMistakes = mistakes.filter((m: any) => normalizeSubject(m.subject) === normalizeSubject(subject));
      const subjectMemories = memories.filter((mem: any) => normalizeSubject(mem.subject) === normalizeSubject(subject));
      const subjectGrades = grades.filter((g: any) => normalizeSubject(g.subject) === normalizeSubject(subject));

      let baseScore = 75;

      // Grade factor
      if (subjectGrades.length > 0) {
        let totalPct = 0;
        let count = 0;
        for (const g of subjectGrades) {
          if (g.max_score && g.max_score > 0) {
            totalPct += (g.score / g.max_score) * 100;
            count++;
          }
        }
        if (count > 0) {
          const avgPct = totalPct / count;
          baseScore = Math.round(baseScore * 0.5 + avgPct * 0.5);
        }
      }

      // Mistake bank impact
      const unmastered = subjectMistakes.filter((m: any) => !m.is_mastered);
      const mastered = subjectMistakes.filter((m: any) => m.is_mastered);
      baseScore -= Math.min(24, unmastered.length * 6);
      baseScore += Math.min(9, mastered.length * 3);

      // Academic memory impact
      const lowConfidence = subjectMemories.filter((mem: any) => mem.confidence_level === 'low');
      const highConfidence = subjectMemories.filter((mem: any) => mem.confidence_level === 'high');
      baseScore -= Math.min(20, lowConfidence.length * 7);
      baseScore += Math.min(10, highConfidence.length * 5);

      // Clamp between 38% and 97%
      const finalScore = Math.max(38, Math.min(97, baseScore));

      // Nearest exam days
      let daysLeft: number | undefined = undefined;
      let examDate: string | undefined = undefined;
      if (subjectExams.length > 0) {
        const nextExam = subjectExams.find((e: any) => e.exam_date >= todayStr) || subjectExams[0];
        examDate = nextExam.exam_date;
        daysLeft = Math.ceil((new Date(nextExam.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      }

      // Status indicator
      let statusText = '';
      if (finalScore >= 80) {
        statusText = isEnglish ? '🟢 High Readiness' : '🟢 جاهز ومستعد بقوة';
      } else if (finalScore >= 65) {
        statusText = isEnglish ? '🟡 Moderate (Needs Polish)' : '🟡 متوسط (محتاج تثبيت ومراجعة)';
      } else {
        statusText = isEnglish ? '🔴 Needs Urgent Focus' : '🔴 محتاج تركيز عاجل';
      }

      // Actionable advice
      let recommendation = '';
      if (unmastered.length > 0) {
        recommendation = isEnglish
          ? `Resolve ${unmastered.length} unmastered items in Mistake Bank.`
          : `حل وتصفير ${unmastered.length} أسئلة في بنك الأخطاء.`;
      } else if (lowConfidence.length > 0) {
        recommendation = isEnglish
          ? `Deep revision for weak topic: "${lowConfidence[0].topic}".`
          : `مراجعة مكثفة لنقطة الضعف: "${lowConfidence[0].topic}".`;
      } else {
        recommendation = isEnglish
          ? 'Maintain consistency with periodic timed mock quizzes.'
          : 'الحفاظ على المستوى بكويزات سريعة وتدريب بوقت محدد.';
      }

      readinessList.push({
        subject,
        score: finalScore,
        statusText,
        daysLeft,
        examDate,
        unmasteredCount: unmastered.length,
        weakTopicsCount: lowConfidence.length,
        recommendation,
      });
    }

    // Sort: lowest score (most critical) first
    readinessList.sort((a, b) => a.score - b.score);

    const averageReadiness = Math.round(
      readinessList.reduce((acc, curr) => acc + curr.score, 0) / readinessList.length
    );

    const reportLines = readinessList.map((item) => {
      const examTag =
        item.daysLeft !== undefined
          ? ` (${isEnglish ? 'Exam in' : 'الامتحان بعد'} ${item.daysLeft} ${isEnglish ? 'days' : 'أيام'} - ${item.examDate})`
          : '';
      return (
        `• ${item.subject}: ${item.score}% — ${item.statusText}${examTag}\n` +
        `  💡 ${item.recommendation}`
      );
    });

    if (isEnglish) {
      return (
        `🎯 AI EXAM READINESS SCORE ENGINE\n` +
        `Overall Academic Readiness: ${averageReadiness}%\n\n` +
        `SUBJECT-BY-SUBJECT READINESS BREAKDOWN:\n` +
        `${reportLines.join('\n\n')}\n\n` +
        `💡 Next Step: Tell me "Quiz me on my mistakes in ${readinessList[0]?.subject || 'Physics'}" or start a 45-min focus session to immediately boost your readiness!`
      );
    }

    return (
      `🎯 مقياس الاستعداد الذكي للامتحانات (Exam Readiness Engine):\n` +
      `متوسط جاهزيتك الأكاديمية العامة: ${averageReadiness}%\n\n` +
      `تفاصيل مستوى الاستعداد لكل مادة:\n` +
      `${reportLines.join('\n\n')}\n\n` +
      `💡 الخطوة التالية المقترحة: قولي "امتحني في بنك أخطاء ${readinessList[0]?.subject || 'الفيزياء'}" أو ابدأ جلسة تركيز لرفع درجتك فوراً!`
    );
  } catch (err) {
    console.error('Error computing exam readiness:', err);
    return isEnglish
      ? '⚠️ Could not compute exam readiness at this moment. Please verify your dashboard data.'
      : '⚠️ تعذر حساب درجة الاستعداد للامتحانات حالياً. تأكد من تسجيل موادك في لوحة التحكم.';
  }
}

/**
 * 3. 1-Click Weekly Study & Parent Progress Report Generator
 * Aggregates:
 * - Study sessions & Pomodoro focus hours
 * - Assignments completed vs pending
 * - Mistake Bank mastery count
 * - Recent quiz/exam grades
 * - Professional, calm tone suitable for student and parents.
 * Output is clean plain text with NO asterisks (*, **).
 */
export async function generateWeeklyProgressReport(
  supabase: SupabaseClient | any,
  userId: string,
  isEnglish: boolean = false
): Promise<string> {
  const now = new Date();
  const sevenDaysAgoDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  try {
    const [profileRes, sessionsRes, assignmentsRes, mistakesRes, gradesRes, examsRes] = await Promise.all([
      supabase.from('profiles').select('full_name, study_division, target_percentage').eq('id', userId).maybeSingle(),
      supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('completed_at', sevenDaysAgoDate),
      supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('mistake_bank')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('grades')
        .select('*')
        .eq('user_id', userId)
        .gte('date', sevenDaysAgoDate),
      supabase
        .from('exams')
        .select('*')
        .eq('user_id', userId)
        .gte('exam_date', todayStr)
        .order('exam_date', { ascending: true })
        .limit(3),
    ]);

    const studentName = profileRes.data?.full_name || (isEnglish ? 'Ismail' : 'إسماعيل');
    const division = profileRes.data?.study_division || (isEnglish ? 'Engineering & Computer Science Track' : 'مسار الهندسة والحاسبات');

    // 1. Focus Sessions
    const sessions = sessionsRes.data || [];
    let totalMinutes = 0;
    const subjectMinutes: Record<string, number> = {};
    for (const s of sessions) {
      const mins = Number(s.duration_minutes) || 0;
      totalMinutes += mins;
      const sub = s.subject || 'General';
      subjectMinutes[sub] = (subjectMinutes[sub] || 0) + mins;
    }
    const focusHours = (totalMinutes / 60).toFixed(1);

    let focusBreakdown = '';
    if (sessions.length > 0) {
      focusBreakdown = Object.entries(subjectMinutes)
        .map(([sub, mins]) => `  • ${sub}: ${(mins / 60).toFixed(1)} ${isEnglish ? 'hrs' : 'ساعة'}`)
        .join('\n');
    } else {
      focusBreakdown = isEnglish
        ? '  • No recorded Pomodoro focus sessions this week.'
        : '  • لا توجد جلسات تركيز بومودورو مسجلة هذا الأسبوع.';
    }

    // 2. Assignments
    const allAssignments = assignmentsRes.data || [];
    const completedAssignments = allAssignments.filter((a: any) => a.is_completed);
    const pendingAssignments = allAssignments.filter((a: any) => !a.is_completed);

    // 3. Mistake Bank
    const allMistakes = mistakesRes.data || [];
    const masteredMistakes = allMistakes.filter((m: any) => m.is_mastered);
    const activeMistakes = allMistakes.filter((m: any) => !m.is_mastered);

    // 4. Grades
    const recentGrades = gradesRes.data || [];
    let gradesText = '';
    if (recentGrades.length > 0) {
      gradesText = recentGrades
        .map((g: any) => `  • ${g.subject} (${g.title}): ${g.score}/${g.max_score}`)
        .join('\n');
    } else {
      gradesText = isEnglish
        ? '  • No new test grades recorded this week.'
        : '  • لم يتم تسجيل درجات اختبارات جديدة هذا الأسبوع.';
    }

    // 5. Next Horizon
    const upcomingExams = examsRes.data || [];
    let horizonText = '';
    if (upcomingExams.length > 0) {
      horizonText = upcomingExams
        .map((e: any) => `  • ${e.subject} (${e.exam_date})`)
        .join('\n');
    } else {
      horizonText = isEnglish
        ? '  • Regular curriculum routine without upcoming official exam deadlines.'
        : '  • استكمال المنهج المدرسي بانتظام بدون ضغط امتحانات رسمية قريبة.';
    }

    if (isEnglish) {
      return (
        `📋 WEEKLY ACADEMIC PROGRESS REPORT\n` +
        `Student: ${studentName}\n` +
        `Track: ${division}\n` +
        `Period: Past 7 Days (${sevenDaysAgoDate} to ${todayStr})\n\n` +
        `⏱️ DEEP STUDY FOCUS:\n` +
        `• Total Focus Time: ${focusHours} hours across ${sessions.length} study sessions\n` +
        `${focusBreakdown}\n\n` +
        `📝 ASSIGNMENTS & HOMEWORK:\n` +
        `• Completed: ${completedAssignments.length} assignments\n` +
        `• Currently Pending: ${pendingAssignments.length} assignments\n\n` +
        `🧠 MISTAKE BANK & MASTERY:\n` +
        `• Mastered & Resolved: ${masteredMistakes.length} previous misconceptions\n` +
        `• Active Practice Bank: ${activeMistakes.length} questions remaining for review\n\n` +
        `📊 RECENT ASSESSMENTS & QUIZZES:\n` +
        `${gradesText}\n\n` +
        `🎯 NEXT WEEK'S HORIZON:\n` +
        `${horizonText}\n\n` +
        `💡 EVALUATION & SUMMARY:\n` +
        `Solid consistency maintained this week. Keep logging daily focus sessions and clear pending homework on schedule.`
      );
    }

    return (
      `📋 التقرير الدراسي الأسبوعي الشامل (للطالب وولي الأمر):\n` +
      `الطالب: ${studentName}\n` +
      `المسار: ${division}\n` +
      `الفترة: آخر 7 أيام (من ${sevenDaysAgoDate} إلى ${todayStr})\n\n` +
      `⏱️ ساعات المذاكرة وجلسات التركيز (Pomodoro):\n` +
      `• إجمالي ساعات التركيز الصافي: ${focusHours} ساعة خلال ${sessions.length} جلسة مذاكرة\n` +
      `${focusBreakdown}\n\n` +
      `📝 الواجبات والمهام الدراسية:\n` +
      `• تم إنجازه وتسليمه: ${completedAssignments.length} واجب\n` +
      `• الواجبات القادمة الجاري العمل عليها: ${pendingAssignments.length} واجب\n\n` +
      `🧠 بنك الأخطاء وإتقان المفاهيم الصعبة:\n` +
      `• أخطاء تم حلها وإتقانها 100%: ${masteredMistakes.length} سؤال\n` +
      `• أسئلة جاري التدريب عليها وتثبيتها: ${activeMistakes.length} سؤال\n\n` +
      `📊 درجات الاختبارات والكويزات المسجلة:\n` +
      `${gradesText}\n\n` +
      `🎯 المحطة القادمة والأولويات:\n` +
      `${horizonText}\n\n` +
      `💡 الخلاصة والتقييم:\n` +
      `أداء منظم والتزام طيب بالجدول. الاستمرار بنفس وتيرة جلسات التركيز ومتابعة الواجبات أولاً بأول يضمن التفوق والجاهزية التامة لأي امتحان.`
    );
  } catch (err) {
    console.error('Error generating weekly progress report:', err);
    return isEnglish
      ? '⚠️ Could not generate weekly report. Please ensure your dashboard data is synced.'
      : '⚠️ تعذر توليد التقرير الأسبوعي حالياً. تأكد من تسجيل بياناتك في لوحة التحكم.';
  }
}

/**
 * 4. Dashboard Quick Menu
 * Generated when the student types /dashboard, /dashbored, dashboard, commands, etc.
 * Accompanied by the 3 interactive quick-action buttons.
 */
export function generateDashboardQuickMenu(options: {
  userName?: string;
  isEnglish?: boolean;
}): string {
  const { userName, isEnglish } = options;
  const firstName = userName ? userName.split(' ')[0] : (isEnglish ? 'Student' : 'إسماعيل');

  if (isEnglish) {
    return (
      `📊 SMART SCHOOL DASHBOARD — TSC\n` +
      `Welcome, ${firstName}! Here is your central study command center:\n\n` +
      `• 🧠 Smart Study Decision: Determines exactly what to focus on right now for 45 minutes.\n` +
      `• 📅 Today's Schedule: View today's school classes, tutors, and exact times.\n` +
      `• 🎯 Exam Readiness: Live percentage readiness score for each of your subjects.\n` +
      `• 📝 Homework & Tasks: View pending assignments and upcoming deadlines.\n` +
      `• ☀️ Morning Briefing: Get your full daily agenda and priorities.\n\n` +
      `Tap any of the quick-action buttons below or send your request directly:`
    );
  }

  return (
    `📊 لوحة التحكم الذكية — TSC Dashboard\n` +
    `أهلاً يا ${firstName}! إليك مركز التحكم السريع لتنظيم ومتابعة دراستك:\n\n` +
    `• 🧠 قرار المذاكرة: فحص الامتحانات والواجبات ونقاط ضعفك لتحديد ما تذاكره الآن (45 دقيقة).\n` +
    `• 📅 جدول اليوم: استعراض حصصك المدرسية ودروسك ومواعيدها لليوم بالتفصيل.\n` +
    `• 🎯 جاهز للامتحان؟: قياس مستوى جاهزيتك لكل مادة بالأرقام مع فحص بنك الأخطاء.\n` +
    `• 📝 الواجبات والمهام: متابعة ما عليك تسليمه ومواعيد الديدلاين القادمة.\n` +
    `• ☀️ تقرير الصباح: ملخص بداية اليوم الشامل لجدولك وأولوياتك.\n\n` +
    `اضغط على أي من الأزرار السريعة بالأسفل أو اكتب طلبك مباشرة:`
  );
}

/**
 * 5. Today's Schedule Brief
 * Summarizes today's classes and homework due today.
 */
export async function generateTodayScheduleBrief(
  supabase: SupabaseClient | any,
  userId: string,
  isEnglish: boolean = false
): Promise<string> {
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  const todayDayIdx = (todayDate.getDay() + 1) % 7;

  const dayNamesEn = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayNamesAr = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const dayName = isEnglish ? dayNamesEn[todayDayIdx] : dayNamesAr[todayDayIdx];

  try {
    const [timetableRes, tasksRes] = await Promise.all([
      supabase
        .from('timetable')
        .select('*')
        .eq('user_id', userId)
        .eq('day_of_week', todayDayIdx)
        .order('start_time', { ascending: true }),
      supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .eq('due_date', todayStr)
        .limit(5),
    ]);

    const classes = timetableRes.data || [];
    const dueTodayTasks = tasksRes.data || [];

    let classesText = '';
    if (classes.length === 0) {
      classesText = isEnglish
        ? '• No classes scheduled for today. You have an open day for self-study and revision!'
        : '• لا توجد حصص أو دروس مجدولة اليوم. يومك مفتوح للمذاكرة الحرة والمراجعة!';
    } else {
      classesText = classes
        .map((c: any) => {
          const room = c.room_or_teacher ? ` (${c.room_or_teacher})` : '';
          return `• ${c.start_time} - ${c.end_time}: ${c.subject}${room}`;
        })
        .join('\n');
    }

    let tasksText = '';
    if (dueTodayTasks.length > 0) {
      tasksText = `\n\n📝 ${isEnglish ? 'DUE TODAY:' : 'واجبات مطلوب تسليمها اليوم:'}\n` +
        dueTodayTasks.map((t: any) => `• ${t.title} (${t.subject})`).join('\n');
    }

    if (isEnglish) {
      return (
        `📅 TODAY'S SCHEDULE — ${dayName.toUpperCase()} (${todayStr})\n\n` +
        `CLASSES & TUTORS:\n${classesText}${tasksText}\n\n` +
        `💡 What would you like to work on right now? Tap an option below:`
      );
    }

    return (
      `📅 جدول وحصص اليوم — يوم ${dayName} (${todayStr})\n\n` +
      `الحصص والدروس المجدولة:\n${classesText}${tasksText}\n\n` +
      `💡 تحب نبدأ بإيه دلوقتي؟ اختر من الأزرار بالأسفل:`
    );
  } catch (err) {
    console.error('Error generating today schedule brief:', err);
    return isEnglish ? '⚠️ Could not load today schedule.' : '⚠️ تعذر تحميل جدول اليوم حالياً.';
  }
}

/**
 * 6. "What Should I Study Right Now?" Smart Advisor
 * Synthesizes exams, deadlines, and weak topics into ONE clear 45-minute decision.
 */
export async function generateWhatToStudyBrief(
  supabase: SupabaseClient | any,
  userId: string,
  isEnglish: boolean = false
): Promise<string> {
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];

  try {
    const [examsRes, assignmentsRes, memoriesRes, mistakesRes] = await Promise.all([
      supabase
        .from('exams')
        .select('*')
        .eq('user_id', userId)
        .gte('exam_date', todayStr)
        .order('exam_date', { ascending: true })
        .limit(2),
      supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(3),
      supabase
        .from('academic_memories')
        .select('*')
        .eq('user_id', userId)
        .eq('confidence_level', 'low')
        .limit(1)
        .maybeSingle(),
      supabase
        .from('mistake_bank')
        .select('*')
        .eq('user_id', userId)
        .eq('is_mastered', false)
        .order('times_repeated', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const upcomingExams = examsRes.data || [];
    const pendingTasks = assignmentsRes.data || [];
    const weakMemory = memoriesRes.data;
    const topMistake = mistakesRes.data;

    let targetSubject = 'Mathematics';
    let targetAction = '';
    let reason = '';

    if (upcomingExams.length > 0) {
      const nearest = upcomingExams[0];
      const diffDays = Math.ceil(
        (new Date(nearest.exam_date).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays <= 6) {
        targetSubject = nearest.subject;
        targetAction = isEnglish
          ? `Comprehensive chapter revision in ${targetSubject}`
          : `مراجعة شاملة لدروس ${targetSubject}`;
        reason = isEnglish
          ? `Your official exam is scheduled in ${diffDays} days (${nearest.exam_date}). Early mastery guarantees confidence.`
          : `امتحانك الرسمي بعد ${diffDays} أيام (${nearest.exam_date}). المراجعة الآن تضمن تثبيت المنهج تماماً.`;
      }
    }

    if (!targetAction && pendingTasks.length > 0) {
      const topTask = pendingTasks[0];
      targetSubject = topTask.subject;
      targetAction = isEnglish
        ? `Finish assignment: "${topTask.title}"`
        : `إنجاز واجب: "${topTask.title}"`;
      reason = isEnglish
        ? `This homework deadline is approaching (${topTask.due_date || 'soon'}). Clearing it early keeps your dashboard clean.`
        : `موعد تسليم الواجب اقترب (${topTask.due_date || 'قريباً'}). إنجازه الآن يصفي مهامك أولاً بأول.`;
    }

    if (!targetAction && weakMemory) {
      targetSubject = weakMemory.subject;
      targetAction = isEnglish
        ? `Deep dive on weak topic: "${weakMemory.topic}"`
        : `التركيز على نقطة الضعف: "${weakMemory.topic}"`;
      reason = isEnglish
        ? `This topic was recorded in your AI Study Memory with low confidence. Mastering it eliminates a major exam pitfall.`
        : `هذه النقطة مسجلة في ذاكرتك الدراسية بمستوى منخفض. حل تمارين عليها الآن يزيل أي تردد في الامتحان.`;
    }

    if (!targetAction && topMistake) {
      targetSubject = topMistake.subject;
      targetAction = isEnglish
        ? `Resolve Mistake Bank questions in ${targetSubject}`
        : `حل وتصفير أسئلة بنك الأخطاء في ${targetSubject}`;
      reason = isEnglish
        ? `You have unmastered questions in this subject that were previously missed.`
        : `لديك أسئلة سابقة مسجلة في بنك الأخطاء تحتاج تثبيت الإجابة النموذجية.`;
    }

    if (!targetAction) {
      targetSubject = 'Physics';
      targetAction = isEnglish
        ? '45-minute focused revision on core engineering concepts'
        : 'جلسة تركيز 45 دقيقة لمراجعة أثقل القوانين والمفاهيم';
      reason = isEnglish
        ? 'All immediate homework is cleared! Perfect window to strengthen your core subjects.'
        : 'كل واجباتك الحالية منجزة! هذا أفضل وقت لتقوية المفاهيم ومسبقة المنهج بخطوة.';
    }

    if (isEnglish) {
      return (
        `🧠 SMART STUDY DECISION (45-Minute Focus Block)\n\n` +
        `• Subject: ${targetSubject}\n` +
        `• Recommended Task: ${targetAction}\n` +
        `• Duration: 45 Minutes (Single Pomodoro Deep Work)\n` +
        `• Logical Reason: ${reason}\n\n` +
        `💡 Send "start focus session" when ready, or navigate using the buttons below:`
      );
    }

    return (
      `🧠 قرار المذاكرة الذكي (جلسة تركيز 45 دقيقة)\n\n` +
      `• المادة: ${targetSubject}\n` +
      `• المهمة المقترحة: ${targetAction}\n` +
      `• المدة: 45 دقيقة (جلسة بومودورو تركيز صافي)\n` +
      `• السبب المنطقي: ${reason}\n\n` +
      `💡 اكتبلي "ابدأ جلسة تركيز" لما تبدأ، أو اختر الإجراء التالي من الأزرار بالأسفل:`
    );
  } catch (err) {
    console.error('Error generating what to study brief:', err);
    return isEnglish ? '⚠️ Could not generate study decision.' : '⚠️ تعذر تحديد قرار المذاكرة حالياً.';
  }
}

/**
 * 7. Pending Tasks & Assignments Brief
 */
export async function generatePendingTasksBrief(
  supabase: SupabaseClient | any,
  userId: string,
  isEnglish: boolean = false
): Promise<string> {
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .order('due_date', { ascending: true })
      .limit(10);

    if (error || !assignments || assignments.length === 0) {
      return isEnglish
        ? '📝 PENDING HOMEWORK & TASKS\n\n🎉 All registered assignments are completed! Great work.\n\nTap an option below to plan your next study block:'
        : '📝 الواجبات والمهام القادمة\n\n🎉 كل الواجبات والمهام المسجلة في لوحة التحكم منجزة بالكامل! عاش يا بطل.\n\nاختر من الأزرار بالأسفل لتنظيم خطوتك القادمة:';
    }

    const taskLines = assignments.map((a: any) => {
      const isToday = a.due_date === todayStr;
      const dueTag = isToday
        ? (isEnglish ? 'Due TODAY' : 'تسليمه اليوم')
        : (a.due_date ? `${isEnglish ? 'Due' : 'تسليم'}: ${a.due_date}` : (isEnglish ? 'No date' : 'بدون ميعاد'));
      const priorityTag = a.priority === 'high' ? (isEnglish ? ' [High Priority]' : ' [أولوية قصوى]') : '';
      return `• ${a.title} (${a.subject}) — ${dueTag}${priorityTag}`;
    });

    if (isEnglish) {
      return (
        `📝 PENDING HOMEWORK & ASSIGNMENTS (${assignments.length} Tasks)\n\n` +
        `${taskLines.join('\n')}\n\n` +
        `💡 Tell me "I finished [subject] homework" when you are done to mark it complete, or tap an option below:`
      );
    }

    return (
      `📝 الواجبات والمهام الدراسية المطلوب تسليمها (${assignments.length} واجب):\n\n` +
      `${taskLines.join('\n')}\n\n` +
      `💡 تقدر تقولي "خلصت واجب [اسم المادة]" عشان أعلّم عليه كـ منجز، أو اختر من الأزرار بالأسفل:`
    );
  } catch (err) {
    console.error('Error generating pending tasks brief:', err);
    return isEnglish ? '⚠️ Could not load pending tasks.' : '⚠️ تعذر تحميل الواجبات حالياً.';
  }
}




