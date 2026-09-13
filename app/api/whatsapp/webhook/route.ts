import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { processUserMessageWithAI } from '@/lib/gemini';

// Verify Token for Meta WhatsApp Cloud API
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'tsc_baccalaureate_whatsapp_2026';

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

    // Check if Meta Cloud API (JSON) or Twilio (x-www-form-urlencoded)
    if (contentType.includes('application/json')) {
      const body = await req.json();

      // Meta Cloud API structure
      const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message) {
        return NextResponse.json({ status: 'ignored', note: 'No message in payload' });
      }

      fromNumber = message.from; // e.g. "201012345678"
      incomingText = (message.text?.body || message.caption || '').trim();
    } else {
      // Twilio WhatsApp form-data structure
      const formData = await req.formData();
      fromNumber = (formData.get('From') as string || '').replace('whatsapp:', '');
      incomingText = (formData.get('Body') as string || '').trim();
    }

    if (!fromNumber || !incomingText) {
      return NextResponse.json({ ok: true });
    }

    const supabase = getSupabaseAdminClient();

    // 1. Link or Find Student Account
    // Check if phone number is linked or check link code
    const { data: linkRecord } = await supabase
      .from('telegram_links') // Can share or store whatsapp links
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const userId = linkRecord?.user_id;

    if (!userId) {
      // If no linked account, reply with instruction
      await sendWhatsAppReply(
        fromNumber,
        '👋 Welcome to the Egyptian Baccalaureate AI Assistant!\n\nPlease link your account in the Web Dashboard Settings: https://tsctasker.vercel.app/dashboard/settings'
      );
      return NextResponse.json({ ok: true });
    }

    // 2. Fetch Student Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // 3. Record User Message to chat_messages
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'user',
      source: 'whatsapp',
      content: incomingText,
      media_type: 'text',
    });

    // 4. Process with Gemini 3.6 Flash
    const aiResponse = await processUserMessageWithAI({
      text: incomingText,
      userProfile: profile,
    });

    // 5. Execute Dashboard Action (homework, exam, grade, habits)
    if (aiResponse.action) {
      await executeAction(supabase, userId, aiResponse.action);
    }

    // 6. Record Assistant Reply
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      source: 'whatsapp',
      content: aiResponse.reply,
      media_type: 'text',
    });

    // 7. Send WhatsApp Reply back to student
    await sendWhatsAppReply(fromNumber, aiResponse.reply);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error processing WhatsApp webhook:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Clean markdown for WhatsApp (convert ** to *, headings to bold, bullets to •)
function formatForWhatsApp(text: string): string {
  if (!text) return '';
  return text
    // Replace markdown headers (# Header, ## Header) with *Header*
    .replace(/^#{1,4}\s+(.+)$/gm, '*$1*')
    // Convert double asterisks **bold** to single asterisk *bold* (WhatsApp native bold)
    .replace(/\*\*([^*]+)\*\*/g, '*$1*')
    // Replace - item with • item
    .replace(/^-\s+/gm, '• ')
    .trim();
}

// Send message back using Meta WhatsApp Cloud API
async function sendWhatsAppReply(to: string, text: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const formattedText = formatForWhatsApp(text);

  if (!accessToken || !phoneNumberId) {
    console.log(`[WhatsApp Mock Reply to ${to}]: ${formattedText}`);
    return;
  }

  try {
    await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: formattedText },
      }),
    });
  } catch (err) {
    console.error('Failed to send WhatsApp message via Meta API:', err);
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
        title: data.title || `WhatsApp Log (${today})`,
        score,
        max_score: maxScore,
        weight: 1.0,
        date: today,
      });
    }
  } catch (err) {
    console.error('Error executing dashboard action in WhatsApp webhook:', err);
  }
}
