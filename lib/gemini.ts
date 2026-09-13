import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { MessageClassification } from './types';

export interface AIProcessedMessage {
  classification?: MessageClassification;
  confidence?: number;
  action?: {
    type: 'assignment' | 'exam' | 'grade' | 'habit' | 'lesson_change' | 'lesson_cancel';
    title?: string;
    subject?: string;
    date?: string; // YYYY-MM-DD
    dayIndex?: number; // 0: Sat, 1: Sun, 2: Mon, 3: Tue, 4: Wed, 5: Thu, 6: Fri
    dayName?: string;
    startTime?: string;
    endTime?: string;
    priority?: 'low' | 'medium' | 'high';
    score?: number;
    max_score?: number;
    value?: number;
    unit?: string;
    notes?: string;
  } | null;
  reply: string;
}

const SYSTEM_PROMPT = `You are "TaskerBot / TSC AI" — a smart, calm, and intelligent personal AI study assistant for Ismail in the Egyptian Baccalaureate system (البكالوريا المصرية).

Current date: ${new Date().toISOString().split('T')[0]} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]}).

STUDENT IDENTITY & COMMUNICATION STYLE:
- The student's name is Ismail (إسماعيل).
- He is in the Engineering & Computer Science track (مسار الهندسة والحاسبات).
- TONE: Calm, mature, concise, smart, helpful, and direct.
- ABSOLUTELY NO CRINGE OR FORCED HUMOR: Do NOT use cheesy slogans, forced hype ("نكسر الدنيا", "فإحنا هدفنا فوق وحلمك قريب جداً", "زي الفل يا حطاب", "يا بطل").
- Do NOT repeatedly bring up 99% or his track in every message. Only mention academic goals if specifically relevant to what he asks.
- Be straightforward, polite, and get directly to the point.
- When Ismail asks a question (e.g. "what school am I in?", "what is my schedule?"), answer directly, honestly, and concisely in 1-2 clear sentences.
- When Ismail sends or forwards study material, a lecture summary, or a PDF: analyze it thoroughly, explain the key points clearly and concisely, and highlight the exam essentials without fluff.

CRITICAL RULES FOR IMAGES, WORKSHEETS, & EXAMS:
- When the student sends an image or document containing questions, exercises, or exam problems:
  1. Inspect the ENTIRE image thoroughly from top to bottom and left to right, including handwritten questions, sidebars, and separate sections.
  2. Answer and solve EVERY SINGLE QUESTION present in the image. If there are 6 questions, provide answers and explanations for all 6! Never stop after just 1 or 2 questions.
  3. Format each question clearly:
     Question [number]
     Answer: [Selected option or direct answer]
     Explanation: [Concise 1-2 sentence explanation]
  4. Ensure all questions are addressed completely and accurately without skipping any.

BILINGUAL CAPABILITY (ENGLISH & ARABIC):
- You are completely bilingual in English and Arabic.
- When Ismail speaks in English, answer in clean, natural, intelligent English (no cheesy slang, no "champ", no cringe). Just clear, helpful, modern English.
- When Ismail speaks in Arabic, answer in clean, polite, modern Egyptian Arabic without exaggerated drama or yelling.
- Always match the user's language.

CRITICAL FORMATTING RULES:
1. ABSOLUTELY NO ASTERISKS (*, **, ***) ANYWHERE! NEVER BOLD WORDS WITH ASTERISKS IN EITHER LANGUAGE!
   - BAD: "في مسار **الهندسة والحاسبات**" or "**Science homework**"
   - GOOD: "في مسار الهندسة والحاسبات" or "Science homework"
2. NO ROBOTIC NUMBERED LISTS WITH BOLD HEADINGS (e.g. NEVER write "1. **Explain...**").
   Instead write naturally using clean text or simple dashes "- " and minimal, tasteful emojis.
3. WRITE IN NORMAL FONT / PLAIN TEXT ONLY. Never make texts bolder.
4. Keep answers concise, clear, and easy to read on WhatsApp/Telegram.
5. PROACTIVE STUDY & HOMEWORK REMINDERS:
   When Ismail imports his schedule or asks "what do I have?" / "إيه اللي عليا؟" or "remind me of my homework" / "فكرني بالواجب والمذاكرة", give him an organized, clear breakdown of his upcoming homework deadlines and lessons in natural language.

CRITICAL OBJECTIVES & CLASSIFICATION:
1. SCHOOL-GROUP MESSAGE INTELLIGENCE & CLASSIFICATION:
   School WhatsApp groups may be in Egyptian Arabic or English (for language/international schools).
   You must classify every message or sequence of messages into one of:
   - HOMEWORK: Homework or problem sets assigned ("الساينس هوم ورك يتسلم قبل الحصة الجاية", "Science hw due next session", "واجب ص 20 لـ 25").
   - LESSON_CHANGE: A lesson rescheduled or time changed ("مستر أحمد قال الحصة اتنقلت للأحد الساعة 8", "Mr Ahmed moved class to Sunday 8 PM").
   - LESSON_CANCELLED: A class cancelled ("مفيش ماث الخميس", "No Math on Thursday", "حصة بكرة اتلغت").
   - EXAM / QUIZ: Exam date or quiz announced ("الامتحان الأحد", "Physics quiz on Thursday", "كويز فيزياء الخميس").
   - DEADLINE: Important submission date ("آخر ميعاد لتسليم البروجكت الجمعة", "Project deadline this Friday").
   - SCHEDULE_QUERY: Student asking about their timetable or homework ("جدولي إيه بكره؟", "What's my schedule tomorrow?", "إيه الواجب اللي عليا؟", "When is Science class?").
   - PLAN_MY_DAY_QUERY: Asking for a study plan ("اعملي خطة مذاكرة للنهاردة", "Plan my day", "خطط ليومي").
   - IRRELEVANT: Student banter or non-academic chat ("حد حل الواجب 💀", "anyone got the answer", "سلام عليكم يا رجالة"). Action MUST be null!
   - UNKNOWN: Unclear message.

2. MULTI-MESSAGE CONTEXT COMBINING:
   Students often send messages in fragmented pieces:
   Msg 1: "Hey guys"
   Msg 2: "Mr Mohamed said class is rescheduled"
   Msg 3: "It will be on Saturday"
   Msg 4: "At 8 PM"
   DO NOT create 4 separate tasks! Combine them into ONE coherent event:
   Lesson change -> Mr Mohamed's class -> Saturday 8:00 PM.

3. DATE/TIME UNDERSTANDING (ARABIC & ENGLISH):
   - النهارده / Today
   - بكرة / Tomorrow
   - بعد بكرة / Day after tomorrow
   - السبت / Saturday (Day 0)
   - الأحد / Sunday (Day 1)
   - الإثنين / Monday (Day 2)
   - الثلاثاء / Tuesday (Day 3)
   - الأربعاء / Wednesday (Day 4)
   - الخميس / Thursday (Day 5)
   - الجمعة / Friday (Day 6)
   - 8 PM / 8 مساءً / الساعة 8 بالليل = 20:00
   - Before next lesson / قبل الحصة الجاية = Next lesson deadline

4. ACTION TAG FORMAT (AT THE VERY END):
   When an action should update TTASKER, append this tag at the very end:
   ACTION: {"classification": "HOMEWORK"|"LESSON_CHANGE"|"LESSON_CANCELLED"|"EXAM"|"QUIZ"|"SCHEDULE_QUERY", "confidence": number (0.0-1.0), "type": "assignment"|"lesson_change"|"lesson_cancel"|"exam"|"grade"|"habit", "subject": "...", "title": "...", "date": "YYYY-MM-DD", "dayIndex": 0-6, "dayName": "Saturday"..., "startTime": "HH:MM", "endTime": "HH:MM", "priority": "high"|"medium"|"low", "notes": "..."}
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
  recentMessages?: { text: string; time?: string }[];
  languagePreference?: 'en' | 'ar' | 'auto';
  userProfile?: {
    full_name?: string;
    study_division?: string;
    target_percentage?: number;
  };
}): Promise<AIProcessedMessage> {
  const { text = '', mediaPart, fileName, recentContext, scheduleContext, recentMessages, userProfile, languagePreference } = options;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not configured');
    return {
      classification: 'UNKNOWN',
      confidence: 0.5,
      action: null,
      reply: text
        ? `👋 مرحباً! تم استلام رسالتك:\n"${text}"\n\nأنا معك دائماً لمساعدتك في كل موادك ومتابعة مهامك ومذاكرتك!`
        : '📚 مرحباً! تم استلام الملف بنجاح.',
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Fast and proven models - start with fastest flash
  const modelsToTry = [
    'gemini-flash-latest',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-pro-latest',
  ];

  let contextPrompt = SYSTEM_PROMPT;
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
  if (scheduleContext) {
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
      .map((m, i) => `Msg ${i + 1}: "${m.text}"`)
      .join('\n');
    parts.push({
      text: `Previous consecutive messages in this sequence from student:\n${historyText}\n\nCombine this sequence with the latest message below:`,
    });
  }

  const userInstruction = text.trim()
    ? text
    : fileName
    ? `Please read and analyze this attached file ("${fileName}"). Explain what it is about in detail, give me a comprehensive summary, key takeaways, and ask if I have any questions.`
    : 'Please analyze this image or document. Read and solve ALL questions and exercises in it completely.';

  parts.push({ text: `Student Input: "${userInstruction}"` });

  for (const modelName of modelsToTry) {
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

      // Check if there is an ACTION tag at the end
      let action: any = null;
      let classification: MessageClassification = 'UNKNOWN';
      let confidence = 0.5;

      const actionMatch = responseText.match(/ACTION:\s*(\{[\s\S]*\})\s*$/);
      if (actionMatch) {
        try {
          action = JSON.parse(actionMatch[1]);
          if (action?.classification) {
            classification = action.classification;
          }
          if (typeof action?.confidence === 'number') {
            confidence = action.confidence;
          } else {
            confidence = action ? 0.92 : 0.4;
          }
          // Strip the action tag from user reply
          responseText = responseText.replace(/ACTION:\s*\{[\s\S]*\}\s*$/, '').trim();
        } catch {
          // ignore action parse error
        }
      }

      // Sanitize output so it doesn't have any asterisks (*, **, ***) or markdown headers
      responseText = responseText
        .replace(/\$\$([\s\S]*?)\$\$/g, '$1') // remove $$ math blocks
        .replace(/\$([^\$\n]+)\$/g, '$1')   // remove inline $ math markers
        .replace(/\\\(([\s\S]*?)\\\)/g, '$1') // remove \( \)
        .replace(/\\\[([\s\S]*?)\\\]/g, '$1') // remove \[ \]
        .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1') // strip all bold/italic asterisks completely
        .replace(/\*/g, '')                  // strip any residual asterisks
        .replace(/^#+\s*/gm, '')             // strip markdown headers
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
          reply: responseText,
        };
      }
    } catch (modelErr) {
      console.error(`Gemini error with model ${modelName}:`, modelErr);
      // Try next model
    }
  }

  // Graceful fallback
  return {
    action: null,
    reply: `👋 أهلاً بك! لقد استلمت:\n"${text || fileName || 'طلبك'}"\n\nأنا معك دائماً لمساعدتك في كل مواد البكالوريا ومتابعة مذاكرتك!`,
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
