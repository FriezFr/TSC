import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { processUserMessageWithAI } from '@/lib/gemini';
import { executeBotActions, buildFullStudentContext } from '@/lib/bot-actions';

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

// Clean text for Telegram: strip all asterisks and markdown headers so text is pure, normal human font
function formatForTelegram(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1') // strip bold/italic asterisks completely
    .replace(/\*/g, '')                     // strip residual asterisks
    .replace(/^#{1,4}\s+(.+)$/gm, '• $1')   // clean markdown headers
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
            '❌ Invalid or expired sync code.\n\nPlease generate a new 6-character code in your TaskerBot Settings page (https://taskerbot.vercel.app/dashboard/settings).'
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
          'حبيبي يا إسماعيل يا بطل! أنا TaskerBot / TSC AI معاك ومصحصحلك جداً أهو. 👋\n\n' +
            'قولي بقى يا بشمهندس، أخبار المذاكرة والتحضير إيه؟ بما إننا في مسار الهندسة والحاسبات وهدفنا الـ 99% إن شاء الله، فإحنا هدفنا فوق وحلمك قريب جداً، بس محتاجين نلعبها صح ونكون دايماً سابقين بأقوى أداء! 🎯🚀\n\n' +
            'You can also talk to me in English or Arabic anytime!\n' +
            'تحب نعمل إيه النهاردة؟\n' +
            '- تشرحلي حاجة واقفة معاك في الرياضة أو الفيزياء أو الحاسب ونظبطها؟\n' +
            '- تبعتلي صورة سؤال أو مسألة رمة نحلها سوا خطوة بخطوة؟\n' +
            '- تبعتلي ملف PDF لدرس أو ملخص نقراه ونطلّع أفكار الامتحانات منه؟\n' +
            '- ولا حابب نظبط جدول مذاكرة ونرتب أهداف الأسبوع دا؟\n\n' +
            'سماعتي معاك يا حطاب، قول لي حابب نبدأ بإيه! 😎'
        );
        return NextResponse.json({ ok: true });
      }

      // Unlinked greeting
      await sendTelegramReply(
        chatId,
        '👋 Welcome to TaskerBot / TSC AI Assistant!\n\n' +
          'To connect your account:\n' +
          '1. Open your Dashboard: https://taskerbot.vercel.app\n' +
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

    // Language detection
    const explicitEnglish =
      /^\/?(en|english)\b/i.test(rawText) ||
      /\b(speak|talk|reply|switch to|switch)\s+(in\s+)?english\b/i.test(rawText);
    const hasArabic = /[\u0600-\u06FF]/.test(rawText);
    const isEnglish = explicitEnglish || (!hasArabic && /[a-zA-Z]{3,}/.test(rawText));

    // Fetch full active database context (timetable, assignments, exams, flashcard decks, notes)
    const databaseContext = await buildFullStudentContext(supabase, userId);

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
        languagePreference: isEnglish ? 'en' : 'ar',
        userProfile: profile,
        databaseContext,
      });

      // Execute detected actions (e.g. create quiz/flashcards, add assignment)
      let actionFeedback = '';
      const actionsToRun = aiResponse.actions?.length ? aiResponse.actions : aiResponse.action;
      if (actionsToRun) {
        const actionResult = await executeBotActions(supabase, userId, actionsToRun, {
          source: 'telegram',
          isEnglish,
        });
        actionFeedback = actionResult.combinedFeedback;
      }

      // Save as study note in user's dashboard
      await supabase.from('notes').insert({
        user_id: userId,
        content: `📁 ${doc.file_name || 'Document'}\n\n${aiResponse.reply}`,
        tags: ['Document', 'PDF', 'AI-Summary'],
      });

      let finalReply = aiResponse.reply;
      if (actionFeedback) {
        finalReply += `\n\n${actionFeedback}`;
      }

      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: finalReply,
      });

      await sendTelegramReply(chatId, finalReply);
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
        languagePreference: isEnglish ? 'en' : 'ar',
        userProfile: profile,
        databaseContext,
      });

      // Execute detected actions (e.g. solve and add quiz/flashcards)
      let actionFeedback = '';
      const actionsToRun = aiResponse.actions?.length ? aiResponse.actions : aiResponse.action;
      if (actionsToRun) {
        const actionResult = await executeBotActions(supabase, userId, actionsToRun, {
          source: 'telegram',
          isEnglish,
        });
        actionFeedback = actionResult.combinedFeedback;
      }

      let finalReply = aiResponse.reply;
      if (actionFeedback) {
        finalReply += `\n\n${actionFeedback}`;
      }

      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: finalReply,
      });

      await sendTelegramReply(chatId, finalReply);
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
        languagePreference: isEnglish ? 'en' : 'ar',
        userProfile: profile,
        databaseContext,
      });

      let actionFeedback = '';
      const actionsToRun = aiResponse.actions?.length ? aiResponse.actions : aiResponse.action;
      if (actionsToRun) {
        const actionResult = await executeBotActions(supabase, userId, actionsToRun, {
          source: 'telegram',
          isEnglish,
        });
        actionFeedback = actionResult.combinedFeedback;
      }

      let finalReply = aiResponse.reply;
      if (actionFeedback) {
        finalReply += `\n\n${actionFeedback}`;
      }

      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: finalReply,
      });

      await sendTelegramReply(chatId, finalReply);
      return NextResponse.json({ ok: true });
    }

    // Case D: User sent Plain Text or Question or /start
    if (rawText.toLowerCase() === '/start' || rawText.toLowerCase() === 'start') {
      const greeting =
        `👋 مرحباً ${profile?.full_name ? profile.full_name.split(' ')[0] : 'يا بطل'}!\n\n` +
        'أنا مساعدك الذكي في البكالوريا المصرية (TSC AI) 🤖\n\n' +
        '• اسألني أي سؤال في موادك (فيزياء، كيمياء، أحياء، رياضيات، إلخ).\n' +
        '• ضيف كويز أو فلاش كاردز في أي وقت (مثلاً: "اعمل كويز 5 أسئلة في الكيمياء").\n' +
        '• سجل واجباتك وعدل مواعيد التسليم أو علم عليها كمنتهية (مثلاً: "خلصت واجب الماث").\n' +
        '• ابعتلي أي ملف PDF أو صورة مسألة وهحلها وألخصهالك فوراً.\n\n' +
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

    // Fetch recent chat history in the last 3 minutes for multi-message combining
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    const { data: recentHistoryData } = await supabase
      .from('chat_messages')
      .select('content, created_at')
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', threeMinAgo)
      .order('created_at', { ascending: true })
      .limit(4);

    const recentHistory = recentHistoryData?.map((m: any) => ({ text: m.content, time: m.created_at })) || [];

    // Process text with AI
    const aiResponse = await processUserMessageWithAI({
      text: rawText,
      languagePreference: isEnglish ? 'en' : 'ar',
      userProfile: profile,
      databaseContext,
      recentMessages: recentHistory,
    });

    // Execute detected bot actions
    let actionFeedback = '';
    const actionsToRun = aiResponse.actions?.length ? aiResponse.actions : aiResponse.action;
    if (actionsToRun) {
      const actionResult = await executeBotActions(supabase, userId, actionsToRun, {
        source: 'telegram',
        isEnglish,
      });
      actionFeedback = actionResult.combinedFeedback;
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
