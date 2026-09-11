import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { processUserMessageWithAI } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();

    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // 2. Record User message in chat_messages
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'user',
      source: 'web',
      content: message.trim(),
      media_type: 'text',
    });

    // 3. Fetch recent notes / study context
    const { data: recentNotes } = await supabase
      .from('notes')
      .select('content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(2);

    const recentContext = recentNotes?.map((n: any) => n.content).join('\n---\n');

    // 4. Process with Gemini 3.6 Flash
    const aiResponse = await processUserMessageWithAI({
      text: message.trim(),
      userProfile: profile,
      recentContext: recentContext || undefined,
    });

    // 5. Execute any dashboard action
    if (aiResponse.action) {
      await executeAction(supabase, userId, aiResponse.action);
    }

    // 6. Record Assistant reply in chat_messages
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      source: 'web',
      content: aiResponse.reply,
      media_type: 'text',
    });

    return NextResponse.json({
      reply: aiResponse.reply,
      action: aiResponse.action,
    });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}

async function executeAction(supabase: any, userId: string, action: any) {
  if (!action || !action.type) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const data = action.data || action;

    if (action.type === 'assignment') {
      await supabase.from('assignments').insert({
        user_id: userId,
        title: data.title || 'Homework',
        subject: data.subject || 'General',
        due_date: data.date || today,
        priority: 'medium',
        is_completed: false,
      });
    } else if (action.type === 'exam') {
      await supabase.from('exams').insert({
        user_id: userId,
        subject: data.subject || 'General',
        exam_date: data.date || today,
        notes: data.title || undefined,
      });
    } else if (action.type === 'grade') {
      const score = Number(data.score) || 0;
      const maxScore = Number(data.max_score) || 60;
      await supabase.from('grades').insert({
        user_id: userId,
        subject: data.subject || 'General',
        title: data.title || `Web AI Log (${today})`,
        score,
        max_score: maxScore,
        weight: 1.0,
        date: today,
      });
    } else if (action.type === 'habit') {
      const habitValue = Number(data.value) || 1;
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
    }
  } catch (err) {
    console.error('Error executing dashboard action in /api/chat:', err);
  }
}
