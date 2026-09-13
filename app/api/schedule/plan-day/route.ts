import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DailyPlanResponse, TimetableSlot, Assignment, Exam } from '@/lib/types';
import { loadUserPreferences } from '@/lib/scheduling/preferences';

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return match && match[1] ? match[1].trim() : text.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { userId, date } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const targetJsDate = new Date(targetDate);
    const dayOfWeek = targetJsDate.getDay();
    // Egyptian day of week: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
    const mappedDayIndex = dayOfWeek === 6 ? 0 : dayOfWeek + 1;

    const supabase = getSupabaseAdminClient();

    // Fetch user timetable, pending assignments, upcoming exams, and preferences
    const [timetableRes, assignmentsRes, examsRes, profileRes] = await Promise.all([
      supabase.from('timetable').select('*').eq('user_id', userId).eq('day_of_week', mappedDayIndex),
      supabase.from('assignments').select('*').eq('user_id', userId).eq('is_completed', false),
      supabase.from('exams').select('*').eq('user_id', userId).gte('exam_date', targetDate).order('exam_date', { ascending: true }).limit(3),
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    ]);

    const dayClasses: TimetableSlot[] = timetableRes.data || [];
    const pendingAssignments: Assignment[] = assignmentsRes.data || [];
    const upcomingExams: Exam[] = examsRes.data || [];
    const profile = profileRes.data;
    const preferences = await loadUserPreferences(supabase, userId);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return a realistic mock plan if no key
      return NextResponse.json(generateFallbackPlan(targetDate, dayClasses, pendingAssignments));
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `You are the AI Daily Study Planner for TTASKER (Egyptian Baccalaureate).
Target Date: ${targetDate} (Day index: ${mappedDayIndex}).
Student: ${profile?.full_name || 'Student'} (Track: ${profile?.study_division || 'General'}).

STUDENT COMMITMENTS TODAY:
- Scheduled Lessons Today: ${dayClasses.length === 0 ? 'None (No fixed classes today)' : dayClasses.map((c) => `${c.subject} (${c.start_time} - ${c.end_time})`).join(', ')}
- Pending Homework & Tasks: ${pendingAssignments.length === 0 ? 'None' : pendingAssignments.map((a) => `${a.title} (${a.subject}, Due: ${a.due_date}, Priority: ${a.priority})`).join(', ')}
- Upcoming Exams: ${upcomingExams.length === 0 ? 'None within next 2 weeks' : upcomingExams.map((e) => `${e.subject} on ${e.exam_date}`).join(', ')}
- Learned Preferences: Preferred hours: ${preferences.preferredStudyTimes?.join(', ') || '16:00-22:00'}. Avoid times: ${preferences.avoidTimes?.join(', ') || '14:00-15:30'}.

RULES FOR A REALISTIC DAILY PLAN:
1. NEVER schedule study sessions during the student's scheduled lessons.
2. NEVER fill every minute of the day. Keep reasonable 15-30 minute breaks between sessions.
3. Keep total daily study hours realistic (between 2.5 to 5 hours max for high school).
4. Prioritize tasks due today/tomorrow and upcoming exam revision.
5. All titles and descriptions should be in clear, inspiring Egyptian Arabic.

Return JSON in this EXACT structure:
{
  "date": "${targetDate}",
  "summary": "ملخص خطة اليوم في سطر مشجع بالعامية المصرية",
  "blocks": [
    {
      "id": "block-1",
      "startTime": "16:00",
      "endTime": "16:45",
      "durationMinutes": 45,
      "title": "مذاكرة فيزياء وحل الواجب",
      "subject": "Physics",
      "type": "homework",
      "isBreak": false,
      "notes": "التركيز على المسائل أولاً"
    },
    {
      "id": "block-2",
      "startTime": "16:45",
      "endTime": "17:00",
      "durationMinutes": 15,
      "title": "استراحة سريعة ☕",
      "type": "break",
      "isBreak": true
    }
  ],
  "recommendations": [
    "نصيحة عملية لتنفيذ الخطة بدون ضغط"
  ]
}`;

    const result = await model.generateContent(prompt);
    const jsonStr = extractJson(result.response.text());
    const parsed: DailyPlanResponse = JSON.parse(jsonStr);

    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error('Plan day API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate daily plan' },
      { status: 500 }
    );
  }
}

function generateFallbackPlan(date: string, classes: TimetableSlot[], tasks: Assignment[]): DailyPlanResponse {
  const blocks: any[] = [];
  let currentHour = 16;

  // Add scheduled classes first
  for (const c of classes) {
    blocks.push({
      id: `lesson-${c.id}`,
      startTime: c.start_time,
      endTime: c.end_time,
      durationMinutes: 90,
      title: `حصة ${c.subject}`,
      subject: c.subject,
      type: 'lesson',
      isBreak: false,
    });
  }

  // Add 1 or 2 task study blocks
  for (let i = 0; i < Math.min(tasks.length, 2); i++) {
    const t = tasks[i];
    const startStr = `${currentHour}:00`;
    const endStr = `${currentHour}:45`;
    blocks.push({
      id: `task-${t.id}`,
      startTime: startStr,
      endTime: endStr,
      durationMinutes: 45,
      title: `${t.title} (${t.subject})`,
      subject: t.subject,
      type: 'homework',
      isBreak: false,
      notes: 'إنجاز المطلوب للمادة',
    });
    currentHour++;
  }

  // Add rest break
  blocks.push({
    id: `break-1`,
    startTime: `${currentHour}:00`,
    endTime: `${currentHour}:30`,
    durationMinutes: 30,
    title: 'وقت راحة وترفيه 🎮',
    type: 'break',
    isBreak: true,
  });

  return {
    date,
    summary: 'خطة دراسية متوازنة توزع واجباتك اليوم بدون إجهاد.',
    blocks,
    recommendations: ['ابدأ بالمادة اللي محتاجة تركيز أكبر وأنت نشيط.'],
  };
}
