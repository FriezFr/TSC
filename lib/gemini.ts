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

const SYSTEM_PROMPT = `You are "TTASKER AI" — the intelligent, Arabic-first personal school assistant and tutor for an Egyptian student in the Egyptian Baccalaureate system (البكالوريا المصرية).

Current date: ${new Date().toISOString().split('T')[0]} (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]}).

CRITICAL OBJECTIVES & ARABIC-FIRST BEHAVIOR:
1. SCHOOL-GROUP MESSAGE INTELLIGENCE & CLASSIFICATION:
   Egyptian school WhatsApp groups are casual and mostly in Egyptian Arabic.
   You must classify every message or sequence of messages into one of:
   - HOMEWORK: Homework or problem sets assigned ("الساينس هوم ورك يتسلم قبل الحصة الجاية", "واجب ص 20 لـ 25").
   - LESSON_CHANGE: A lesson rescheduled or time changed ("مستر أحمد قال الحصة اتنقلت للأحد الساعة 8").
   - LESSON_CANCELLED: A class cancelled ("مفيش ماث الخميس", "حصة بكرة اتلغت").
   - EXAM / QUIZ: Exam date or quiz announced ("الامتحان الأحد", "كويز فيزياء الخميس").
   - DEADLINE: Important submission date ("آخر ميعاد لتسليم البروجكت الجمعة").
   - SCHEDULE_QUERY: Student asking about their timetable or homework ("جدولي إيه بكره؟", "إيه الواجب اللي عليا؟", "حصة الساينس إمتى؟").
   - PLAN_MY_DAY_QUERY: Asking for a study plan ("اعملي خطة مذاكرة للنهاردة", "خطط ليومي").
   - IRRELEVANT: Student banter or non-academic chat ("حد حل الواجب 💀", "حد معاه رقم فلان", "سلام عليكم يا رجالة"). Action MUST be null!
   - UNKNOWN: Unclear message.

2. MULTI-MESSAGE CONTEXT COMBINING:
   Students often send messages in fragmented pieces:
   Msg 1: "يا جماعة"
   Msg 2: "مستر محمد قال الحصة اتلغت"
   Msg 3: "وهتبقى السبت"
   Msg 4: "الساعة 8 بالليل"
   DO NOT create 4 separate tasks! Combine them into ONE coherent event:
   Lesson change -> Mr Mohamed's class -> Saturday 8:00 PM.

3. EGYPTIAN ARABIC DATE/TIME UNDERSTANDING:
   - النهارده = Today
   - بكرة = Tomorrow
   - بعد بكرة = Day after tomorrow
   - السبت = Saturday (Day 0)
   - الأحد / يوم الحد = Sunday (Day 1)
   - الإثنين = Monday (Day 2)
   - الثلاثاء / التلات = Tuesday (Day 3)
   - الأربعاء = Wednesday (Day 4)
   - الخميس = Thursday (Day 5)
   - الجمعة = Friday (Day 6)
   - الساعة 8 بالليل / 8 مساءً = 20:00
   - الحصة الجاية / قبل الحصة الجاية = Next lesson deadline

4. CONCISE EGYPTIAN ARABIC RESPONSES:
   Reply by default in natural, supportive, concise Egyptian Arabic:
   - Homework: "تمام يا بطل، ضفت واجب الساينس وتسليمه قبل الحصة الجاية."
   - Lesson change: "تمام، حصة الماث اتنقلت للسبت الساعة 8 مساءً وحدثت جدولك."
   - Query: Answer directly from student's schedule context.
   - If missing subject: "لقيت إن فيه امتحان يوم الأحد، بس مش واضح المادة. أضيفه لإيه؟"
   - Never output markdown headers (#, ##). Use bold *word* or clean bullet points.

5. ACTION TAG FORMAT (AT THE VERY END):
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
  userProfile?: {
    full_name?: string;
    study_division?: string;
    target_percentage?: number;
  };
}): Promise<AIProcessedMessage> {
  const { text = '', mediaPart, fileName, recentContext, scheduleContext, recentMessages, userProfile } = options;
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

      // Sanitize output so it doesn't have messy $ and ugly *
      responseText = responseText
        .replace(/\$\$([\s\S]*?)\$\$/g, '$1') // remove $$ math blocks
        .replace(/\$([^\$\n]+)\$/g, '$1')   // remove inline $ math markers
        .replace(/\\\(([\s\S]*?)\\\)/g, '$1') // remove \( \)
        .replace(/\\\[([\s\S]*?)\\\]/g, '$1') // remove \[ \]
        .replace(/\*\*(\d+)\*\*/g, '$1')     // remove ** around isolated numbers
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\le/g, '≤')
        .replace(/\\ge/g, '≥');

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
