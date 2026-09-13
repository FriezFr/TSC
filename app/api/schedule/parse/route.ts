import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedScheduleResponse } from '@/lib/types';

// Helper to clean JSON string from LLM responses (stripping markdown fences)
function extractJsonFromText(text: string): string {
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlock && jsonBlock[1]) {
    return jsonBlock[1].trim();
  }
  return text.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { text, userLanguage = 'en', track = 'general' } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Please provide schedule text to analyze' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];
    const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];

    const SYSTEM_PROMPT = `You are the AI Schedule & Task Parser for TTASKER (Egyptian Baccalaureate & High School Study Dashboard).
Your job is to read natural language study schedules, timetable descriptions, and homework notes, and convert them into strictly structured JSON for TTASKER.

Current Date Reference: ${todayIso} (${todayDayName}).
Student Track: ${track}.
User Preferred Language: ${userLanguage}.

STRICT RULES & BEHAVIOR:
1. SUPPORT NATURAL LANGUAGE & MULTI-LINGUAL:
   - Fluently understand English, Modern Standard Arabic, Egyptian colloquial Arabic, and mixed Franco/English/Arabic (e.g. "Science السبت الساعة 8 والـ homework لازم يخلص قبل الحصة الجاية", "Math: 3 days a week", "English: with mom, homework after each session").
   - Understand context phrases like: "same system as Science", "after each session", "before the next lesson", "private lesson", "every other day", "finishes at 10:30 PM", "from 8 to 10 PM", "weekly".

2. PRESERVE EXACT DATA & NEVER INVENT TIMES/DAYS:
   - If a specific time is given (e.g. "6 PM", "20:00", "finishes at 10:30 PM"), preserve it accurately in 24-hour "HH:MM" format (e.g., "18:00", "20:00", "22:30").
   - If time is NOT given, DO NOT invent times. Leave startTime: "" and endTime: "".
   - If days are specified (e.g. "Sunday, Tuesday and Thursday", "السبت"), map them exactly.
   - If days are vague (e.g. "3 days a week" without specific days), pick standard spaced revision days like ["Sunday", "Tuesday", "Thursday"] and note in clarifications that default spaced days were suggested.
   - If something genuinely cannot be determined, include a polite note in "clarifications".

3. EGYPTIAN WEEK DAY-INDEX MAPPING (CRITICAL):
   The Egyptian school week runs Saturday to Friday:
   - Saturday = 0
   - Sunday = 1
   - Monday = 2
   - Tuesday = 3
   - Wednesday = 4
   - Thursday = 5
   - Friday = 6

4. UNDERSTAND DEPENDENCIES & CALCULATE REASONABLE DEADLINES:
   - If homework is "given after each session" or "due before next lesson":
     * Calculate the sensible due date: if Science is on Saturday, and homework must be finished before the next Science lesson, the due date is the day before the next session (or morning of the next session).
     * If sessions are Monday and Wednesday: homework after Monday's session is due Wednesday; homework after Wednesday's session is due next Monday.
   - Deadline dates should be valid "YYYY-MM-DD" formatted relative to current reference date (${todayIso}).
   - Set priority appropriately: "high" if strict deadline or private lesson exam, "medium" for standard weekly homework.

5. DUPLICATE PROTECTION & STABLE IMPORT IDs:
   - For every lesson, generate a deterministic "importId" like: "lesson-{subject_slug}-{days_sorted_slug}" (e.g. "lesson-science-sat", "lesson-math-sun-tue-thu").
   - For every task, generate a deterministic "importId" like: "hw-{subject_slug}-{type}" (e.g. "hw-science-weekly", "hw-english-after-session").

OUTPUT FORMAT:
You MUST return ONLY a valid JSON object without any conversational preface or markdown fences:
{
  "summary": "Brief 1-line summary of what was detected in English or Arabic based on user language",
  "clarifications": [
    "Note any assumptions made or details that were missing"
  ],
  "lessons": [
    {
      "subject": "Standard subject name (e.g. Mathematics, English, Physics, Science, Social Studies (Derasat))",
      "days": ["Saturday", "Sunday", etc.],
      "dayIndices": [0, 1, etc.],
      "startTime": "HH:MM" or "",
      "endTime": "HH:MM" or "",
      "roomOrTeacher": "Private Lesson / Mom / School / etc. if mentioned",
      "notes": "Any special notes or duration details",
      "isRecurring": true,
      "importId": "lesson-..."
    }
  ],
  "tasks": [
    {
      "title": "Clear descriptive task name (e.g. Science Homework)",
      "subject": "Related subject",
      "type": "homework",
      "recurrence": "weekly" or "daily" or "none",
      "recurrenceDays": ["Saturday"],
      "deadlineRule": "before_next_lesson" or "after_session" or "custom",
      "calculatedDueDate": "YYYY-MM-DD",
      "priority": "high" or "medium" or "low",
      "notes": "Any context details (e.g. must be finished before next lesson)",
      "dependency": "Science Lesson",
      "importId": "hw-..."
    }
  ]
}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
      'gemini-2.5-flash',
      'gemini-3.6-flash',
      'gemini-flash-latest',
      'gemini-3.8-flash',
      'gemini-pro-latest',
    ];

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });

        const prompt = `${SYSTEM_PROMPT}\n\nUSER INPUT SCHEDULE TO PARSE:\n"""\n${text.trim()}\n"""`;
        const result = await model.generateContent(prompt);
        const rawResponse = result.response.text();

        const jsonStr = extractJsonFromText(rawResponse);
        const parsed: ParsedScheduleResponse = JSON.parse(jsonStr);

        // Sanity validation of parsed object
        if (!parsed || typeof parsed !== 'object') {
          continue;
        }

        const sanitizedLessons = Array.isArray(parsed.lessons)
          ? parsed.lessons.map((l, idx) => ({
              subject: String(l.subject || 'General'),
              days: Array.isArray(l.days) ? l.days : ['Saturday'],
              dayIndices: Array.isArray(l.dayIndices) ? l.dayIndices : [0],
              startTime: String(l.startTime || ''),
              endTime: String(l.endTime || ''),
              roomOrTeacher: l.roomOrTeacher ? String(l.roomOrTeacher) : undefined,
              notes: l.notes ? String(l.notes) : undefined,
              isRecurring: Boolean(l.isRecurring !== false),
              importId: String(l.importId || `lesson-${idx}-${Date.now()}`),
            }))
          : [];

        const sanitizedTasks = Array.isArray(parsed.tasks)
          ? parsed.tasks.map((t, idx) => ({
              title: String(t.title || 'Homework'),
              subject: String(t.subject || 'General'),
              type: (t.type === 'revision' ? 'revision' : 'homework') as 'homework' | 'revision' | 'task',
              recurrence: (t.recurrence || 'weekly') as 'weekly' | 'daily' | 'none',
              recurrenceDays: Array.isArray(t.recurrenceDays) ? t.recurrenceDays : [],
              deadlineRule: t.deadlineRule ? String(t.deadlineRule) : undefined,
              calculatedDueDate: String(t.calculatedDueDate || todayIso),
              priority: (['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium') as 'high' | 'medium' | 'low',
              notes: t.notes ? String(t.notes) : undefined,
              dependency: t.dependency ? String(t.dependency) : undefined,
              importId: String(t.importId || `hw-${idx}-${Date.now()}`),
            }))
          : [];

        return NextResponse.json({
          summary: parsed.summary || `Parsed ${sanitizedLessons.length} lessons and ${sanitizedTasks.length} tasks.`,
          clarifications: Array.isArray(parsed.clarifications) ? parsed.clarifications : [],
          lessons: sanitizedLessons,
          tasks: sanitizedTasks,
        });
      } catch (err: any) {
        console.error(`Gemini schedule parse error with model ${modelName}:`, err?.message || err);
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to analyze schedule with AI');
  } catch (error: any) {
    console.error('Schedule parse route exception:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process schedule' },
      { status: 500 }
    );
  }
}
