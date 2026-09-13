import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { processUserMessageWithAI } from '@/lib/gemini';

interface TelegramPhoto {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramDocument {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

interface TelegramVoice {
  file_id: string;
  mime_type?: string;
  duration?: number;
  file_size?: number;
}

interface TelegramAudio {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  duration?: number;
  file_size?: number;
}

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
    caption?: string;
    document?: TelegramDocument;
    photo?: TelegramPhoto[];
    voice?: TelegramVoice;
    audio?: TelegramAudio;
  };
}

// Send typing / upload status to Telegram
async function sendChatAction(chatId: number, action: 'typing' | 'upload_document' = 'typing') {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
    });
  } catch {
    // Ignore status errors
  }
}

// Clean markdown headers for Telegram plain text display
function formatForTelegram(text: string): string {
  if (!text) return '';
  return text
    // Replace markdown headers with clean bullet/bold lines
    .replace(/^#{1,4}\s+(.+)$/gm, '• $1')
    .trim();
}

// Send reply with automatic chunking for Telegram's 4096 character limit
async function sendTelegramReply(chatId: number, rawText: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not configured');
    return;
  }

  const text = formatForTelegram(rawText);
  const maxChunk = 4000;
  for (let i = 0; i < text.length; i += maxChunk) {
    const chunk = text.slice(i, i + maxChunk);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: chunk,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        console.error('Telegram sendMessage error:', data);
      }
    } catch (err) {
      console.error('Failed to send Telegram reply:', err);
    }
  }
}

// Download file from Telegram using Bot API
async function downloadTelegramFile(fileId: string): Promise<{ buffer: Buffer; filePath: string } | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  try {
    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const infoData = await infoRes.json();
    if (!infoData.ok || !infoData.result?.file_path) {
      console.error('Failed to getFile from Telegram:', infoData);
      return null;
    }

    const fileUrl = `https://api.telegram.org/file/bot${token}/${infoData.result.file_path}`;
    const fileRes = await fetch(fileUrl);
    const arrayBuffer = await fileRes.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      filePath: infoData.result.file_path,
    };
  } catch (err) {
    console.error('Error downloading Telegram file:', err);
    return null;
  }
}

// Record chat message to Supabase chat_messages table (for live Web Dashboard sync)
async function recordChatMessage(
  supabase: any,
  params: {
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    source?: 'telegram' | 'web' | 'whatsapp';
    mediaType?: 'text' | 'document' | 'photo' | 'voice' | 'audio';
    mediaName?: string;
  }
) {
  try {
    await supabase.from('chat_messages').insert({
      user_id: params.userId,
      role: params.role,
      source: params.source || 'telegram',
      content: params.content,
      media_type: params.mediaType || 'text',
      media_name: params.mediaName || null,
    });
  } catch (err) {
    console.error('Error inserting chat message:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = (await req.json()) as TelegramUpdate;
    const message = update.message;

    if (!message) {
      return NextResponse.json({ ok: true, note: 'No message in update' });
    }

    const chatId = message.chat.id;
    const rawText = (message.text || message.caption || '').trim();

    // Check Supabase admin client
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

    // 1. Check if this chat_id is already linked to a student
    const { data: existingLink } = await supabase
      .from('telegram_links')
      .select('*')
      .eq('chat_id', chatId)
      .eq('is_linked', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. If NOT linked: Check if this message is a sync code to link account
    if (!existingLink) {
      const linkMatch = rawText.match(/^\/?(start[\s=_]+)?([A-Za-z0-9]{6})$/i);

      if (linkMatch) {
        const code = linkMatch[2].toUpperCase();

        const { data: linkRecord, error: linkErr } = await supabase
          .from('telegram_links')
          .select('*')
          .eq('link_code', code)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (linkErr || !linkRecord) {
          await sendTelegramReply(
            chatId,
            '❌ Invalid or expired sync code.\n\nPlease generate a new 6-character code in your Baccalaureate Dashboard Settings page (https://tsctasker.vercel.app/dashboard/settings).'
          );
          return NextResponse.json({ ok: true });
        }

        // Link this account
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
          '🎉 Successfully linked to your Baccalaureate Dashboard (البكالوريا المصرية)!\n\n' +
            '🤖 I am your personal AI Study Assistant & Tutor!\n\n' +
            'Here is what you can do anytime:\n' +
            '📚 Send any PDF or lesson (e.g. "Ch 1 L 1_2027.pdf") to get summaries & key exam laws!\n' +
            '📸 Send photos of homework or exam questions to get step-by-step solutions!\n' +
            '💡 Ask me any academic question in Arabic or English!\n' +
            '✅ Log homework: "واجب فيزياء صفحة 30 الإثنين"\n' +
            '📅 Log exams: "امتحان كيمياء 20 مارس"\n' +
            '📊 Log grades: "جبت 56 من 60 في العربي"\n' +
            '⚡ Log habits: "نمت 7.5 ساعات"\n\n' +
            'Go ahead, send me anything now!'
        );
        return NextResponse.json({ ok: true });
      }

      // Unlinked greeting
      await sendTelegramReply(
        chatId,
        '👋 Welcome to the Egyptian Baccalaureate AI Assistant!\n\n' +
          'To connect your account:\n' +
          '1. Open your Dashboard: https://tsctasker.vercel.app\n' +
          '2. Go to Settings -> Telegram Bot\n' +
          '3. Click "Generate Code"\n' +
          '4. Send `/start YOUR_CODE` here to link your account!'
      );
      return NextResponse.json({ ok: true });
    }

    // 3. User IS LINKED: Treat everything with AI!
    const userId = existingLink.user_id;

    // Fetch student profile for personalized AI interaction
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // Trigger typing action
    await sendChatAction(chatId, message.document ? 'upload_document' : 'typing');

    // Case A: User sent a Document (e.g. PDF file like "Ch 1 L 1_2027.pdf")
    if (message.document) {
      const doc = message.document;
      const downloaded = await downloadTelegramFile(doc.file_id);

      if (!downloaded) {
        await sendTelegramReply(chatId, '⚠️ Could not download file from Telegram. Please try sending it again.');
        return NextResponse.json({ ok: true });
      }

      await recordChatMessage(supabase, {
        userId,
        role: 'user',
        content: rawText ? `${rawText}\n[Document: ${doc.file_name || 'Study PDF'}]` : `[Document: ${doc.file_name || 'Study PDF'}]`,
        mediaType: 'document',
        mediaName: doc.file_name,
      });

      const mimeType = doc.mime_type || 'application/pdf';
      const aiResponse = await processUserMessageWithAI({
        text: rawText,
        fileName: doc.file_name || 'Study Document',
        mediaPart: {
          mimeType,
          data: downloaded.buffer.toString('base64'),
        },
        userProfile: profile,
      });

      // Save as note in user's dashboard
      await supabase.from('notes').insert({
        user_id: userId,
        content: `📁 ${doc.file_name || 'Document'}\n\n${aiResponse.reply}`,
        tags: ['Document', 'PDF', 'AI-Summary'],
      });

      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: aiResponse.reply,
      });

      await sendTelegramReply(chatId, aiResponse.reply);
      return NextResponse.json({ ok: true });
    }

    // Case B: User sent a Photo / Image (textbook question, exam problem, diagram)
    if (message.photo && message.photo.length > 0) {
      const largestPhoto = message.photo[message.photo.length - 1];
      const downloaded = await downloadTelegramFile(largestPhoto.file_id);

      if (!downloaded) {
        await sendTelegramReply(chatId, '⚠️ Could not download image. Please try again.');
        return NextResponse.json({ ok: true });
      }

      await recordChatMessage(supabase, {
        userId,
        role: 'user',
        content: rawText ? `${rawText}\n[Photo/Diagram attached]` : `[Photo/Diagram attached]`,
        mediaType: 'photo',
      });

      const aiResponse = await processUserMessageWithAI({
        text: rawText,
        mediaPart: {
          mimeType: 'image/jpeg',
          data: downloaded.buffer.toString('base64'),
        },
        userProfile: profile,
      });

      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: aiResponse.reply,
      });

      await sendTelegramReply(chatId, aiResponse.reply);
      return NextResponse.json({ ok: true });
    }

    // Case C: User sent a Voice Note or Audio
    if (message.voice || message.audio) {
      const audioTarget = message.voice || message.audio;
      const downloaded = await downloadTelegramFile(audioTarget!.file_id);

      if (!downloaded) {
        await sendTelegramReply(chatId, '⚠️ Could not process voice note. Please try again.');
        return NextResponse.json({ ok: true });
      }

      await recordChatMessage(supabase, {
        userId,
        role: 'user',
        content: rawText ? `${rawText}\n[Voice message]` : `[Voice message]`,
        mediaType: 'voice',
      });

      const mimeType = audioTarget!.mime_type || 'audio/ogg';
      const aiResponse = await processUserMessageWithAI({
        text: rawText,
        mediaPart: {
          mimeType,
          data: downloaded.buffer.toString('base64'),
        },
        userProfile: profile,
      });

      // If voice message asked to log something
      if (aiResponse.action) {
        await executeDashboardAction(supabase, userId, aiResponse.action);
      }

      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: aiResponse.reply,
      });

      await sendTelegramReply(chatId, aiResponse.reply);
      return NextResponse.json({ ok: true });
    }

    // Case D: User sent Plain Text or Question or /start
    if (rawText.toLowerCase() === '/start' || rawText.toLowerCase() === 'start') {
      const greeting =
        `👋 مرحباً ${profile?.full_name ? profile.full_name.split(' ')[0] : 'يا بطل'}!\n\n` +
        'أنا مساعدك الذكي في البكالوريا المصرية (TSC AI) 🤖\n\n' +
        '• اسألني أي سؤال في موادك (فيزياء، كيمياء، أحياء، رياضيات، إلخ).\n' +
        '• ابعتلي أي ملف PDF أو صورة مسألة وهشرحهالك وألخصهالك فوراً.\n' +
        '• سجل واجباتك وامتحاناتك ودرجاتك في أي وقت.\n\n' +
        'قولي، بتذاكر إيه النهاردة؟';

      await recordChatMessage(supabase, {
        userId,
        role: 'user',
        content: rawText,
      });

      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: greeting,
      });

      await sendTelegramReply(chatId, greeting);
      return NextResponse.json({ ok: true });
    }

    // Record user incoming message
    await recordChatMessage(supabase, {
      userId,
      role: 'user',
      content: rawText,
    });

    // 1. Fetch recent messages in the last 3 minutes for multi-message combining
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const [recentHistoryRes, timetableRes, pendingTasksRes, recentNotesRes] = await Promise.all([
      supabase
        .from('chat_messages')
        .select('content, created_at')
        .eq('user_id', userId)
        .eq('role', 'user')
        .gte('created_at', threeMinAgo)
        .order('created_at', { ascending: true })
        .limit(4),
      supabase.from('timetable').select('*').eq('user_id', userId),
      supabase.from('assignments').select('*').eq('user_id', userId).eq('is_completed', false).limit(10),
      supabase.from('notes').select('content').eq('user_id', userId).order('created_at', { ascending: false }).limit(2),
    ]);

    const recentHistory = recentHistoryRes.data?.map((m: any) => ({ text: m.content, time: m.created_at })) || [];
    const timetableSlots = timetableRes.data || [];
    const pendingTasks = pendingTasksRes.data || [];

    // Build schedule context string so AI can answer schedule queries
    const scheduleContext = `Scheduled Classes: ${timetableSlots.map((s: any) => `Day ${s.day_of_week}: ${s.subject} (${s.start_time}-${s.end_time})`).join(', ') || 'No classes registered yet'}\nPending Homework: ${pendingTasks.map((t: any) => `${t.title} (${t.subject}, Due: ${t.due_date})`).join(', ') || 'None'}`;
    const recentNotes = recentNotesRes.data?.map((n: any) => n.content).join('\n---\n');

    // Process text with AI
    const aiResponse = await processUserMessageWithAI({
      text: rawText,
      userProfile: profile,
      scheduleContext,
      recentMessages: recentHistory,
      recentContext: recentNotes || undefined,
    });

    // If an actionable task was extracted with sufficient confidence, execute and log it
    let actionFeedback = '';
    if (aiResponse.action && (aiResponse.confidence ?? 1.0) >= 0.7) {
      actionFeedback = await executeDashboardAction(supabase, userId, aiResponse.action, 'telegram');
    }

    let finalReply = aiResponse.reply;
    if (actionFeedback) {
      finalReply += `\n\n${actionFeedback}`;
    }

    // Record AI assistant reply for dashboard sync
    await recordChatMessage(supabase, {
      userId,
      role: 'assistant',
      content: finalReply,
    });

    // ALWAYS reply with AI!
    await sendTelegramReply(chatId, finalReply);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook processing error:', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

// Helper to execute detected dashboard actions and log to ai_activity_logs with 1-click Undo state
async function executeDashboardAction(
  supabase: any,
  userId: string,
  action: any,
  source: 'telegram' | 'whatsapp' = 'telegram'
): Promise<string> {
  if (!action || !action.type) return '';

  try {
    const today = new Date().toISOString().split('T')[0];
    const data = action.data || action;

    // A. LESSON CHANGE / RESCHEDULE
    if (action.type === 'lesson_change') {
      const subject = data.subject || 'General';
      const dayIndex = typeof data.dayIndex === 'number' ? data.dayIndex : 0;
      const startTime = data.startTime || '08:00';
      const endTime = data.endTime || '09:30';

      // Check existing slot
      const { data: existingSlots } = await supabase
        .from('timetable')
        .select('*')
        .eq('user_id', userId)
        .ilike('subject', subject);

      const targetSlot = existingSlots?.[0];

      if (targetSlot) {
        // Update existing slot
        await supabase
          .from('timetable')
          .update({
            day_of_week: dayIndex,
            start_time: startTime,
            end_time: endTime,
          })
          .eq('id', targetSlot.id);

        await supabase.from('ai_activity_logs').insert({
          user_id: userId,
          action_type: 'UPDATE_LESSON',
          title: `تعديل موعد حصة ${subject}`,
          description: `تم نقل الموعد ليوم ${data.dayName || dayIndex} الساعة ${startTime}`,
          source,
          target_id: targetSlot.id,
          target_table: 'timetable',
          previous_state: targetSlot,
        });

        return `🔄 تم تعديل موعد حصة ${subject} في جدولك!`;
      } else {
        // Insert new slot
        const { data: newSlot } = await supabase
          .from('timetable')
          .insert({
            user_id: userId,
            subject,
            day_of_week: dayIndex,
            start_time: startTime,
            end_time: endTime,
          })
          .select('*')
          .single();

        await supabase.from('ai_activity_logs').insert({
          user_id: userId,
          action_type: 'UPDATE_LESSON',
          title: `إضافة حصة ${subject}`,
          description: `يوم ${data.dayName || dayIndex} الساعة ${startTime}`,
          source,
          target_id: newSlot?.id,
          target_table: 'timetable',
          previous_state: null,
        });

        return `✓ تم إضافة حصة ${subject} لجدولك!`;
      }
    }

    // B. LESSON CANCELLED
    if (action.type === 'lesson_cancel') {
      const subject = data.subject || 'General';
      const { data: existingSlots } = await supabase
        .from('timetable')
        .select('*')
        .eq('user_id', userId)
        .ilike('subject', subject);

      const targetSlot = existingSlots?.[0];
      if (targetSlot) {
        await supabase.from('timetable').delete().eq('id', targetSlot.id);

        await supabase.from('ai_activity_logs').insert({
          user_id: userId,
          action_type: 'CANCEL_LESSON',
          title: `إلغاء حصة ${subject}`,
          description: `تم حذف الحصة من الجدول بناءً على التنبيه`,
          source,
          target_id: targetSlot.id,
          target_table: 'timetable',
          previous_state: targetSlot,
        });

        return `✓ تم تسجيل إلغاء حصة ${subject} وحذفها من الجدول.`;
      }
      return '';
    }

    // C. HOMEWORK / ASSIGNMENT
    if (action.type === 'assignment') {
      const title = data.title || 'Homework';
      const subject = data.subject || 'General';
      const dueDate = data.date || today;

      // Duplicate protection: check if same title & subject exists
      const { data: existingA } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', title)
        .ilike('subject', subject)
        .maybeSingle();

      if (existingA) {
        // Update due date
        await supabase
          .from('assignments')
          .update({ due_date: dueDate })
          .eq('id', existingA.id);

        return `🔄 تم تحديث موعد تسليم ${title} إلى ${dueDate}.`;
      }

      const { data: newAssignment } = await supabase
        .from('assignments')
        .insert({
          user_id: userId,
          title,
          subject,
          due_date: dueDate,
          priority: data.priority || 'medium',
          is_completed: false,
        })
        .select('*')
        .single();

      await supabase.from('ai_activity_logs').insert({
        user_id: userId,
        action_type: 'CREATE_TASK',
        title: `إضافة واجب: ${title}`,
        description: `المادة: ${subject} • موعد التسليم: ${dueDate}`,
        source,
        target_id: newAssignment?.id,
        target_table: 'assignments',
        previous_state: null,
      });

      return `✓ تم تسجيل الواجب في جدولك (تسليم: ${dueDate}).`;
    }

    // D. EXAM
    if (action.type === 'exam') {
      const subject = data.subject || 'General';
      const examDate = data.date || today;

      const { data: newExam } = await supabase
        .from('exams')
        .insert({
          user_id: userId,
          subject,
          exam_date: examDate,
          notes: data.title || undefined,
        })
        .select('*')
        .single();

      await supabase.from('ai_activity_logs').insert({
        user_id: userId,
        action_type: 'CREATE_TASK',
        title: `تسجيل امتحان ${subject}`,
        description: `الموعد: ${examDate}`,
        source,
        target_id: newExam?.id,
        target_table: 'exams',
        previous_state: null,
      });

      return `📅 تم تسجيل امتحان ${subject} يوم ${examDate}.`;
    }

    // E. GRADE
    if (action.type === 'grade') {
      const score = Number(data.score) || 0;
      const maxScore = Number(data.max_score) || 60;
      await supabase.from('grades').insert({
        user_id: userId,
        subject: data.subject || 'General',
        title: data.title || `Bot Log (${today})`,
        score,
        max_score: maxScore,
        weight: 1.0,
        date: today,
      });
      return `📊 تم تسجيل الدرجة (${score}/${maxScore}).`;
    }

    // F. HABIT
    if (action.type === 'habit') {
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
      return `⚡ تم تسجيل العادة اليومية.`;
    }
  } catch (err) {
    console.error('Error executing dashboard action:', err);
  }
  return '';
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'No key' });

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const res = await model.generateContent('Hello, are you online? Respond in one sentence.');
    return NextResponse.json({
      status: 'online',
      testResponse: res.response.text(),
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      message: err.message,
      stack: err.stack,
    });
  }
}
