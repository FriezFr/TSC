import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { processUserMessageWithAI } from '@/lib/gemini';
import {
  executeBotActions,
  buildFullStudentContext,
  getTSCCommandsGuide,
  isGroupChatDump,
  generateDailyMorningBriefing,
  computeExamReadiness,
  generateWeeklyProgressReport,
  generateTodayScheduleBrief,
  generateWhatToStudyBrief,
  generatePendingTasksBrief,
} from '@/lib/bot-actions';

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

interface TelegramCallbackQuery {
  id: string;
  from: {
    id: number;
    first_name?: string;
    username?: string;
  };
  message?: {
    message_id: number;
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
  data?: string;
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
    reply_to_message?: any;
  };
  callback_query?: TelegramCallbackQuery;
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

// Answer inline keyboard callback queries so the loading spinner stops
async function answerCallbackQuery(callbackQueryId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
    });
  } catch {
    // Ignore status errors
  }
}

// Quick action buttons for Telegram
function getTelegramDashboardButtons(isEnglish: boolean) {
  return {
    inline_keyboard: [
      [{ text: isEnglish ? '🧠 What to Study?' : '🧠 أذاكر إيه؟', callback_data: 'btn_what_to_study' }],
      [{ text: isEnglish ? '📅 Today Schedule' : '📅 جدول اليوم', callback_data: 'btn_today_schedule' }],
      [{ text: isEnglish ? '🎯 Exam Readiness' : '🎯 جاهز للامتحان؟', callback_data: 'btn_exam_readiness' }],
    ],
  };
}

// Comprehensive greeting and full explanation for new or unlinked Telegram accounts
function getNewUserGreeting(isEnglish: boolean): string {
  return getTSCCommandsGuide({ isEnglish, isLinked: false });
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
async function sendTelegramReply(chatId: number, rawText: string, replyMarkup?: any) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not configured');
    return;
  }

  const text = formatForTelegram(rawText);
  const maxChunk = 4000;
  for (let i = 0; i < text.length; i += maxChunk) {
    const chunk = text.slice(i, i + maxChunk);
    const isLastChunk = i + maxChunk >= text.length;
    try {
      const payload: any = {
        chat_id: chatId,
        text: chunk,
      };
      if (isLastChunk && replyMarkup) {
        payload.reply_markup = replyMarkup;
      }
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
    const callbackQuery = update.callback_query;

    if (!message && !callbackQuery) {
      return NextResponse.json({ ok: true, note: 'No message or callback_query in update' });
    }

    let chatId: number;
    let isGroup = false;
    let rawText = '';

    if (callbackQuery) {
      chatId = callbackQuery.message?.chat.id || callbackQuery.from.id;
      isGroup = callbackQuery.message?.chat.type === 'group' || callbackQuery.message?.chat.type === 'supergroup';
      await answerCallbackQuery(callbackQuery.id);

      const callbackData = callbackQuery.data || '';
      if (callbackData === 'btn_what_to_study') {
        rawText = 'أذاكر إيه دلوقتي؟';
      } else if (callbackData === 'btn_today_schedule') {
        rawText = 'جدول اليوم';
      } else if (callbackData === 'btn_exam_readiness') {
        rawText = 'جاهز للامتحان؟';
      } else if (callbackData === 'btn_pending_tasks') {
        rawText = 'الواجبات';
      } else if (callbackData === 'btn_morning_briefing') {
        rawText = 'تقرير الصباح';
      } else if (callbackData === 'btn_weekly_report') {
        rawText = 'تقرير الأسبوع';
      } else {
        rawText = callbackData;
      }
    } else if (message) {
      chatId = message.chat.id;
      isGroup = message.chat.type === 'group' || message.chat.type === 'supergroup';
      rawText = (message.text || message.caption || '').trim();

      // In Telegram Groups: Only reply if the bot is explicitly mentioned, tagged, or replied to!
      if (isGroup) {
        const isBotMentioned =
          rawText.includes('@TSCTaskerBot') ||
          rawText.includes('@TSC') ||
          rawText.startsWith('/') ||
          message.reply_to_message?.from?.is_bot === true;

        if (!isBotMentioned) {
          // Silently ignore group banter so people can chat freely without bot interruption
          return NextResponse.json({ ok: true, note: 'Ignored group message without bot mention' });
        }
      }
    } else {
      return NextResponse.json({ ok: true });
    }

    const isDump = isGroupChatDump(rawText);

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

    // Language detection
    const explicitEnglish =
      /^\/?(en|english)\b/i.test(rawText) ||
      /\b(speak|talk|reply|switch to|switch)\s+(in\s+)?english\b/i.test(rawText);
    const hasArabic = /[\u0600-\u06FF]/.test(rawText);
    const isEnglish = explicitEnglish || (!hasArabic && /[a-zA-Z]/.test(rawText));

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
          'حبيبي يا إسماعيل يا بطل! أنا TSC معاك ومصحصحلك جداً أهو. 👋\n\n' +
            'تم ربط حسابك في التليجرام بنجاح! جاهز لأي سؤال، حل مسائل، مذكرات، أو تنظيم جدولك.\n\n' +
            'You can talk to me in English or Arabic anytime!\n' +
            'قول لي حابب نبدأ بإيه! 😎'
        );
        return NextResponse.json({ ok: true });
      }

      // Check if message is a simple greeting or general introductory ping
      const isGreetingOnly =
        !message?.document &&
        !message?.photo &&
        (/^\/?(hi|hello|hey|salam|start|help|\/start|\/help|سلام|السلام عليكم|الو|مين|مين معايا|اهلا|أهلا|ازيك|ازيك يا بوت|مساء الخير|صباح الخير)\b/i.test(
          rawText.trim()
        ) ||
          rawText.trim().length <= 4);

      if (isGreetingOnly) {
        await sendTelegramReply(chatId, getNewUserGreeting(isEnglish));
        return NextResponse.json({ ok: true });
      }

      // If new/unlinked user sends a real question, homework problem, image, or PDF:
      // Answer it fully using Gemini in guest mode + include welcome header and linking footer
      try {
        await sendChatAction(chatId, message?.document ? 'upload_document' : 'typing');

        let mediaPart: { mimeType: string; data: string } | undefined = undefined;
        let fileName: string | undefined = undefined;

        if (message?.document) {
          const doc = message.document;
          fileName = doc.file_name || 'Study Document';
          const downloaded = await downloadTelegramFile(doc.file_id);
          if (downloaded) {
            mediaPart = {
              mimeType: doc.mime_type || 'application/pdf',
              data: downloaded.buffer.toString('base64'),
            };
          }
        } else if (message?.photo && message.photo.length > 0) {
          const largestPhoto = message.photo[message.photo.length - 1];
          const downloaded = await downloadTelegramFile(largestPhoto.file_id);
          if (downloaded) {
            mediaPart = {
              mimeType: 'image/jpeg',
              data: downloaded.buffer.toString('base64'),
            };
          }
        }

        const aiResponse = await processUserMessageWithAI({
          text: rawText,
          mediaPart,
          fileName,
          languagePreference: isEnglish ? 'en' : 'ar',
          userProfile: undefined,
          databaseContext: '',
          recentMessages: [],
        });

        const introHeader = isEnglish
          ? '👋 Welcome to TSC! (Your Smart School Operating System)\n\n'
          : '👋 أهلاً بك في TSC! (رفيقك ومساعدك المدرسي الذكي)\n\n';

        const linkFooter = isEnglish
          ? '\n\n💡 Tip: To link this Telegram account to your web dashboard and sync your schedule, generate a code at: https://taskerbot.vercel.app/dashboard/settings'
          : '\n\n💡 ملحوظة: لربط حساب التليجرام ده بحسابك على الموقع ومتابعة جدولك وواجباتك، ابعت رمز الربط من الإعدادات: https://taskerbot.vercel.app/dashboard/settings';

        await sendTelegramReply(chatId, `${introHeader}${aiResponse.reply}${linkFooter}`);
      } catch (err) {
        console.error('Error processing guest message in Telegram:', err);
        await sendTelegramReply(chatId, getNewUserGreeting(isEnglish));
      }
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
    await sendChatAction(chatId, message?.document ? 'upload_document' : 'typing');

    // Fetch full active database context (timetable, assignments, exams, flashcard decks, notes)
    const databaseContext = await buildFullStudentContext(supabase, userId);

    // Case A: User sent a Document (e.g. PDF file like "Ch 1 L 1_2027.pdf")
    if (message?.document) {
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

      await sendTelegramReply(chatId, finalReply, getTelegramDashboardButtons(isEnglish));
      return NextResponse.json({ ok: true });
    }

    // Case B: User sent a Photo / Image (textbook question, exam problem, diagram)
    if (message?.photo && message.photo.length > 0) {
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

      await sendTelegramReply(chatId, finalReply, getTelegramDashboardButtons(isEnglish));
      return NextResponse.json({ ok: true });
    }

    // Case C: User sent a Voice Note or Audio
    if (message?.voice || message?.audio) {
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

      await sendTelegramReply(chatId, finalReply, getTelegramDashboardButtons(isEnglish));
      return NextResponse.json({ ok: true });
    }

    // -------------------------------------------------------------
    // DIRECT AUTONOMOUS INTELLIGENCE TRIGGERS (<100ms Deterministic)
    // -------------------------------------------------------------

    const cleanCmd = rawText.trim().replace(/^\//, '').replace(/[؟!.,]/g, '').trim().toLowerCase();
    const telegramButtons = getTelegramDashboardButtons(isEnglish);

    // A. Full Daily Dashboard (/dashboard, /dashbored, dashboard, dashbored, لوحة التحكم, etc.)
    const isDashboardQuery =
      !message?.document &&
      !message?.photo &&
      (/^(dash|dashboard|dashbored|dashbord|لوحة التحكم|الداشبورد|داشبورد|التحكم)$/i.test(cleanCmd) ||
        /(dashboard|dashbored|dashbord|الداشبورد|داشبورد|لوحة التحكم)/i.test(rawText));

    if (isDashboardQuery) {
      const briefing = await generateDailyMorningBriefing(supabase, userId, isEnglish);
      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: briefing,
      });
      await sendTelegramReply(chatId, briefing, telegramButtons);
      return NextResponse.json({ ok: true });
    }

    // B. Today's Schedule & Classes (/schedule, /today, جدول اليوم, جدول النهارده, etc.)
    const isTodaySchedule =
      !message?.document &&
      !message?.photo &&
      (/^(schedule|today|timetable|جدول اليوم|جدول النهارده|حصص اليوم|حصص النهارده|الجدول)$/i.test(cleanCmd) ||
        /(جدول اليوم|جدول النهارده|حصص اليوم|حصص النهارده|قولي جدول النهارده|جدول النهاردة|today schedule|today's schedule|classes today)/i.test(
          rawText
        ));

    if (isTodaySchedule) {
      const scheduleBrief = await generateTodayScheduleBrief(supabase, userId, isEnglish);
      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: scheduleBrief,
      });
      await sendTelegramReply(chatId, scheduleBrief, telegramButtons);
      return NextResponse.json({ ok: true });
    }

    // C. What Should I Study Right Now? (/study, أذاكر إيه دلوقتي, what to study, etc.)
    const isWhatToStudy =
      !message?.document &&
      !message?.photo &&
      (/^(study|what to study|أذاكر إيه|اذاكر ايه|أذاكر ايه دلوقتي|اذاكر ايه دلوقتي)$/i.test(cleanCmd) ||
        /(what should i study|what to study|أذاكر إيه دلوقتي|اذاكر ايه دلوقتي|أذاكر إيه|اذاكر ايه|ذاكر ايه|ذاكر إيه)/i.test(
          rawText
        ));

    if (isWhatToStudy) {
      const studyDecision = await generateWhatToStudyBrief(supabase, userId, isEnglish);
      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: studyDecision,
      });
      await sendTelegramReply(chatId, studyDecision, telegramButtons);
      return NextResponse.json({ ok: true });
    }

    // D. Pending Homework & Tasks (/tasks, /homework, الواجبات, عليا إيه, etc.)
    const isPendingTasks =
      !message?.document &&
      !message?.photo &&
      (/^(tasks|homework|واجبات|الواجبات|واجباتي|عليا إيه|عليا ايه)$/i.test(cleanCmd) ||
        /(عليا إيه|عليا ايه|عليا ايه النهارده|عليا إيه النهارده|واجبات النهارده|pending tasks|my homework|what is due)/i.test(
          rawText
        ));

    if (isPendingTasks) {
      const tasksBrief = await generatePendingTasksBrief(supabase, userId, isEnglish);
      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: tasksBrief,
      });
      await sendTelegramReply(chatId, tasksBrief, telegramButtons);
      return NextResponse.json({ ok: true });
    }

    // E. AI Exam Readiness Score Engine
    const isExamReadiness =
      !message?.document &&
      !message?.photo &&
      (/^(readiness|exam readiness|جاهز للامتحان|درجة الاستعداد|درجة استعدادي)$/i.test(cleanCmd) ||
        /(exam readiness|readiness|جاهز للامتحان|درجة الاستعداد|درجة استعدادي|استعدادي للامتحان|مستعد للامتحان|هل انا جاهز)/i.test(
          rawText
        ));

    if (isExamReadiness) {
      const readinessReport = await computeExamReadiness(supabase, userId, isEnglish);
      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: readinessReport,
      });
      await sendTelegramReply(chatId, readinessReport, telegramButtons);
      return NextResponse.json({ ok: true });
    }

    // F. Daily Morning Briefing
    const isMorningBriefing =
      !message?.document &&
      !message?.photo &&
      (/^(morning|brief|morning briefing|daily brief|صباح الخير|تقرير الصباح)$/i.test(cleanCmd) ||
        /(morning briefing|daily brief|صباح الخير|تقرير الصباح|تقرير بداية اليوم|بريف الصباح)/i.test(
          rawText
        ));

    if (isMorningBriefing) {
      const briefing = await generateDailyMorningBriefing(supabase, userId, isEnglish);
      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: briefing,
      });
      await sendTelegramReply(chatId, briefing, telegramButtons);
      return NextResponse.json({ ok: true });
    }

    // G. 1-Click Weekly Study & Parent Progress Report
    const isWeeklyReport =
      !message?.document &&
      !message?.photo &&
      (/^(report|weekly report|parent report|تقرير الأسبوع|تقرير لولي الأمر)$/i.test(cleanCmd) ||
        /(weekly report|parent report|تقرير الأسبوع|تقرير لولي الأمر|تقرير ولي الامر|تقرير اسبوعي|تقرير شامل|تقرير الاسبوع)/i.test(
          rawText
        ));

    if (isWeeklyReport) {
      const progressReport = await generateWeeklyProgressReport(supabase, userId, isEnglish);
      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: progressReport,
      });
      await sendTelegramReply(chatId, progressReport, telegramButtons);
      return NextResponse.json({ ok: true });
    }

    // H. User sent greeting, /start, /help, commands inquiry, or question
    const isExplicitCommandQuery =
      !message?.document &&
      !message?.photo &&
      (/^(help|commands|menu|أوامر|اوامر|الأوامر|الاوامر|اوامر البوت)$/i.test(cleanCmd) ||
        /(commands|help|أوامر|الاوامر|الأوامر|اوامر|اوامر البوت|بتعمل ايه|مين انت|عرفني بنفسك|شرح البوت|كيف استخدمك|طريقة الاستخدام)/i.test(
          rawText
        ));

    const isSimpleGreetingOnly =
      !message?.document &&
      !message?.photo &&
      /^\/?(yo|hi|hello|hey|sup|ازيك|ازيك يا بوت|سلام|السلام عليكم|الو|اهلا|أهلا|مساء الخير|bruh)\b/i.test(
        rawText
      ) &&
      rawText.split(/\s+/).length <= 3;

    if (isExplicitCommandQuery || isSimpleGreetingOnly) {
      const guide = getTSCCommandsGuide({
        isEnglish,
        isLinked: true,
        userName: profile?.full_name,
      });

      await recordChatMessage(supabase, {
        userId,
        role: 'user',
        content: rawText,
      });

      await recordChatMessage(supabase, {
        userId,
        role: 'assistant',
        content: guide,
      });

      await sendTelegramReply(chatId, guide, telegramButtons);
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
      isGroupContext: isGroup,
      isGroupDump: isDump,
    });

    // Execute detected bot actions
    let actionFeedback = '';
    const actionsToRun = aiResponse.actions?.length ? aiResponse.actions : aiResponse.action;
    if (actionsToRun) {
      const actionResult = await executeBotActions(supabase, userId, actionsToRun, {
        source: 'telegram',
        isEnglish,
        isGroupContext: isGroup,
        isGroupDump: isDump,
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
    await sendTelegramReply(chatId, finalReply, telegramButtons);
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
