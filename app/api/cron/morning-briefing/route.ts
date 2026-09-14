import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateDailyMorningBriefing } from '@/lib/bot-actions';
import { sendWhatsAppInteractiveButtons, sendWhatsAppReply } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

async function sendTelegramMessage(chatId: number | string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
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
    console.error('Failed to send Telegram morning briefing:', err);
  }
}

export async function GET(req: NextRequest) {
  return handleMorningBriefing(req);
}

export async function POST(req: NextRequest) {
  return handleMorningBriefing(req);
}

async function handleMorningBriefing(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    const { searchParams } = new URL(req.url);
    const querySecret = searchParams.get('secret');

    // If CRON_SECRET is configured, enforce protection (Vercel automatically sends Bearer <CRON_SECRET>)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 });
    }

    const supabase = getSupabaseAdminClient();

    // Query all active linked accounts
    const { data: links, error: linksErr } = await supabase
      .from('telegram_links')
      .select('*')
      .eq('is_linked', true);

    if (linksErr) {
      console.error('Error fetching linked accounts for morning briefing:', linksErr);
      return NextResponse.json({ error: 'Database query error' }, { status: 500 });
    }

    const linkedAccounts = links || [];

    // Fallback: If no links exist yet, also check default student account if configured
    if (linkedAccounts.length === 0) {
      const defaultPhone = '201037776165';
      const defaultUserId = '1ec72596-62d2-43cc-aa96-31f09cf5eead';
      linkedAccounts.push({
        user_id: defaultUserId,
        chat_id: defaultPhone,
        is_linked: true,
      });
    }

    const results: { userId: string; target: string; channel: string; success: boolean }[] = [];

    for (const link of linkedAccounts) {
      try {
        const userId = link.user_id;
        const chatId = String(link.chat_id || '').trim();
        if (!userId || !chatId) continue;

        // Generate personalized morning briefing
        const briefingText = await generateDailyMorningBriefing(supabase, userId, false);

        // Record in chat_messages table so it appears live in the web dashboard
        await supabase.from('chat_messages').insert({
          user_id: userId,
          role: 'assistant',
          source: 'cron',
          content: briefingText,
          media_type: 'text',
        });

        // Determine channel: Phone number (WhatsApp) vs Telegram Chat ID
        const isPhone = /^\+?\d{10,15}$/.test(chatId.replace(/\D/g, ''));

        if (isPhone) {
          // WhatsApp Delivery with 3 Interactive Quick-Action Buttons
          const buttons = [
            { id: 'btn_what_to_study', title: '🧠 أذاكر إيه؟' },
            { id: 'btn_today_schedule', title: '📅 جدول اليوم' },
            { id: 'btn_exam_readiness', title: '🎯 جاهز للامتحان؟' },
          ];

          await sendWhatsAppInteractiveButtons(chatId, briefingText, buttons);
          results.push({ userId, target: chatId, channel: 'whatsapp', success: true });
        } else {
          // Telegram Delivery
          await sendTelegramMessage(chatId, briefingText);
          results.push({ userId, target: chatId, channel: 'telegram', success: true });
        }
      } catch (userErr) {
        console.error(`Error sending briefing to user ${link.user_id}:`, userErr);
        results.push({ userId: link.user_id, target: link.chat_id, channel: 'unknown', success: false });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dispatchedCount: results.filter((r) => r.success).length,
      results,
    });
  } catch (err: any) {
    console.error('Fatal error in morning-briefing cron:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
