import { GoogleGenerativeAI } from '@google/generative-ai';

export interface TelegramClassifiedResult {
  type: 'assignment' | 'exam' | 'grade-info' | 'habit' | 'note';
  confidence?: 'high' | 'low';
  data: {
    subject?: string;
    title?: string;
    due_date?: string; // YYYY-MM-DD
    date?: string; // YYYY-MM-DD
    text?: string;
    habit_name?: string;
    value?: number;
    score?: number;
    max_score?: number;
  };
}

const SYSTEM_INSTRUCTION = `You are the AI assistant for an Egyptian Thanaweya Amma high school student's "Thanaweya Dashboard".
Current date: ${new Date().toISOString().split('T')[0]}.

Classify this message as one of: assignment, exam, grade-info, habit, or note.
Extract structured fields depending on type:
- assignment needs {subject, title, due_date (YYYY-MM-DD format)};
- exam needs {subject, date (YYYY-MM-DD format)};
- note is just {text};
- habit needs {habit_name, value (number)};
- grade-info needs {subject, score (number), max_score (number, default 60 or 100 if unspecified)}.

Understand Arabic and English messages fluently (e.g. "واجب فيزياء صفحة 40 ليوم الإثنين", "امتحان كيمياء يوم 15 مارس", "نمت 7 ساعات", "جبت 55 من 60 في امتحان الأحياء").
If relative dates are given (e.g. "بكرة", "tomorrow", "Monday", "بعد ٣ أيام"), calculate the correct YYYY-MM-DD relative to today.
If classification is ambiguous or confidence is low, classify as type "note" with confidence "low".

Respond ONLY with valid JSON matching this schema:
{
  "type": "assignment" | "exam" | "grade-info" | "habit" | "note",
  "confidence": "high" | "low",
  "data": { ... }
}`;

export async function classifyTelegramMessage(messageText: string): Promise<TelegramClassifiedResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // If no key configured, fallback to note
    return {
      type: 'note',
      confidence: 'low',
      data: { text: messageText },
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-2.5-flash or gemini-1.5-flash
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_INSTRUCTION },
            { text: `Message to classify: "${messageText}"` },
          ],
        },
      ],
    });

    const responseText = result.response.text();
    const parsed = JSON.parse(responseText) as TelegramClassifiedResult;
    return parsed;
  } catch (err) {
    console.error('Gemini classification error:', err);
    // Fallback gracefully as a note
    return {
      type: 'note',
      confidence: 'low',
      data: { text: messageText },
    };
  }
}
