import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { classifyTelegramMessage } from '@/lib/gemini';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
}

// Helper to send message back to Telegram user
async function sendTelegramReply(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not configured');
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
  } catch (err) {
    console.error('Failed to send Telegram reply:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = (await req.json()) as TelegramUpdate;
    const message = update.message;

    if (!message || !message.text) {
      return NextResponse.json({ ok: true, note: 'No text message' });
    }

    const chatId = message.chat.id;
    const rawText = message.text.trim();

    // Check if Supabase admin credentials exist
    let supabase;
    try {
      supabase = getSupabaseAdminClient();
    } catch {
      await sendTelegramReply(
        chatId,
        '⚠️ Bot configuration error: Supabase service role key is not configured on the server yet.'
      );
      return NextResponse.json({ ok: true });
    }

    // 1. Check if this chat_id is already linked to a user
    const { data: existingLink } = await supabase
      .from('telegram_links')
      .select('*')
      .eq('chat_id', chatId)
      .eq('is_linked', true)
      .single();

    // 2. Handle linking flow if message is a link code or /start <code>
    const linkMatch = rawText.match(/^\/?(start\s+)?([A-Za-z0-9]{6})$/i);

    if (linkMatch) {
      const code = linkMatch[2].toUpperCase();

      // Look up code in telegram_links
      const { data: linkRecord, error: linkErr } = await supabase
        .from('telegram_links')
        .select('*')
        .eq('link_code', code)
        .eq('is_linked', false)
        .single();

      if (linkErr || !linkRecord) {
        await sendTelegramReply(
          chatId,
          '❌ Invalid or expired sync code. Please generate a new 6-character code from your Thanaweya Dashboard Settings page.'
        );
        return NextResponse.json({ ok: true });
      }

      // Update link record with this chat_id
      await supabase
        .from('telegram_links')
        .update({
          chat_id: chatId,
          is_linked: true,
          linked_at: new Date().toISOString(),
        })
        .eq('id', linkRecord.id);

      await sendTelegramReply(
        chatId,
        '🎉 Successfully linked to your Thanaweya Dashboard!\n\nYou can now send me anything you want to remember:\n• Assignments: "واجب فيزياء صفحة 30 الإثنين"\n• Exams: "امتحان كيمياء باب أول يوم 20 مارس"\n• Grades: "جبت 56 من 60 في امتحان العربي"\n• Habits: "نمت 7 ساعات"\n• Notes: "ملاحظة: قانون لنز يعاكس التغير في الفيض"'
      );
      return NextResponse.json({ ok: true });
    }

    // If chat_id is not linked yet
    if (!existingLink) {
      await sendTelegramReply(
        chatId,
        '👋 Welcome to Thanaweya Memory Bot!\n\nYour Telegram account is not linked to any Thanaweya Dashboard yet.\n\n1. Open your Thanaweya Dashboard\n2. Go to Settings -> Telegram Bot\n3. Click "Generate Link Code"\n4. Send that 6-digit code here to link your account!'
      );
      return NextResponse.json({ ok: true });
    }

    const userId = existingLink.user_id;

    // 3. User is linked: Classify message with Gemini API
    const classification = await classifyTelegramMessage(rawText);
    const { type, confidence, data } = classification;

    if (type === 'assignment') {
      const title = data.title || rawText;
      const subject = data.subject || 'General';
      const dueDate = data.due_date || new Date().toISOString().split('T')[0];

      await supabase.from('assignments').insert({
        user_id: userId,
        title,
        subject,
        due_date: dueDate,
        priority: 'medium',
        is_completed: false,
      });

      await sendTelegramReply(
        chatId,
        `✅ Saved Assignment: ${title} (${subject}) - Due: ${dueDate}`
      );
    } else if (type === 'exam') {
      const subject = data.subject || 'General';
      const examDate = data.date || new Date().toISOString().split('T')[0];

      await supabase.from('exams').insert({
        user_id: userId,
        subject,
        exam_date: examDate,
        notes: rawText,
      });

      await sendTelegramReply(
        chatId,
        `📅 Saved Exam: ${subject} on ${examDate}!`
      );
    } else if (type === 'grade-info') {
      const subject = data.subject || 'General';
      const score = data.score ?? 0;
      const maxScore = data.max_score || 60;

      await supabase.from('grades').insert({
        user_id: userId,
        subject,
        title: `Logged via Telegram (${new Date().toLocaleDateString()})`,
        score,
        max_score: maxScore,
        weight: 1.0,
        date: new Date().toISOString().split('T')[0],
      });

      const pct = ((score / maxScore) * 100).toFixed(1);
      await sendTelegramReply(
        chatId,
        `📊 Saved Grade: ${subject} score ${score}/${maxScore} (${pct}%)`
      );
    } else if (type === 'habit') {
      const habitName = data.habit_name || 'Daily Habit';
      const value = data.value || 1;

      // Find or create habit
      const { data: existingHabits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId);

      const targetHabit = existingHabits?.find((h) =>
        h.name.toLowerCase().includes(habitName.toLowerCase())
      ) || existingHabits?.[0];

      if (targetHabit) {
        await supabase.from('habit_logs').upsert(
          {
            user_id: userId,
            habit_id: targetHabit.id,
            date: new Date().toISOString().split('T')[0],
            value,
            completed: true,
          },
          { onConflict: 'user_id,habit_id,date' }
        );

        await sendTelegramReply(
          chatId,
          `⚡ Logged Habit: ${targetHabit.name} (${value} ${targetHabit.unit})`
        );
      } else {
        // Save as note if no habit matches
        await supabase.from('notes').insert({
          user_id: userId,
          content: rawText,
          tags: ['Telegram', 'Habit'],
        });
        await sendTelegramReply(chatId, `📝 Saved as Note: "${rawText}"`);
      }
    } else {
      // General note or low confidence
      await supabase.from('notes').insert({
        user_id: userId,
        content: data.text || rawText,
        tags: ['Telegram'],
      });

      if (confidence === 'low') {
        await sendTelegramReply(
          chatId,
          `📝 Couldn't detect a specific deadline or grade, so I saved it as a Quick Note: "${rawText}"`
        );
      } else {
        await sendTelegramReply(chatId, `📝 Saved Quick Note: "${rawText}"`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook error:', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Thanaweya Dashboard Telegram Webhook Route',
    instructions: 'Send POST requests from Telegram Webhook to this endpoint.',
  });
}
