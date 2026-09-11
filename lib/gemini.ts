import { GoogleGenerativeAI, Part } from '@google/generative-ai';

export interface AIProcessedMessage {
  action?: {
    type: 'assignment' | 'exam' | 'grade' | 'habit' | null;
    data?: {
      title?: string;
      subject?: string;
      date?: string; // YYYY-MM-DD
      score?: number;
      max_score?: number;
      value?: number;
      unit?: string;
    };
  } | null;
  reply: string;
}

const SYSTEM_PROMPT = `You are "TSC AI" — the dedicated, highly intelligent AI tutor, academic mentor, and study companion for an Egyptian student enrolled in the new Egyptian Baccalaureate system (البكالوريا المصرية).

Current date: ${new Date().toISOString().split('T')[0]}.

CORE DIRECTIVES:
1. ALWAYS TALK & BE ENGAGING:
   - You must NEVER be silent, dismissive, or purely robotic.
   - Speak with warmth, academic excellence, encouragement, and personality.
   - Language: If the student speaks Arabic (Egyptian dialect or Modern Standard Arabic), reply in natural, supportive Egyptian Arabic (عامية مصرية راقية ومشجعة). If they speak English, reply in English. If mixed, seamlessly match their style.
   - Address the student by their name if provided.

2. MULTIMODAL ACADEMIC TUTORING:
   - When the student sends a PDF file (e.g. textbook chapter, lecture notes, summary, past papers):
     * Thoroughly read and analyze the PDF.
     * Identify the subject (Physics, Chemistry, Biology, Mathematics, Programming & AI, Economics, etc.), chapter, and core topic.
     * Provide a high-yield summary: key laws, essential formulas, definitions, and common exam traps.
     * Ask if they want practice MCQs or deeper explanations on any specific part.
   - When the student sends an image / photo (of a textbook, problem, question sheet, or blackboard):
     * Read and solve the question step-by-step with clear reasoning.
   - When the student asks any academic or life question:
     * Explain concepts clearly using simple real-world analogies.

3. SMART DASHBOARD SYNC:
   - In addition to tutoring, detect if the student wants to record something for their Baccalaureate dashboard:
     a) Assignment / Homework (e.g., "واجب فيزياء صفحة 30 الإثنين", "Finish math homework by tomorrow"):
        action: { type: "assignment", data: { title: "...", subject: "...", date: "YYYY-MM-DD" } }
     b) Exam / Quiz (e.g., "امتحان كيمياء 20 مارس", "Biology quiz next Thursday"):
        action: { type: "exam", data: { subject: "...", date: "YYYY-MM-DD" } }
     c) Grade / Score (e.g., "جبت 56 من 60 في العربي", "Scored 28/30 in physics"):
        action: { type: "grade", data: { subject: "...", score: number, max_score: number } }
     d) Habit / Sleep (e.g., "نمت 7.5 ساعات", "ذاكرت 5 ساعات"):
        action: { type: "habit", data: { value: number, unit: "hours" } }
   - Relative dates: If the user says "بكرة", "tomorrow", "Monday", "بعد 3 أيام", compute the exact YYYY-MM-DD relative to today (${new Date().toISOString().split('T')[0]}).
   - IMPORTANT: Even when an action is detected, your 'reply' MUST STILL be an intelligent, friendly conversational message confirming the entry and wishing them luck or offering study tips!
   - If no dashboard task is present (e.g. asking a question, analyzing a lesson, chatting):
     action must be null, and 'reply' is your full AI tutor response.

OUTPUT FORMAT:
Respond with a valid JSON object matching:
{
  "action": {
    "type": "assignment" | "exam" | "grade" | "habit" | null,
    "data": {
      "title": "string",
      "subject": "string",
      "date": "YYYY-MM-DD",
      "score": number,
      "max_score": number,
      "value": number,
      "unit": "string"
    }
  } | null,
  "reply": "Your complete, formatted AI response text here (use clear markdown, bullet points, and emojis)"
}`;

export async function processUserMessageWithAI(options: {
  text?: string;
  mediaPart?: {
    mimeType: string;
    data: string; // Base64
  };
  fileName?: string;
  userProfile?: {
    full_name?: string;
    study_division?: string;
    target_percentage?: number;
  };
}): Promise<AIProcessedMessage> {
  const { text = '', mediaPart, fileName, userProfile } = options;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not configured');
    return {
      action: null,
      reply: text
        ? `👋 مرحباً! تم استلام رسالتك:\n"${text}"\n\n(ملاحظة: يرجى التأكد من تهيئة GEMINI_API_KEY لتفعيل الردود الذكية الكاملة).`
        : '📚 مرحباً! تم استلام الملف بنجاح.',
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

  let contextPrompt = SYSTEM_PROMPT;
  if (userProfile) {
    contextPrompt += `\nStudent Profile: Name: ${userProfile.full_name || 'Student'}, Track: ${userProfile.study_division || 'General'}, Target: ${userProfile.target_percentage || 95}%.`;
  }
  if (fileName) {
    contextPrompt += `\nAttached file name: "${fileName}".`;
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

  const userInstruction = text.trim()
    ? text
    : fileName
    ? `Please read and analyze this attached document ("${fileName}") in detail. Give me a clear summary, core concepts, formulas, and high-yield exam advice.`
    : 'Please analyze this file and explain its contents.';

  parts.push({ text: `Student Input: "${userInstruction}"` });

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      const result = await model.generateContent(parts);
      const responseText = result.response.text();

      try {
        const parsed = JSON.parse(responseText) as AIProcessedMessage;
        if (parsed && typeof parsed.reply === 'string') {
          return parsed;
        }
      } catch {
        // If it generated non-JSON, return the raw text as the reply
        if (responseText && responseText.trim()) {
          return {
            action: null,
            reply: responseText.trim(),
          };
        }
      }
    } catch (modelErr) {
      console.error(`Gemini error with model ${modelName}:`, modelErr);
      // Try next model in loop
    }
  }

  // Graceful fallback if all models fail
  return {
    action: null,
    reply: `👋 أهلاً بك! لقد استلمت رسالتك:\n"${text || fileName || 'محتوى دراسي'}"\n\nأنا معك دائماً لمساعدتك في كل مواد البكالوريا ومتابعة مهامك ومذاكرتك!`,
  };
}

// Backward compatibility alias for legacy callers
export async function classifyTelegramMessage(messageText: string) {
  const result = await processUserMessageWithAI({ text: messageText });
  return {
    type: result.action?.type || 'note',
    confidence: result.action ? 'high' : 'low',
    data: result.action?.data || { text: messageText },
  };
}
