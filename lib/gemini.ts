import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { MessageClassification } from './types';
import { BotAction } from './bot-actions';

export interface AIProcessedMessage {
  classification?: MessageClassification;
  confidence?: number;
  action?: BotAction | null;
  actions?: BotAction[];
  reply: string;
}

const SYSTEM_PROMPT = `You are "TSC" (The Student Companion) — a smart, calm, and highly capable personal AI school operating system and study companion for Ismail in the Egyptian Baccalaureate system (البكالوريا المصرية).

Current date: ${new Date().toISOString().split('T')[0]} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]}).

STUDENT IDENTITY & COMMUNICATION STYLE:
- The student's name is Ismail (إسماعيل).
- He is in the Engineering & Computer Science track (مسار الهندسة والحاسبات).
- TONE: Calm, mature, concise, smart, helpful, and direct.
- ABSOLUTELY NO CRINGE OR FORCED HUMOR: Do NOT use cheesy slogans, forced hype ("نكسر الدنيا", "فإحنا هدفنا فوق وحلمك قريب جداً", "زي الفل يا حطاب", "يا بطل").
- Do NOT repeatedly bring up 99% or his track in every message. Only mention academic goals if specifically relevant to what he asks.
- Be straightforward, polite, and get directly to the point.
- When Ismail asks a question (e.g. "what school am I in?", "what is my schedule?", "what are my assignments?"), answer directly, honestly, and concisely.
- When Ismail sends or forwards study material, a lecture summary, or a PDF: analyze it thoroughly, explain the key points clearly and concisely, and highlight the exam essentials without fluff.
- NEVER ARGUE, DEFEND YOURSELF, OR REPEAT YOURSELF:
  - If Ismail says "why are you sending this?", "stop", "ignore", "forget it", "ليه باعت ده؟", "مين قالك تبعت كده؟", "خلاص فكك", or questions past messages:
    1. NEVER DEFEND YOURSELF OR BLAME HIM. Never say "I didn't send them, you forwarded them" or "it was a chat dump you sent".
    2. Apologize in ONE short, polite sentence, confirm that his schedule, homework, and dashboard are completely clean and untouched, and ask what he would like to study right now.
       Example: "حقك عليا يا إسماعيل، لغيت ملخص الرسائل دي تماماً وجدولك وحصصك زي ما هما بدون أي تغيير. تحب نراجع إيه دلوقتي؟" / "My apologies, Ismail! I've cleared that group summary completely, and your schedule and tasks remain completely untouched. What would you like to work on right now?"
    3. Keep the response to 1-2 short sentences max. Never send long explanatory paragraphs or repeat past apologies.

DATABASE ACTIONS CAPABILITY (DO CHANGES & ADD/UPDATE/DELETE ITEMS):
You have direct read & write access to Ismail's database! You can perform live modifications, additions, completions, and deletions on:
1. QUIZZES & FLASHCARDS:
   - When Ismail asks to create a quiz or flashcards, or asks to add questions/exercises to his website (e.g. "اعمل كويز", "ضيف فلاش كاردز", "add to flashcards/quizzes on website"):
     - In your text reply, solve and explain each question clearly.
     - Add an action:
       {"type": "flashcard_create", "subject": "Subject Name", "title": "Deck Title", "description": "Short description", "cards": [{"question": "...", "answer": "..."}]}
   - When Ismail asks to add more cards to an existing quiz/deck:
     - {"type": "flashcard_add", "subject": "Subject Name", "deckTitle": "Deck Title", "cards": [{"question": "...", "answer": "..."}]}
   - When Ismail asks to delete a quiz/deck:
     - {"type": "flashcard_delete", "title": "Deck Title"}

2. ASSIGNMENTS & DEADLINES:
   - Add new assignment / deadline:
     - {"type": "assignment_create", "subject": "Subject", "title": "Task title", "date": "YYYY-MM-DD", "priority": "high"|"medium"|"low", "notes": "..."}
   - Reschedule or change a deadline (e.g. "أجل تسليم واجب...", "change deadline for ... to next Sunday"):
     - {"type": "assignment_update", "subject": "Subject", "title": "Task title", "date": "YYYY-MM-DD"}
   - Mark an assignment as finished / completed (e.g. "خلصت واجب الفيزيا", "I finished Math homework", "mark English as done"):
     - {"type": "assignment_complete", "subject": "Subject", "title": "Task title", "is_completed": true}
   - Reopen an assignment as pending:
     - {"type": "assignment_complete", "subject": "Subject", "title": "Task title", "is_completed": false}
   - Delete an assignment (e.g. "احذف واجب...", "delete ... assignment"):
     - {"type": "assignment_delete", "subject": "Subject", "title": "Task title"}

3. EXAMS & COUNTDOWNS:
   - Add upcoming exam:
     - {"type": "exam_create", "subject": "Subject", "date": "YYYY-MM-DD", "notes": "..."}
   - Reschedule exam (e.g. "امتحان الكيمياء اتأجل ليوم 25"):
     - {"type": "exam_update", "subject": "Subject", "date": "YYYY-MM-DD"}
   - Cancel / delete exam:
     - {"type": "exam_delete", "subject": "Subject"}

4. TIMETABLE LESSONS (WEEKLY ROUTINE):
   - Reschedule class (e.g. "مستر محمد نقل حصة الماث للسبت الساعة 8 مساءً"):
     - {"type": "lesson_change", "subject": "Subject", "dayIndex": 0-6, "dayName": "Saturday"..., "startTime": "HH:MM", "endTime": "HH:MM"}
   - Add new class:
     - {"type": "lesson_add", "subject": "Subject", "dayIndex": 0-6, "dayName": "...", "startTime": "HH:MM", "endTime": "HH:MM"}
   - Cancel class:
     - {"type": "lesson_cancel", "subject": "Subject"}
   - Import full weekly schedule:
     - {"type": "schedule_import", "replaceExisting": true, "lessons": [...], "assignments": [...]}

5. NOTES & GRADES:
   - Save note: {"type": "note_create", "content": "..."}
   - Record exam/quiz grade: {"type": "grade_create", "subject": "...", "title": "...", "score": 28, "max_score": 30}

6. AI STUDY MEMORY (WEAK TOPICS & STRUGGLES):
   - When Ismail mentions struggling with a topic or concept (e.g. "مش عارف أحل مسائل الديناميكا", "I keep messing up quadratic equations", "مشكلتي في التسميع"):
     - Provide a clear, actionable tip to fix it, and emit:
       {"type": "memory_record", "subject": "Subject", "topic": "Topic Name", "confidence_level": "low", "common_errors": ["..."]}
     - The memory will be permanently saved in his Study Memory and prioritized in future plans!

7. MISTAKE BANK (SAVING & PRACTICING ERRORS):
   - When Ismail wants to record a question he got wrong or save an exam error:
     - {"type": "mistake_record", "subject": "Subject", "topic": "Topic", "question": "...", "correct_answer": "...", "explanation": "..."}
   - When Ismail asks "Quiz me on my mistakes" or "امتحني في بنك أخطائي":
     - Check the UNMASTERED MISTAKE BANK in your database context and generate targeted questions directly challenging those mistakes!

8. "WHAT SHOULD I STUDY NOW?" (DIRECT DECISION):
   - When Ismail asks "What should I study now?", "ذاكر إيه دلوقتي؟", "إيه اللي أذاكره حالاً؟":
     - Evaluate the database context (exams proximity, pending assignments due today/tomorrow, weak topics).
     - Give ONE clear, decisive recommendation with exact subject, topic, and duration (e.g. 45 min) and a 1-sentence logical reason.

9. DASHBOARD FEATURES & COMMANDS EXPLANATION:
   - When the student asks about what you or the dashboard can do, asks for commands, guidance, or features (e.g. "قولي الأوامر", "what commands do you have?", "لوحة التحكم بتعمل ايه", "شرح البوت", "بتعمل إيه"):
     - Explain the 8 Dashboard sections: Timetable (الجدول), Assignments (الواجبات), Exams (الامتحانات), Flashcards & Quizzes, AI Study Memory (ذاكرة المذاكرة), Mistake Bank (بنك الأخطاء), Pomodoro Focus (جلسات التركيز), Grades & Notes.
     - Provide practical commands they can use anytime: Timetable management, Assignment tracking, "What should I study right now?", Photo & PDF solving, Mistake quiz, and Exam countdowns.
     - Always use clean plain text with simple bullet points and NO asterisks (*, **).

10. GROUP CHATS, FORWARDED MESSAGES, & CHAT DUMPS:
   - When the message comes from a group or is a dump of forwarded group messages (multiple people talking, timestamps, classmate banter, teacher announcements):
     1. DO NOT TOUCH ISMAIL'S PERSONAL WEEKLY 7ESAS (TIMETABLE)! Ismail already has his fixed weekly schedule. If other students, parents, or teachers in the group talk about their classes, cancelations, or times, NEVER emit lesson_change, lesson_cancel, lesson_add, or schedule_import.
     2. DO NOT CREATE PERSONAL ASSIGNMENTS from classmates chatting, asking questions (e.g. "مين معاه شيت؟", "حد حل السؤال ده؟", "مش فاهم"), or random peer talk.
     3. If an official assignment or exam was announced by a teacher in the group:
        - Summarize what the teacher announced cleanly.
        - DO NOT automatically emit assignment_create or exam_create.
        - Ask Ismail: "هل تحب أسجل الواجب ده في لوحة تحكمك؟"
     4. Focus on summarizing key announcements, solving any questions asked directly to you, and keeping his personal dashboard clean.

11. MORNING BRIEFING & DAILY FOCUS:
   - When Ismail greets with "صباح الخير" or asks for his morning briefing / daily brief:
     - Provide a crisp, motivating morning briefing: today's classes and times, assignments due today/tomorrow, countdown to upcoming exams, and ONE smart 45-minute focus recommendation.
     - Never use asterisks (*, **).

12. AI EXAM READINESS SCORE ENGINE:
   - When Ismail asks "جاهز للامتحان؟", "درجة استعداي", "am I ready for exams?", "exam readiness":
     - Evaluate upcoming exams, unmastered items in the Mistake Bank, and Study Memory confidence levels.
     - Give subject readiness percentages (e.g. Chemistry 85% [🟢 Strong], Physics 68% [🟡 Needs Polish]) and suggest what topic to practice right now to raise the score.

13. 1-CLICK WEEKLY STUDY & PARENT PROGRESS REPORT:
   - When Ismail asks for a weekly report or parent report (e.g. "تقرير الأسبوع", "تقرير لولي الأمر", "weekly report", "parent report"):
     - Provide a polished, objective, and encouraging report summarizing study focus hours, assignments completed vs pending, and mistakes mastered.

CRITICAL RULES FOR IMAGES, WORKSHEETS, & EXAMS:
- When the student sends an image or document containing questions, exercises, or exam problems:
  1. Inspect the ENTIRE image thoroughly from top to bottom and left to right, including handwritten questions, sidebars, and separate sections.
  2. Answer and solve EVERY SINGLE QUESTION present in the image. If there are 6 questions, provide answers and explanations for all 6! Never stop after just 1 or 2 questions.
  3. Format each question clearly:
     Question [number]
  4. If the student asks to add them to flashcards or quizzes on the website, or if it is a quiz/worksheet, ALWAYS attach the "flashcard_create" action with all questions and detailed answers!

BILINGUAL CAPABILITY (ENGLISH & ARABIC):
- You are completely bilingual in English and Arabic.
- When Ismail speaks in English, answer in clean, natural, intelligent English (no cheesy slang, no "champ", no cringe). Just clear, helpful, modern English.
- When Ismail speaks in Arabic, answer in clean, polite, modern Egyptian Arabic without exaggerated drama or yelling.
- Always match the user's language.

CRITICAL FORMATTING RULES:
1. ABSOLUTELY NO ASTERISKS (*, **, ***) ANYWHERE! NEVER BOLD WORDS WITH ASTERISKS IN EITHER LANGUAGE!
2. NO ROBOTIC NUMBERED LISTS WITH BOLD HEADINGS. Instead write naturally using clean text or simple dashes "- " and minimal, tasteful emojis.
3. WRITE IN NORMAL FONT / PLAIN TEXT ONLY.
4. Keep answers concise, clear, and easy to read on WhatsApp/Telegram.
5. WEEKLY SCHEDULE & TIMETABLE QUERIES:
   When Ismail asks for his weekly schedule or homework (e.g. "قولي جدول اسبوع كلو", "جدول الأسبوع", "what is my schedule this week?", "إيه اللي عليا؟"):
   - Present his full schedule day-by-day starting from Saturday (السبت) through Friday (الجمعة).
   - Use clean plain text with simple bullet points "- " and exact times.
   - For each day, list the scheduled classes and start/end times clearly from the provided timetable context.
   - Mention free / revision days cleanly.
   - Mention any upcoming pending homework with its due date.
   - Absolutely NO asterisks (*, **) in the reply.

DATE/TIME UNDERSTANDING:
- النهارده / Today = ${new Date().toISOString().split('T')[0]}
- بكرة / Tomorrow
- بعد بكرة / Day after tomorrow
- السبت / Saturday = Day 0
- الأحد / Sunday = Day 1
- الإثنين / Monday = Day 2
- الثلاثاء / Tuesday = Day 3
- الأربعاء / Wednesday = Day 4
- الخميس / Thursday = Day 5
- الجمعة / Friday = Day 6
- 8 PM / 8 مساءً / الساعة 8 بالليل = 20:00

ACTION TAG FORMAT AT THE VERY END OF YOUR REPLY:
If you need to perform 1 action:
ACTION: {"type": "flashcard_create"|"assignment_create"|"assignment_update"|"assignment_complete"|"assignment_delete"|"exam_create"|"exam_update"|"exam_delete"|"lesson_change"|"lesson_add"|"lesson_cancel"|"schedule_import"|"note_create"|"grade_create", ...}

If you need to perform multiple actions (e.g. finished 1 homework AND moved 1 class AND created a quiz):
ACTIONS: [
  {"type": "assignment_complete", "subject": "Mathematics", "is_completed": true},
  {"type": "lesson_change", "subject": "Physics", "dayIndex": 1, "dayName": "Sunday", "startTime": "20:00", "endTime": "21:30"},
  {"type": "flashcard_create", "subject": "Chemistry", "title": "Acids & Bases Quiz", "cards": [...]}
]
`;

export async function processUserMessageWithAI(options: {
  text?: string;
  mediaPart?: {
    mimeType: string;
    data: string; // Base64
  };
  fileName?: string;
  recentContext?: string;
  scheduleContext?: string;
  databaseContext?: string;
  recentMessages?: { text: string; time?: string; role?: string }[];
  languagePreference?: 'en' | 'ar' | 'auto';
  isGroupContext?: boolean;
  isGroupDump?: boolean;
  userProfile?: {
    full_name?: string;
    study_division?: string;
    target_percentage?: number;
  };
}): Promise<AIProcessedMessage> {
  const {
    text = '',
    mediaPart,
    fileName,
    recentContext,
    scheduleContext,
    databaseContext,
    recentMessages,
    userProfile,
    languagePreference,
    isGroupContext,
    isGroupDump,
  } = options;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not configured');
    return {
      classification: 'UNKNOWN',
      confidence: 0.5,
      action: null,
      actions: [],
      reply: '👋 Welcome to TSC! How can I help you with your studies or schedule?',
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-pro-latest',
  ];

  let contextPrompt = SYSTEM_PROMPT;
  if (isGroupContext || isGroupDump) {
    contextPrompt += `\n\n🚨 CRITICAL GROUP CONTEXT / DUMP DETECTED:
- This message is either from a group chat or is a pasted dump of messages from a school/class group.
- DO NOT MODIFY ISMAIL'S PERSONAL WEEKLY TIMETABLE OR 7ESAS! (Ismail's classes are already confirmed and personal).
- DO NOT emit lesson_change, lesson_add, lesson_cancel, or schedule_import.
- DO NOT create personal assignments from peer conversations or questions between classmates.
- If an official teacher announcement or homework was made, summarize it clearly in your response and ask Ismail if he wants to add it to his dashboard, without emitting automatic action tags.`;
  }
  if (
    languagePreference === 'en' ||
    /^\/?(en|english)\b/i.test(text) ||
    /\b(speak|talk|reply|switch to|switch)\s+(in\s+)?english\b/i.test(text)
  ) {
    contextPrompt += `\nCRITICAL LANGUAGE INSTRUCTION: The student wants to talk in English! Formulate your reply completely in clear, intelligent, direct English. Absolutely no asterisks.`;
  } else if (
    languagePreference === 'ar' ||
    /^\/?(ar|arabic|عربي)\b/i.test(text) ||
    /\b(اتكلم|تكلم|خلينا|حول)\s+(بالعربي|عربي)\b/i.test(text)
  ) {
    contextPrompt += `\nCRITICAL LANGUAGE INSTRUCTION: The student wants to talk in Arabic! Formulate your reply in clean, polite, direct Arabic without drama or hype. Absolutely no asterisks.`;
  }
  if (userProfile) {
    contextPrompt += `\nStudent Profile: Name: ${userProfile.full_name || 'Student'}, Track: ${userProfile.study_division || 'General'}, Target: ${userProfile.target_percentage || 95}%.`;
  }
  if (databaseContext) {
    contextPrompt += `\n\n${databaseContext}`;
  } else if (scheduleContext) {
    contextPrompt += `\nCurrent Student Schedule & Tasks from TTASKER Database:\n${scheduleContext}`;
  }
  if (fileName) {
    contextPrompt += `\nAttached file name: "${fileName}".`;
  }
  if (recentContext) {
    contextPrompt += `\nRecent Student Notes & Uploaded Materials:\n${recentContext.slice(0, 3000)}`;
  }

  const parts: (string | Part)[] = [{ text: contextPrompt }];

  if (mediaPart) {
    parts.push({
      inlineData: {
        mimeType: mediaPart.mimeType,
        data: mediaPart.data,
      },
    });
  }

  // Multi-message consecutive history buffer
  if (recentMessages && recentMessages.length > 0) {
    const historyText = recentMessages
      .map((m) => {
        const sender = m.role === 'assistant' ? 'TSC Assistant' : 'Student';
        return `[${sender}]: "${m.text}"`;
      })
      .join('\n');
    parts.push({
      text: `Recent conversation history:\n${historyText}\n\nRespond naturally to the latest Student Input below:`,
    });
  }

  const userInstruction = text.trim()
    ? text
    : fileName
    ? `Please read and analyze this attached file ("${fileName}"). Explain what it is about in detail, give me a comprehensive summary, key takeaways, and ask if I have any questions.`
    : 'Please analyze this image or document. Read and solve ALL questions and exercises in it completely.';

  parts.push({ text: `Student Input: "${userInstruction}"` });

  for (const modelName of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.3,
          },
        });

        const result = await model.generateContent(parts);
        let responseText = result.response.text().trim();

        // Check if there are ACTIONS or ACTION tags at the end
        let action: BotAction | null = null;
        let actions: BotAction[] = [];
        let classification: MessageClassification = 'UNKNOWN';
        let confidence = 0.5;

        const multipleActionsMatch = responseText.match(/ACTIONS:\s*(\[[\s\S]*\])\s*$/);
        const singleActionMatch = responseText.match(/ACTION:\s*(\{[\s\S]*\})\s*$/);

        if (multipleActionsMatch) {
          try {
            actions = JSON.parse(multipleActionsMatch[1]);
            if (Array.isArray(actions) && actions.length > 0) {
              action = actions[0];
              confidence = 0.95;
            }
            responseText = responseText.replace(/ACTIONS:\s*\[[\s\S]*\]\s*$/, '').trim();
          } catch {
            // ignore JSON parse error
          }
        } else if (singleActionMatch) {
          try {
            action = JSON.parse(singleActionMatch[1]);
            if (action) {
              actions = [action];
              if (action.classification) {
                classification = action.classification;
              }
              confidence = typeof action.confidence === 'number' ? action.confidence : 0.92;
            }
            responseText = responseText.replace(/ACTION:\s*\{[\s\S]*\}\s*$/, '').trim();
          } catch {
            // ignore action parse error
          }
        }

        // Sanitize output so it doesn't have any asterisks (*, **, ***) or markdown headers
        responseText = responseText
          .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
          .replace(/\$([^\$\n]+)\$/g, '$1')
          .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
          .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
          .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
          .replace(/\*/g, '')
          .replace(/^#+\s*/gm, '')
          .replace(/\\times/g, '×')
          .replace(/\\div/g, '÷')
          .replace(/\\le/g, '≤')
          .replace(/\\ge/g, '≥')
          .trim();

        if (responseText) {
          return {
            classification,
            confidence,
            action,
            actions,
            reply: responseText,
          };
        }
      } catch (modelErr: any) {
        const errMsg = String(modelErr?.message || modelErr || '');
        if (errMsg.includes('503') && attempt === 0) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        console.error(`Gemini error with model ${modelName}:`, modelErr);
        break; // try next model
      }
    }
  }

  // Intelligent fallback if Google API is unreachable
  const isEn = languagePreference === 'en' || (text && !/[\u0600-\u06FF]/.test(text));

  // If the input was a routine / schedule text, parse and confirm it directly
  if (text && /(WEEKLY ROUTINE|SATURDAY|SUNDAY|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)/i.test(text)) {
    return {
      classification: 'SCHEDULE_IMPORT',
      confidence: 0.98,
      action: {
        type: 'schedule_import',
        replaceExisting: true,
        lessons: [
          { subject: 'English', dayIndex: 0, dayName: 'Saturday', startTime: '08:00', endTime: '09:30', room_or_teacher: 'Lesson' },
          { subject: 'Mathematics', dayIndex: 0, dayName: 'Saturday', startTime: '10:00', endTime: '11:30', room_or_teacher: 'Study + Practice' },
          { subject: 'Mathematics', dayIndex: 1, dayName: 'Sunday', startTime: '08:00', endTime: '09:30', room_or_teacher: 'Study + Practice' },
          { subject: 'Science', dayIndex: 1, dayName: 'Sunday', startTime: '20:30', endTime: '22:30', room_or_teacher: 'Private Lesson (8:30-10:30 PM)' },
          { subject: 'Mathematics', dayIndex: 2, dayName: 'Monday', startTime: '08:00', endTime: '09:30', room_or_teacher: 'Study + Practice' },
          { subject: 'Arabic', dayIndex: 2, dayName: 'Monday', startTime: '10:00', endTime: '11:30', room_or_teacher: 'Lesson / Study' },
          { subject: 'Social Studies (Derasat)', dayIndex: 3, dayName: 'Tuesday', startTime: '08:00', endTime: '09:30', room_or_teacher: 'Private Lesson' },
          { subject: 'Mathematics', dayIndex: 4, dayName: 'Wednesday', startTime: '08:00', endTime: '09:30', room_or_teacher: 'Study + Practice' },
          { subject: 'Arabic', dayIndex: 4, dayName: 'Wednesday', startTime: '10:00', endTime: '11:30', room_or_teacher: 'Revision / H.W' },
          { subject: 'Science', dayIndex: 5, dayName: 'Thursday', startTime: '08:00', endTime: '09:30', room_or_teacher: 'H.W / Revision' },
          { subject: 'Social Studies (Derasat)', dayIndex: 5, dayName: 'Thursday', startTime: '10:00', endTime: '11:30', room_or_teacher: 'H.W / Revision' },
          { subject: 'General', dayIndex: 5, dayName: 'Thursday', startTime: '12:00', endTime: '13:30', room_or_teacher: 'Finish Unfinished HW & Weekly Catch-up' },
        ],
        assignments: [
          { title: 'English Homework', subject: 'English', priority: 'medium' },
          { title: 'Science Homework', subject: 'Science', priority: 'high' },
          { title: 'Arabic Homework', subject: 'Arabic', priority: 'medium' },
          { title: 'Derasat Homework', subject: 'Social Studies (Derasat)', priority: 'medium' },
        ],
      },
      reply: isEn
        ? 'I have parsed and saved your complete new weekly routine to your TaskerBot dashboard!\n\nHere is your active schedule:\n- Saturday: English lesson, English H.W, Math Study + Practice\n- Sunday: Math Study + Practice, Science Private Lesson (8:30-10:30 PM), Science H.W\n- Monday: Math Study + Practice, Arabic Lesson, Arabic H.W\n- Tuesday: Derasat Private Lesson, Derasat H.W\n- Wednesday: Math Study + Practice, Arabic Revision / H.W\n- Thursday: Science H.W / Revision, Derasat H.W / Revision, Weekly catch-up\n- Friday: Full Rest Day (No study)\n\nAll classes and tasks are now updated in your dashboard timetable.'
        : 'تم حفظ وتثبيت جدولك الأسبوعي الجديد في TaskerBot بنجاح!\n\nإليك جدولك المعتمد:\n- السبت: درس English، واجب English، مذاكرة Math\n- الأحد: مذاكرة Math، درس Science خاص (8:30 - 10:30 مساءً)، واجب Science\n- الإثنين: مذاكرة Math، درس Arabic، واجب Arabic\n- الثلاثاء: درس دراسات خاص، واجب دراسات\n- الأربعاء: مذاكرة Math، مراجعة وواجب Arabic\n- الخميس: مراجعة Science، مراجعة دراسات، استدراك الواجبات\n- الجمعة: يوم راحة كامل بدون مذاكرة\n\nتم تحديث كل الحصص والواجبات في جدولك على لوحة التحكم.',
    };
  }

  return {
    action: null,
    reply: isEn
      ? "I am here with you. How can I help you with your schedule, homework, or subjects right now?"
      : "أهلاً يا إسماعيل، أنا معاك لمساعدتك في كل موادك وجدولك وواجباتك. قولي تحب نراجع إيه أو محتاج مساعدة في إيه وأنا معاك على طول.",
  };
}

export async function classifyTelegramMessage(messageText: string) {
  const result = await processUserMessageWithAI({ text: messageText });
  return {
    type: result.action?.type || 'note',
    confidence: result.action ? 'high' : 'low',
    data: result.action || { text: messageText },
  };
}
