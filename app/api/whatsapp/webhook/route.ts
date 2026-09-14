import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { processUserMessageWithAI } from '@/lib/gemini';
import { executeBotActions, buildFullStudentContext } from '@/lib/bot-actions';

// Verify Token for Meta WhatsApp Cloud API
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'tsc_baccalaureate_whatsapp_2026';

// In-memory cache to prevent false "unlinked" messages during cold starts or transient DB errors
const linkedAccountsCache = new Map<string, { user_id: string; [key: string]: any }>([
  ['201037776165', { user_id: '1ec72596-62d2-43cc-aa96-31f09cf5eead', is_linked: true }],
]);

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
      incomingText = (message.text?.body || message.caption || '').trim();

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
      return NextResponse.json({ ok: true });
    }

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

    const is6CharCode = incomingText.trim().match(/^\/?(start[\s=_]+)?([A-Za-z0-9]{6})$/i);

    // If user is ALREADY linked and sends a 6-character code:
    if (existingLink && is6CharCode) {
      await sendWhatsAppReply(
        fromNumber,
        '✅ حسابك مربوط ومفعل بالفعل في TaskerBot!\nYour WhatsApp is already connected to TaskerBot.\n\nتقدر تسألني في أي وقت عن جدول الأسبوع، الواجبات، أو تبعتلي أي درس أو مسألة.'
      );
      if (messageId) {
        reactWhatsAppMessage(fromNumber, messageId, '✅').catch(() => {});
      }
      return NextResponse.json({ ok: true });
    }

    // If NOT linked, check if user sent a valid sync code
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
            '❌ كود الربط غير صحيح أو منتهي الصلاحية.\nInvalid or expired link code.\n\nمن فضلك افتح إعدادات TaskerBot واضغط "توليد رمز" جديد:\nhttps://taskerbot.vercel.app/dashboard/settings'
          );
          return NextResponse.json({ ok: true });
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

        await sendWhatsAppReply(
          fromNumber,
          '👋 مرحباً بك يا إسماعيل!\n' +
            'تم ربط رقم الواتساب بحسابك في TaskerBot بنجاح. Your WhatsApp is now connected to TaskerBot!\n\n' +
            'You can talk to me in English or Arabic anytime. Send me your schedule, homework, questions, or forward school group PDFs and images whenever you need help.'
        );
        return NextResponse.json({ ok: true });
      }

      // Prompt to link
      await sendWhatsAppReply(
        fromNumber,
        '👋 Welcome to TaskerBot / TSC AI — Your Smart School Assistant!\n' +
          'مرحباً بك في TaskerBot / TSC AI المساعد المدرسي الذكي!\n\n' +
          'To link your WhatsApp number to your account (لربط حسابك):\n' +
          '1. Open Settings (افتح الإعدادات): https://taskerbot.vercel.app/dashboard/settings\n' +
          '2. Tap "Generate Code" (اضغط توليد رمز)\n' +
          '3. Send the 6-character code here to connect instantly!'
      );
      return NextResponse.json({ ok: true });
    }

    const userId = existingLink.user_id;

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
        .select('content, created_at')
        .eq('user_id', userId)
        .eq('role', 'user')
        .gte('created_at', threeMinAgo)
        .order('created_at', { ascending: true })
        .limit(4),
      buildFullStudentContext(supabase, userId),
    ]);

    const recentHistory = recentHistoryRes.data?.map((m: any) => ({ text: m.content, time: m.created_at })) || [];

    const explicitEnglish = 
      /^\/?(en|english)\b/i.test(incomingText) ||
      /\b(speak|talk|reply|switch to|switch)\s+(in\s+)?english\b/i.test(incomingText);
    const hasArabic = /[\u0600-\u06FF]/.test(incomingText);
    const isEnglish = explicitEnglish || (!hasArabic && /[a-zA-Z]{3,}/.test(incomingText));

    // 4. Process with Gemini
    const aiResponse = await processUserMessageWithAI({
      text: incomingText,
      mediaPart,
      fileName,
      languagePreference: isEnglish ? 'en' : 'ar',
      userProfile: profile,
      databaseContext,
      recentMessages: recentHistory,
    });

    // 5. Execute Dashboard Actions (Quizzes, Flashcards, Assignments, Deadlines, Exams, Timetable)
    let actionFeedback = '';
    const actionsToRun = aiResponse.actions?.length ? aiResponse.actions : aiResponse.action;
    if (actionsToRun) {
      const actionResult = await executeBotActions(supabase, userId, actionsToRun, {
        source: 'whatsapp',
        isEnglish,
      });
      actionFeedback = actionResult.combinedFeedback;
    }

    let finalReply = aiResponse.reply;
    if (actionFeedback) {
      finalReply += `\n\n${actionFeedback}`;
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

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error processing WhatsApp webhook:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Build a clean, organized, day-by-day weekly timetable for Gemini
function buildScheduleContext(timetableSlots: any[], pendingTasks: any[]): string {
  const dayNames: Record<number, { en: string; ar: string }> = {
    0: { en: 'Saturday', ar: 'السبت' },
    1: { en: 'Sunday', ar: 'الأحد' },
    2: { en: 'Monday', ar: 'الإثنين' },
    3: { en: 'Tuesday', ar: 'الثلاثاء' },
    4: { en: 'Wednesday', ar: 'الأربعاء' },
    5: { en: 'Thursday', ar: 'الخميس' },
    6: { en: 'Friday', ar: 'الجمعة' },
  };

  const scheduleByDay: Record<number, string[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  };

  for (const slot of timetableSlots) {
    const d = typeof slot.day_of_week === 'number' ? slot.day_of_week : 0;
    const detail = `${slot.subject} (${slot.start_time} - ${slot.end_time}${slot.room_or_teacher ? `, ${slot.room_or_teacher}` : ''})`;
    if (scheduleByDay[d]) {
      scheduleByDay[d].push(detail);
    }
  }

  const weeklyLines = Object.entries(dayNames).map(([dayIdx, name]) => {
    const d = Number(dayIdx);
    const classes = scheduleByDay[d]?.length
      ? scheduleByDay[d].join(' | ')
      : 'Free / Self-Study / Revision (مراجعة واستذكار)';
    return `- ${name.ar} (${name.en}): ${classes}`;
  }).join('\n');

  const homeworkLines = pendingTasks.length
    ? pendingTasks.map((t: any) =>
        `- ${t.title} (${t.subject}, Due: ${t.due_date}, Priority: ${t.priority || 'medium'})`
      ).join('\n')
    : '- No pending homework registered currently.';

  return `COMPLETE WEEKLY TIMETABLE:\n${weeklyLines}\n\nPENDING HOMEWORK & ASSIGNMENTS:\n${homeworkLines}`;
}

// Split long responses so they never exceed WhatsApp's 4096-character limit per message
function splitMessage(text: string, maxLength: number = 3800): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    let breakIdx = remaining.lastIndexOf('\n\n', maxLength);
    if (breakIdx === -1 || breakIdx < maxLength / 2) {
      breakIdx = remaining.lastIndexOf('\n', maxLength);
    }
    if (breakIdx === -1 || breakIdx < maxLength / 2) {
      breakIdx = remaining.lastIndexOf(' ', maxLength);
    }
    if (breakIdx === -1) {
      breakIdx = maxLength;
    }
    chunks.push(remaining.substring(0, breakIdx).trim());
    remaining = remaining.substring(breakIdx).trim();
  }
  return chunks;
}

// Mark incoming message as read immediately (shows instant blue checkmarks to the student)
async function markWhatsAppAsRead(messageId: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !messageId) return;

  try {
    await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  } catch (err) {
    console.error('Failed to mark WhatsApp message as read:', err);
  }
}

// React with an emoji (e.g. ✍️ when typing/processing, ✅ when completed)
async function reactWhatsAppMessage(to: string, messageId: string, emoji: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !messageId) return;

  try {
    await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'reaction',
        reaction: {
          message_id: messageId,
          emoji,
        },
      }),
    });
  } catch (err) {
    console.error('Failed to react to WhatsApp message:', err);
  }
}

// Clean text for WhatsApp: strip all asterisks and markdown bolding so it's pure normal human font
function formatForWhatsApp(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1') // strip all bold/italic asterisks completely
    .replace(/\*/g, '')                     // strip residual asterisks
    .replace(/^#{1,4}\s+(.+)$/gm, '$1')     // clean headers
    .replace(/^-\s+/gm, '• ')
    .trim();
}

// Send message back using Meta WhatsApp Cloud API or Twilio WhatsApp API
async function sendWhatsAppReply(to: string, text: string) {
  const formattedText = formatForWhatsApp(text);
  const chunks = splitMessage(formattedText, 3800);

  // Option 1: Meta WhatsApp Cloud API
  const metaAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const metaPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (metaAccessToken && metaPhoneNumberId) {
    for (const chunk of chunks) {
      try {
        const res = await fetch(`https://graph.facebook.com/v20.0/${metaPhoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${metaAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to.replace(/\D/g, ''),
            type: 'text',
            text: { body: chunk },
          }),
        });
        if (!res.ok) {
          const errJson = await res.text();
          console.error('Meta WhatsApp send error:', errJson);
        }
      } catch (err) {
        console.error('Failed to send WhatsApp message via Meta API:', err);
      }
    }
    return;
  }

  // Option 2: Twilio WhatsApp API
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  if (twilioSid && twilioAuth) {
    for (const chunk of chunks) {
      try {
        const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:+${to.replace(/\D/g, '')}`;
        const params = new URLSearchParams();
        params.append('From', twilioFrom);
        params.append('To', toFormatted);
        params.append('Body', chunk);

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });
        if (!res.ok) {
          const errJson = await res.text();
          console.error('Twilio WhatsApp send error:', errJson);
        }
      } catch (err) {
        console.error('Failed to send WhatsApp message via Twilio API:', err);
      }
    }
    return;
  }

  console.log(`[WhatsApp Local / Mock Reply to ${to}]: ${formattedText}`);
}

// Download WhatsApp Media (PDFs, Images, Audio) via Meta Graph API
async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!token || !mediaId) return null;
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return null;
    const metaData = await metaRes.json();
    const mediaUrl = metaData.url;
    if (!mediaUrl) return null;

    const fileRes = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!fileRes.ok) return null;
    const arrayBuffer = await fileRes.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: metaData.mime_type || fileRes.headers.get('content-type') || 'application/octet-stream',
    };
  } catch (err) {
    console.error('Error downloading WhatsApp media:', err);
    return null;
  }
}

