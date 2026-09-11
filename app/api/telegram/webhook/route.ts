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

// Send reply with automatic chunking for Telegram's 4096 character limit
async function sendTelegramReply(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not configured');
    return;
  }

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

      const aiResponse = await processUserMessageWithAI({
        text: rawText,
        mediaPart: {
          mimeType: 'image/jpeg',
          data: downloaded.buffer.toString('base64'),
        },
        userProfile: profile,
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

      await sendTelegramReply(chatId, aiResponse.reply);
      return NextResponse.json({ ok: true });
    }

    // Case D: User sent Plain Text or Question or /start
    if (rawText.toLowerCase() === '/start' || rawText.toLowerCase() === 'start') {
      await sendTelegramReply(
        chatId,
        `👋 مرحباً ${profile?.full_name ? profile.full_name.split(' ')[0] : 'يا بطل'}!\n\n` +
          'أنا مساعدك الذكي في البكالوريا المصرية (TSC AI) 🤖\n\n' +
          '• اسألني أي سؤال في موادك (فيزياء، كيمياء، أحياء، رياضيات، إلخ).\n' +
          '• ابعتلي أي ملف PDF أو صورة مسألة وهشرحهالك وألخصهالك فوراً.\n' +
          '• سجل واجباتك وامتحاناتك ودرجاتك في أي وقت.\n\n' +
          'قولي، بتذاكر إيه النهاردة؟'
      );
      return NextResponse.json({ ok: true });
    }

    // Process text with AI
    const aiResponse = await processUserMessageWithAI({
      text: rawText,
      userProfile: profile,
    });

    // If an action was extracted, execute it in Supabase
    if (aiResponse.action) {
      await executeDashboardAction(supabase, userId, aiResponse.action);
    }

    // ALWAYS reply with AI!
    await sendTelegramReply(chatId, aiResponse.reply);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram webhook processing error:', err);
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}

// Helper to execute detected dashboard actions
async function executeDashboardAction(
  supabase: any,
  userId: string,
  action: { type: string | null; data?: any }
) {
  if (!action.type || !action.data) return;

  try {
    const today = new Date().toISOString().split('T')[0];

    if (action.type === 'assignment') {
      await supabase.from('assignments').insert({
        user_id: userId,
        title: action.data.title || 'Homework',
        subject: action.data.subject || 'General',
        due_date: action.data.date || today,
        priority: 'medium',
        is_completed: false,
      });
    } else if (action.type === 'exam') {
      await supabase.from('exams').insert({
        user_id: userId,
        subject: action.data.subject || 'General',
        exam_date: action.data.date || today,
        notes: action.data.title || undefined,
      });
    } else if (action.type === 'grade') {
      const score = Number(action.data.score) || 0;
      const maxScore = Number(action.data.max_score) || 60;
      await supabase.from('grades').insert({
        user_id: userId,
        subject: action.data.subject || 'General',
        title: action.data.title || `Telegram Log (${today})`,
        score,
        max_score: maxScore,
        weight: 1.0,
        date: today,
      });
    } else if (action.type === 'habit') {
      const habitValue = Number(action.data.value) || 1;
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
    console.error('Error executing dashboard action:', err);
  }
}

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const listData = await listRes.json();
    return NextResponse.json({
      status: 'online',
      models: listData.models ? listData.models.map((m: any) => m.name) : listData,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'online',
      error: err.message,
    });
  }
}
