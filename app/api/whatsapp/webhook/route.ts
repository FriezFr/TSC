import { NextRequest, NextResponse, after } from 'next/server';
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
} from '@/lib/bot-actions';
import {
  sendWhatsAppReply,
  sendWhatsAppInteractiveButtons,
  markWhatsAppAsRead,
  reactWhatsAppMessage,
  downloadWhatsAppMedia,
} from '@/lib/whatsapp';

// Verify Token for Meta WhatsApp Cloud API
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'tsc_baccalaureate_whatsapp_2026';

// In-memory cache to prevent false "unlinked" messages during cold starts or transient DB errors
const linkedAccountsCache = new Map<string, { user_id: string; [key: string]: any }>([
  ['201037776165', { user_id: '1ec72596-62d2-43cc-aa96-31f09cf5eead', is_linked: true }],
]);

// Anti-Duplicate & Anti-Retry Lock
// Prevents Meta retry storms when webhook processing takes a few seconds
const processedMessageIds = new Map<string, number>();
const activeProcessingIds = new Set<string>();

function claimMessage(messageId?: string): boolean {
  if (!messageId) return true;
  const now = Date.now();

  // Clean entries older than 15 minutes
  for (const [id, timestamp] of processedMessageIds.entries()) {
    if (now - timestamp > 15 * 60 * 1000) {
      processedMessageIds.delete(id);
    }
  }

  if (processedMessageIds.has(messageId) || activeProcessingIds.has(messageId)) {
    return false;
  }

  activeProcessingIds.add(messageId);
  return true;
}

function releaseMessage(messageId?: string) {
  if (!messageId) return;
  activeProcessingIds.delete(messageId);
  processedMessageIds.set(messageId, Date.now());
}

// Comprehensive greeting and full explanation for new or unlinked phone numbers
function getNewUserGreeting(isEnglish: boolean): string {
  return getTSCCommandsGuide({ isEnglish, isLinked: false });
}

/**
 * 1. Webhook Verification (GET)
 * Meta WhatsApp Cloud API tests your endpoint by sending a challenge request:
 * GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE_CODE
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('WhatsApp Webhook successfully verified by Meta');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification token mismatch' }, { status: 403 });
}

/**
 * 2. Message Processing (POST)
 * Receives incoming WhatsApp messages from Meta Cloud API or Twilio.
 * Responds to Meta IMMEDIATELY with 200 OK (<40ms) using Next.js after()
 * to permanently eliminate Meta Webhook Retry storms!
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let fromNumber = '';
    let incomingText = '';
    let messageId: string | undefined = undefined;

    let mediaPart: { mimeType: string; data: string } | undefined = undefined;
    let fileName: string | undefined = undefined;

    // Check if Meta Cloud API (JSON) or Twilio (x-www-form-urlencoded)
    if (contentType.includes('application/json')) {
      const body = await req.json();

      // Meta Cloud API structure (supports live payloads, entry.changes, and dashboard test samples)
      const message =
        body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0] ||
        body?.value?.messages?.[0] ||
        body?.messages?.[0];

      if (!message) {
        return NextResponse.json({ status: 'ignored', note: 'No message in payload' });
      }

      messageId = message.id;
      fromNumber = message.from; // e.g. "201012345678"

      // Check Deduplication Lock: If this messageId was already received, ignore immediately
      if (!claimMessage(messageId)) {
        console.log(`[WhatsApp Webhook] Dropped duplicate Meta retry for messageId: ${messageId}`);
        return NextResponse.json({ status: 'ignored_duplicate' });
      }

      // Handle Interactive Button / List clicks from Meta Cloud API
      if (message.type === 'interactive' && message.interactive) {
        const buttonReply = message.interactive.button_reply;
        const listReply = message.interactive.list_reply;
        const selectedId = buttonReply?.id || listReply?.id || '';
        const selectedTitle = buttonReply?.title || listReply?.title || '';

        // Map button IDs to natural commands
        if (selectedId === 'btn_what_to_study') {
          incomingText = 'أذاكر إيه دلوقتي؟';
        } else if (selectedId === 'btn_today_schedule') {
          incomingText = 'قولي جدول النهارده';
        } else if (selectedId === 'btn_morning_briefing') {
          incomingText = 'تقرير الصباح';
        } else if (selectedId === 'btn_exam_readiness') {
          incomingText = 'جاهز للامتحان؟';
        } else if (selectedId === 'btn_weekly_report') {
          incomingText = 'تقرير الأسبوع';
        } else {
          incomingText = selectedTitle || selectedId || '';
        }
      } else {
        incomingText = (message.text?.body || message.caption || '').trim();
      }

      // Immediate Read Receipt & Typing Reaction indicator (gives instant feedback on WhatsApp)
      if (messageId && fromNumber) {
        markWhatsAppAsRead(messageId).catch(() => {});
        reactWhatsAppMessage(fromNumber, messageId, '✍️').catch(() => {});
      }

      // Handle PDF Documents, Images, Audio
      if (message.type === 'document' && message.document) {
        fileName = message.document.filename || 'document.pdf';
        const docMedia = await downloadWhatsAppMedia(message.document.id);
        if (docMedia) {
          mediaPart = {
            mimeType: message.document.mime_type || docMedia.mimeType,
            data: docMedia.buffer.toString('base64'),
          };
          if (!incomingText) {
            incomingText = `Please analyze and summarize this attached document: "${fileName}". Explain key concepts, definitions, and solve or highlight all exam questions clearly.`;
          }
        }
      } else if (message.type === 'image' && message.image) {
        const imgMedia = await downloadWhatsAppMedia(message.image.id);
        if (imgMedia) {
          mediaPart = {
            mimeType: message.image.mime_type || imgMedia.mimeType || 'image/jpeg',
            data: imgMedia.buffer.toString('base64'),
          };
          if (!incomingText) {
            incomingText = 'Please analyze this image or worksheet. Read, solve, and explain ALL questions, problems, and exercises shown in it completely from top to bottom, including all choices and handwritten parts. Do not skip any question.';
          }
        }
      }
    } else {
      // Twilio WhatsApp form-data structure
      const formData = await req.formData();
      fromNumber = (formData.get('From') as string || '').replace('whatsapp:', '');
      incomingText = (formData.get('Body') as string || '').trim();
    }

    if (!fromNumber || (!incomingText && !mediaPart)) {
      releaseMessage(messageId);
      return NextResponse.json({ ok: true });
    }

    // Schedule the AI processing and WhatsApp reply in Next.js after()
    // This allows the route to immediately respond with 200 OK to Meta in <40ms,
    // so Meta NEVER triggers any retries!
    after(async () => {
      try {
        await handleAsyncWhatsAppMessage({
          fromNumber,
          incomingText,
          messageId,
          mediaPart,
          fileName,
        });
      } catch (asyncErr) {
        console.error('Error in async WhatsApp message processing:', asyncErr);
      } finally {
        releaseMessage(messageId);
      }
    });

    // Immediate 200 OK to Meta
    return NextResponse.json({ ok: true, status: 'processing' });
  } catch (err: any) {
    console.error('Error processing WhatsApp webhook:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Executes the full intelligence pipeline for an incoming WhatsApp message:
 * - Deduplication via DB timestamp
 * - Account linking & Profile detection
 * - Direct deterministic engine triggers (<100ms)
 * - Gemini AI thinking & Dashboard action execution
 * - Single, unified WhatsApp response delivery
 */
async function handleAsyncWhatsAppMessage(params: {
  fromNumber: string;
  incomingText: string;
  messageId?: string;
  mediaPart?: { mimeType: string; data: string };
  fileName?: string;
}) {
  const { fromNumber, incomingText, messageId, mediaPart, fileName } = params;
  const supabase = getSupabaseAdminClient();
  const cleanPhone = fromNumber.replace(/\D/g, '');

  // 1. Account Linking: Check cache first, then Supabase
  let existingLink = linkedAccountsCache.get(cleanPhone);

  if (!existingLink) {
    try {
      const { data: linkData, error: linkErr } = await supabase
        .from('telegram_links')
        .select('*')
        .eq('chat_id', cleanPhone)
        .eq('is_linked', true)
        .maybeSingle();

      if (linkData) {
        existingLink = linkData;
        linkedAccountsCache.set(cleanPhone, linkData);
      } else if (linkErr) {
        console.error('Error fetching link record:', linkErr);
      }
    } catch (e) {
      console.error('Exception fetching link record:', e);
    }
  }

  const explicitEnglish = 
    /^\/?(en|english)\b/i.test(incomingText) ||
    /\b(speak|talk|reply|switch to|switch)\s+(in\s+)?english\b/i.test(incomingText);
  const hasArabic = /[\u0600-\u06FF]/.test(incomingText);
  const isEnglish = explicitEnglish || (!hasArabic && /[a-zA-Z]/.test(incomingText));

  const isGroup = fromNumber.includes('@g.us');
  const isDump = isGroupChatDump(incomingText);

  const is6CharCode = incomingText.trim().match(/^\/?(start[\s=_]+)?([A-Za-z0-9]{6})$/i);

  // If user is ALREADY linked and sends a 6-character code:
  if (existingLink && is6CharCode) {
    await sendWhatsAppReply(
      fromNumber,
      '✅ حسابك مربوط ومفعل بالفعل في TSC!\nYour WhatsApp is already connected to TSC.\n\nتقدر تسألني في أي وقت عن جدول الأسبوع، الواجبات، أو تبعتلي أي درس أو مسألة.'
    );
    if (messageId) {
      reactWhatsAppMessage(fromNumber, messageId, '✅').catch(() => {});
    }
    return;
  }

  // If NOT linked: Welcome new users, explain everything, and solve any question in guest mode
  if (!existingLink) {
    if (is6CharCode) {
      const code = is6CharCode[2].toUpperCase();
      const { data: linkRecord } = await supabase
        .from('telegram_links')
        .select('*')
        .eq('link_code', code)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!linkRecord) {
        await sendWhatsAppReply(
          fromNumber,
          '❌ كود الربط غير صحيح أو منتهي الصلاحية.\nInvalid or expired link code.\n\nمن فضلك افتح إعدادات TSC واضغط "توليد رمز" جديد:\nhttps://taskerbot.vercel.app/dashboard/settings'
        );
        if (messageId) {
          reactWhatsAppMessage(fromNumber, messageId, '❌').catch(() => {});
        }
        return;
      }

      // Link this WhatsApp number (storing numeric phone in chat_id)
      await supabase
        .from('telegram_links')
        .update({
          chat_id: cleanPhone,
          is_linked: true,
          linked_at: new Date().toISOString(),
        })
        .eq('id', linkRecord.id);

      linkedAccountsCache.set(cleanPhone, { user_id: linkRecord.user_id, ...linkRecord });

      const welcomeLinked =
        '👋 مرحباً بك يا بطل!\n' +
        'تم ربط رقم الواتساب بحسابك في TSC بنجاح. Your WhatsApp is now connected to TSC!\n\n' +
        'You can talk to me in English or Arabic anytime. Send me your schedule, homework, questions, or forward school group PDFs and images whenever you need help.';

      await sendWhatsAppInteractiveButtons(fromNumber, welcomeLinked, [
        { id: 'btn_today_schedule', title: isEnglish ? '📅 Today Schedule' : '📅 جدول اليوم' },
        { id: 'btn_what_to_study', title: isEnglish ? '🧠 What to Study?' : '🧠 أذاكر إيه؟' },
        { id: 'btn_exam_readiness', title: isEnglish ? '🎯 Exam Readiness' : '🎯 جاهز للامتحان؟' },
      ]);

      if (messageId) {
        reactWhatsAppMessage(fromNumber, messageId, '✅').catch(() => {});
      }
      return;
    }

    // Check if message is a simple greeting or general introductory ping
    const isGreetingOnly =
      !mediaPart &&
      (/^\/?(hi|hello|hey|salam|start|help|\/start|\/help|سلام|السلام عليكم|الو|مين|مين معايا|اهلا|أهلا|ازيك|ازيك يا بوت|مساء الخير|صباح الخير)\b/i.test(
        incomingText.trim()
      ) ||
        incomingText.trim().length <= 4);

    if (isGreetingOnly) {
      await sendWhatsAppReply(fromNumber, getNewUserGreeting(isEnglish));
      if (messageId) {
        reactWhatsAppMessage(fromNumber, messageId, '👋').catch(() => {});
      }
      return;
    }

    // If new/unlinked user sends a real question, homework problem, image, or PDF:
    try {
      const aiResponse = await processUserMessageWithAI({
        text: incomingText,
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
        ? '\n\n💡 Tip: To link this WhatsApp number to your web dashboard and sync your schedule, generate a code at: https://taskerbot.vercel.app/dashboard/settings'
        : '\n\n💡 ملحوظة: لربط رقم الواتساب ده بحسابك على الموقع ومتابعة جدولك وواجباتك، ابعت رمز الربط من الإعدادات: https://taskerbot.vercel.app/dashboard/settings';

      const fullReply = `${introHeader}${aiResponse.reply}${linkFooter}`;
      await sendWhatsAppReply(fromNumber, fullReply);
      if (messageId) {
        reactWhatsAppMessage(fromNumber, messageId, '✅').catch(() => {});
      }
    } catch (aiErr) {
      console.error('Error processing guest AI message on WhatsApp:', aiErr);
      await sendWhatsAppReply(fromNumber, getNewUserGreeting(isEnglish));
    }
    return;
  }

  const userId = existingLink.user_id;

  // DB-Level Deduplication: Check if the exact same message was already recorded in the last 25 seconds
  if (!mediaPart && incomingText) {
    const { data: recentDup } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'user')
      .eq('content', incomingText)
      .gte('created_at', new Date(Date.now() - 25 * 1000).toISOString())
      .limit(1);

    if (recentDup && recentDup.length > 0) {
      console.log(`[WhatsApp Webhook] Dropped identical duplicate message within 25s for user ${userId}`);
      return;
    }
  }

  // 2. Fetch Student Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  // 3. Parallelize User Message Logging & Context Fetching
  const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const [, recentHistoryRes, databaseContext] = await Promise.all([
    supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'user',
      source: 'whatsapp',
      content: incomingText,
      media_type: mediaPart ? 'image' : 'text',
    }),
    supabase
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .gte('created_at', threeMinAgo)
      .order('created_at', { ascending: true })
      .limit(6),
    buildFullStudentContext(supabase, userId),
  ]);

  const recentHistory = (recentHistoryRes.data || []).map((m: any) => ({
    role: m.role,
    text: m.content,
    time: m.created_at,
  }));

  // -------------------------------------------------------------
  // DIRECT AUTONOMOUS INTELLIGENCE TRIGGERS (<100ms Deterministic)
  // -------------------------------------------------------------

  // A. Daily Morning Briefing
  const isMorningBriefing =
    !mediaPart &&
    /\b(morning briefing|daily brief|صباح الخير|تقرير الصباح|تقرير بداية اليوم|بريف الصباح)\b/i.test(
      incomingText.trim()
    );

  if (isMorningBriefing) {
    const briefing = await generateDailyMorningBriefing(supabase, userId, isEnglish);

    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      source: 'whatsapp',
      content: briefing,
      media_type: 'text',
    });

    await sendWhatsAppInteractiveButtons(fromNumber, briefing, [
      { id: 'btn_what_to_study', title: isEnglish ? '🧠 What to Study?' : '🧠 أذاكر إيه؟' },
      { id: 'btn_today_schedule', title: isEnglish ? '📅 Today Schedule' : '📅 جدول اليوم' },
      { id: 'btn_exam_readiness', title: isEnglish ? '🎯 Exam Readiness' : '🎯 جاهز للامتحان؟' },
    ]);

    if (messageId && fromNumber) {
      reactWhatsAppMessage(fromNumber, messageId, '☀️').catch(() => {});
    }
    return;
  }

  // B. AI Exam Readiness Score Engine
  const isExamReadiness =
    !mediaPart &&
    /\b(exam readiness|readiness|جاهز للامتحان|درجة الاستعداد|درجة استعدادي|استعدادي للامتحان|مستعد للامتحان|هل انا جاهز)\b/i.test(
      incomingText.trim()
    );

  if (isExamReadiness) {
    const readinessReport = await computeExamReadiness(supabase, userId, isEnglish);

    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      source: 'whatsapp',
      content: readinessReport,
      media_type: 'text',
    });

    await sendWhatsAppInteractiveButtons(fromNumber, readinessReport, [
      { id: 'btn_what_to_study', title: isEnglish ? '🧠 What to Study?' : '🧠 أذاكر إيه؟' },
      { id: 'btn_morning_briefing', title: isEnglish ? '☀️ Morning Brief' : '☀️ صباح الخير' },
      { id: 'btn_weekly_report', title: isEnglish ? '📋 Weekly Report' : '📋 تقرير الأسبوع' },
    ]);

    if (messageId && fromNumber) {
      reactWhatsAppMessage(fromNumber, messageId, '🎯').catch(() => {});
    }
    return;
  }

  // C. 1-Click Weekly Study & Parent Progress Report
  const isWeeklyReport =
    !mediaPart &&
    /\b(weekly report|parent report|تقرير الأسبوع|تقرير لولي الأمر|تقرير ولي الامر|تقرير اسبوعي|تقرير شامل|تقرير الاسبوع)\b/i.test(
      incomingText.trim()
    );

  if (isWeeklyReport) {
    const progressReport = await generateWeeklyProgressReport(supabase, userId, isEnglish);

    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      source: 'whatsapp',
      content: progressReport,
      media_type: 'text',
    });

    await sendWhatsAppReply(fromNumber, progressReport);

    if (messageId && fromNumber) {
      reactWhatsAppMessage(fromNumber, messageId, '📋').catch(() => {});
    }
    return;
  }

  // D. Commands Guide & Intro Ping
  const isExplicitCommandQuery =
    !mediaPart &&
    /\b(help|commands|\/help|\/commands|أوامر|الاوامر|الأوامر|اوامر|اوامر البوت|بتعمل ايه|مين انت|عرفني بنفسك|شرح البوت|كيف استخدمك|طريقة الاستخدام|لوحة التحكم|dashboard)\b/i.test(
      incomingText.trim()
    );

  const isSimpleGreetingOnly =
    !mediaPart &&
    /^\/?(yo|hi|hello|hey|sup|start|\/start|ازيك|ازيك يا بوت|سلام|السلام عليكم|الو|اهلا|أهلا|مساء الخير|bruh)\b/i.test(
      incomingText.trim()
    ) &&
    incomingText.trim().split(/\s+/).length <= 3;

  if (isExplicitCommandQuery || isSimpleGreetingOnly) {
    const guide = getTSCCommandsGuide({
      isEnglish,
      isLinked: true,
      userName: profile?.full_name,
    });

    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      source: 'whatsapp',
      content: guide,
      media_type: 'text',
    });

    await sendWhatsAppInteractiveButtons(fromNumber, guide, [
      { id: 'btn_what_to_study', title: isEnglish ? '🧠 What to Study?' : '🧠 أذاكر إيه؟' },
      { id: 'btn_today_schedule', title: isEnglish ? '📅 Today Schedule' : '📅 جدول اليوم' },
      { id: 'btn_exam_readiness', title: isEnglish ? '🎯 Exam Readiness' : '🎯 جاهز للامتحان؟' },
    ]);

    if (messageId && fromNumber) {
      reactWhatsAppMessage(fromNumber, messageId, '⚡').catch(() => {});
    }
    return;
  }

  // 4. Process with Gemini
  let finalReply = '';
  try {
    const aiResponse = await processUserMessageWithAI({
      text: incomingText,
      mediaPart,
      fileName,
      languagePreference: isEnglish ? 'en' : 'ar',
      userProfile: profile,
      databaseContext,
      recentMessages: recentHistory,
      isGroupContext: isGroup,
      isGroupDump: isDump,
    });

    // 5. Execute Dashboard Actions (Quizzes, Flashcards, Assignments, Deadlines, Exams, Timetable)
    let actionFeedback = '';
    const actionsToRun = aiResponse.actions?.length ? aiResponse.actions : aiResponse.action;
    if (actionsToRun) {
      const actionResult = await executeBotActions(supabase, userId, actionsToRun, {
        source: 'whatsapp',
        isEnglish,
        isGroupContext: isGroup,
        isGroupDump: isDump,
      });
      actionFeedback = actionResult.combinedFeedback;
    }

    finalReply = aiResponse.reply;
    if (actionFeedback) {
      finalReply += `\n\n${actionFeedback}`;
    }
  } catch (aiErr: any) {
    console.error('Error generating AI reply for student:', aiErr);
    finalReply = isEnglish
      ? "Hey! I encountered a brief glitch processing that. Could you please resend it or tell me what you need?"
      : "أهلاً يا بطل! حصل خطأ بسيط في معالجة رسالتك، ممكن تبعتهالي تاني وأنا معاك على طول.";
  }

  // 6. Record Assistant Reply
  await supabase.from('chat_messages').insert({
    user_id: userId,
    role: 'assistant',
    source: 'whatsapp',
    content: finalReply,
    media_type: 'text',
  });

  // 7. Send WhatsApp Reply back to student
  await sendWhatsAppReply(fromNumber, finalReply);

  // 8. Update reaction to checkmark
  if (messageId && fromNumber) {
    reactWhatsAppMessage(fromNumber, messageId, '✅').catch(() => {});
  }
}
