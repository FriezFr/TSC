import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { processUserMessageWithAI } from '@/lib/gemini';
import { executeBotActions, buildFullStudentContext } from '@/lib/bot-actions';

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

    // 1. Fetch user profile, full student database context, and insert user message in parallel
    const [profileRes, databaseContext] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      buildFullStudentContext(supabase, userId),
      supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'user',
        source: 'web',
        content: message.trim(),
        media_type: 'text',
      }),
    ]);

    const profile = profileRes.data;

    const hasArabic = /[\u0600-\u06FF]/.test(message);
    const isEnglish = !hasArabic && /[a-zA-Z]/.test(message);

    // 2. Process with Gemini
    const aiResponse = await processUserMessageWithAI({
      text: message.trim(),
      languagePreference: isEnglish ? 'en' : 'ar',
      userProfile: profile,
      databaseContext,
    });

    // 3. Execute detected actions using unified engine
    let actionFeedback = '';
    const actionsToRun = aiResponse.actions?.length ? aiResponse.actions : aiResponse.action;
    if (actionsToRun) {
      const actionResult = await executeBotActions(supabase, userId, actionsToRun, {
        source: 'web',
        isEnglish,
      });
      actionFeedback = actionResult.combinedFeedback;
    }

    let finalReply = aiResponse.reply;
    if (actionFeedback) {
      finalReply += `\n\n${actionFeedback}`;
    }

    // 4. Record Assistant reply
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      source: 'web',
      content: finalReply,
      media_type: 'text',
    });

    return NextResponse.json({
      reply: finalReply,
      action: aiResponse.action,
      actions: aiResponse.actions,
    });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
