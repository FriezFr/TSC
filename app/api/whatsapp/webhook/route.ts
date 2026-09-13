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

    // 1. Account Linking: Check if this WhatsApp number is already linked
    const { data: existingLink } = await supabase
      .from('telegram_links')
      .select('*')
      .eq('chat_id', fromNumber.replace(/\D/g, ''))
      .eq('is_linked', true)
      .maybeSingle();

    // If NOT linked, check if user sent a 6-character sync code
    if (!existingLink) {
      const linkMatch = incomingText.match(/^\/?(start[\s=_]+)?([A-Za-z0-9]{6})$/i);

      if (linkMatch) {
        const code = linkMatch[2].toUpperCase();
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
            '❌ كود الربط غير صحيح أو منتهي الصلاحية.\n\nمن فضلك افتح إعدادات TTASKER واضغط "توليد رمز" جديد:\nhttps://tsctasker.vercel.app/dashboard/settings'
          );
          return NextResponse.json({ ok: true });
        }

        // Link this WhatsApp number (storing numeric phone in chat_id)
        await supabase
          .from('telegram_links')
          .update({
            chat_id: fromNumber.replace(/\D/g, ''),
            is_linked: true,
            linked_at: new Date().toISOString(),
          })
          .eq('id', linkRecord.id);

        await sendWhatsAppReply(
          fromNumber,
          '🎉 تم ربط رقم الواتساب بحسابك في TTASKER بنجاح يا بطل!\n\n' +
            '🤖 أنا مساعدك الشخصي في البكالوريا المصرية ومجموعات المدرسة.\n\n' +
            'من دلوقتي تقدر:\n' +
            '• تحول رسايل جروبات المدرسة (تعديل حصص، إلغاء، واجبات) وهسجلها تلقائياً!\n' +
            '• تسألني في أي وقت: "جدولي إيه بكرة؟" أو "إيه الواجب اللي عليا؟"\n' +
            '• تطلب خطة مذاكرة: "اعملي خطة مذاكرة للنهاردة"\n' +
            '• تسألني في أي مسألة أو تبعت صورة/PDF وهشرحهالك فوراً!'
        );
        return NextResponse.json({ ok: true });
      }

      // Prompt to link
      await sendWhatsAppReply(
        fromNumber,
        '👋 مرحباً بك في مساعد TTASKER الذكي للبكالوريا المصرية!\n\n' +
          'لربط رقمك بحسابك في الموقع:\n' +
          '1. افتح الإعدادات: https://tsctasker.vercel.app/dashboard/settings\n' +
          '2. اضغط "توليد رمز" (Generate Code)\n' +
          '3. أرسل الرمز المكون من 6 حروف هنا لربط الحساب فوراً!'
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

    // 3. Record User Incoming Message
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'user',
      source: 'whatsapp',
      content: incomingText,
      media_type: 'text',
    });

    // 4. Multi-Message Context & Schedule Context
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

    const scheduleContext = `Scheduled Classes: ${timetableSlots.map((s: any) => `Day ${s.day_of_week}: ${s.subject} (${s.start_time}-${s.end_time})`).join(', ') || 'None'}\nPending Homework: ${pendingTasks.map((t: any) => `${t.title} (${t.subject}, Due: ${t.due_date})`).join(', ') || 'None'}`;
    const recentNotes = recentNotesRes.data?.map((n: any) => n.content).join('\n---\n');

    // 5. Process with Gemini
    const aiResponse = await processUserMessageWithAI({
      text: incomingText,
      userProfile: profile,
      scheduleContext,
      recentMessages: recentHistory,
      recentContext: recentNotes || undefined,
    });

    // 6. Execute Dashboard Action if actionable and confidence >= 0.70
    let actionFeedback = '';
    if (aiResponse.action && (aiResponse.confidence ?? 1.0) >= 0.7) {
      actionFeedback = await executeWhatsAppAction(supabase, userId, aiResponse.action);
    }

    let finalReply = aiResponse.reply;
    if (actionFeedback) {
      finalReply += `\n\n${actionFeedback}`;
    }

    // 7. Record Assistant Reply
    await supabase.from('chat_messages').insert({
      user_id: userId,
      role: 'assistant',
      source: 'whatsapp',
      content: finalReply,
      media_type: 'text',
    });

    // 8. Send WhatsApp Reply back to student
    await sendWhatsAppReply(fromNumber, finalReply);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Error processing WhatsApp webhook:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function executeWhatsAppAction(supabase: any, userId: string, action: any): Promise<string> {
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

      const { data: existingSlots } = await supabase
        .from('timetable')
        .select('*')
        .eq('user_id', userId)
        .ilike('subject', subject);

      const targetSlot = existingSlots?.[0];

      if (targetSlot) {
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
          source: 'whatsapp',
          target_id: targetSlot.id,
          target_table: 'timetable',
          previous_state: targetSlot,
        });

        return `🔄 تم تعديل موعد حصة ${subject} في جدولك!`;
      } else {
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
          source: 'whatsapp',
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
          description: `تم حذف الحصة بناءً على رسالة مجموعة المدرسة`,
          source: 'whatsapp',
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

      const { data: existingA } = await supabase
        .from('assignments')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', title)
        .ilike('subject', subject)
        .maybeSingle();

      if (existingA) {
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
        source: 'whatsapp',
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
        source: 'whatsapp',
        target_id: newExam?.id,
        target_table: 'exams',
        previous_state: null,
      });

      return `📅 تم تسجيل امتحان ${subject} يوم ${examDate}.`;
    }
  } catch (err) {
    console.error('Error executing WhatsApp action:', err);
  }
  return '';
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
