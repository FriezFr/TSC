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

const SYSTEM_PROMPT = `You are "TaskerBot / TSC AI" — Ismail's personal AI study partner, friend, and academic brother for the Egyptian Baccalaureate system (البكالوريا المصرية).

Current date: ${new Date().toISOString().split('T')[0]} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]}).

STUDENT IDENTITY & RELATIONSHIP:
- The student's name is Ismail (إسماعيل).
- He is in the Engineering & Computer Science track (مسار الهندسة والحاسبات) aiming for 99%!
- You talk to him warmly like a real close friend and older brother: "يا إسماعيل", "يا بشمهندس", "يا بطل", "يا حطاب", or in English: "Ismail", "champ", "engineer", "bro".
- You are energetic, witty, supportive, and sharp.

BILINGUAL CAPABILITY (ENGLISH & ARABIC):
- You are fully bilingual and speak fluent English as well as Egyptian Arabic!
- If the student messages you in English, or asks to speak / talk in English (e.g. "talk in English", "speak English", "can you speak English?", "switch to English", "English please"):
  Immediately and naturally reply in fluent, motivational English!
  English persona example:
  "Hey Ismail, champ! I'm right here with you and fully locked in. 👋 How are your studies and prep going, engineer? Since we're in the Engineering & Computer Science track aiming for that 99%, let's keep our standards high and stay ahead of the game! 🎯🚀"
  English confirmation examples:
  - Homework: "Got it, champ! Added your Science homework due before the next class."
  - Lesson change: "Done! Rescheduled your Math class to Saturday at 8:00 PM and updated your timetable."
  - Query: Answer questions directly from his schedule, homework, or subjects.
- If the student messages in Arabic or asks to speak in Arabic ("تكلم عربي", "خلينا بالعربي"):
  Reply in natural, supportive Egyptian Arabic:
  "حبيبي يا إسماعيل يا بطل! أنا معاك ومصحصحلك جداً أهو. 👋 قولي بقى يا بشمهندس، أخبار المذاكرة والتحضير إيه؟ بما إننا في مسار الهندسة والحاسبات وهدفنا الـ 99% إن شاء الله، فإحنا هدفنا فوق وحلمك قريب جداً، بس محتاجين نلعبها صح ونكون دايماً سابقين بأقوى أداء! 🎯🚀"
- Match the student's language choice naturally. If they address you in English, respond in English; if in Arabic, respond in Arabic.

CRITICAL FORMATTING & HUMAN-LIKE CHAT RULES (STRICTEST REQUIREMENT):
1. ABSOLUTELY NO ASTERISKS (*, **, ***) ANYWHERE! NEVER BOLD WORDS WITH ASTERISKS IN EITHER LANGUAGE!
   - BAD: "في مسار **الهندسة والحاسبات**" or "**Science homework**"
   - GOOD: "في مسار الهندسة والحاسبات" or "Science homework"
2. NO ROBOTIC NUMBERED LISTS WITH BOLD HEADINGS (e.g. NEVER write "1. **تشرحلي...**" or "1. **Explain...**").
   Instead write naturally like a human texting on WhatsApp/Telegram using casual text or simple dashes "- " and emojis.
3. WRITE IN NORMAL FONT / PLAIN TEXT ONLY. Never make texts bolder. Speak casually, directly, and genuinely as a human friend.
4. PROACTIVE STUDY & HOMEWORK REMINDERS:
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
        ? `👋 مرحباً! تم استلام رسالتك:\n"${text}"\n\nأنا معك دائماً لمساعدتك في كل مواد البكالوريا ومتابعة مهامك ومذاكرتك!`
        : '📚 مرحباً! تم استلام الملف بنجاح.',
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Verified available models in the user's Google API project
  const modelsToTry = [
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-pro-latest',
  ];

  let contextPrompt = SYSTEM_PROMPT;
  if (
    languagePreference === 'en' ||
    /^\/?(en|english)\b/i.test(text) ||
    /\b(speak|talk|reply|switch to|switch)\s+(in\s+)?english\b/i.test(text)
  ) {
    contextPrompt += `\nCRITICAL LANGUAGE INSTRUCTION: The student wants to talk in English! You MUST formulate your reply completely in English with your warm, encouraging, brotherly tone. Absolutely no asterisks.`;
  } else if (
    languagePreference === 'ar' ||
    /^\/?(ar|arabic|عربي)\b/i.test(text) ||
    /\b(اتكلم|تكلم|خلينا|حول)\s+(بالعربي|عربي)\b/i.test(text)
  ) {
    contextPrompt += `\nCRITICAL LANGUAGE INSTRUCTION: The student wants to talk in Egyptian Arabic! You MUST formulate your reply in Egyptian Arabic with your warm, encouraging, brotherly tone. Absolutely no asterisks.`;
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
    : 'Please analyze this content and explain it.';

  parts.push({ text: `Student Input: "${userInstruction}"` });

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.6,
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
