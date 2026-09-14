/**
 * Meta WhatsApp Cloud API & Twilio integration helper functions.
 * Clean, production-ready, no asterisks formatting.
 */

// Split long responses so they never exceed WhatsApp's 4096-character limit per message
export function splitMessage(text: string, maxLength: number = 3800): string[] {
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

// Clean text for WhatsApp: strip all asterisks and markdown bolding so it's pure normal human font
export function formatForWhatsApp(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1') // strip all bold/italic asterisks completely
    .replace(/\*/g, '')                     // strip residual asterisks
    .replace(/^#{1,4}\s+(.+)$/gm, '$1')     // clean headers
    .replace(/^-\s+/gm, '• ')
    .trim();
}

// Mark incoming message as read immediately (shows instant blue checkmarks to the student)
export async function markWhatsAppAsRead(messageId: string) {
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
export async function reactWhatsAppMessage(to: string, messageId: string, emoji: string) {
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

// Send standard text message back using Meta WhatsApp Cloud API or Twilio WhatsApp API
export async function sendWhatsAppReply(to: string, text: string): Promise<boolean> {
  const formattedText = formatForWhatsApp(text);
  const chunks = splitMessage(formattedText, 3800);

  // Option 1: Meta WhatsApp Cloud API
  const metaAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const metaPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (metaAccessToken && metaPhoneNumberId) {
    let allOk = true;
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
          allOk = false;
          const errJson = await res.text();
          console.error(`Meta WhatsApp send error (HTTP ${res.status}) to ${to}:`, errJson);
        }
      } catch (err) {
        allOk = false;
        console.error('Failed to send WhatsApp message via Meta API:', err);
      }
    }
    return allOk;
  }

  // Option 2: Twilio WhatsApp API
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

  if (twilioSid && twilioAuth) {
    let allOk = true;
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
          allOk = false;
          const errJson = await res.text();
          console.error('Twilio WhatsApp send error:', errJson);
        }
      } catch (err) {
        allOk = false;
        console.error('Failed to send WhatsApp message via Twilio API:', err);
      }
    }
    return allOk;
  }

  console.log(`[WhatsApp Local / Mock Reply to ${to}]: ${formattedText}`);
  return true;
}

export interface WhatsAppButton {
  id: string;
  title: string; // Max 20 characters per button in Meta Cloud API
}

/**
 * Send interactive quick-reply buttons via Meta WhatsApp Cloud API.
 * Falls back to plain text with bullet points if Meta buttons fail or if Twilio is used.
 */
export async function sendWhatsAppInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: WhatsAppButton[]
): Promise<boolean> {
  const metaAccessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const metaPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const formattedBody = formatForWhatsApp(bodyText);
  // Meta Cloud API allows max 3 buttons of type 'reply'
  const validButtons = buttons.slice(0, 3).map((b) => ({
    type: 'reply',
    reply: {
      id: b.id,
      title: b.title.slice(0, 20), // strict Meta 20-char limit
    },
  }));

  if (metaAccessToken && metaPhoneNumberId && validButtons.length > 0) {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/\D/g, ''),
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: formattedBody.slice(0, 1024), // Meta 1024 character limit for interactive body
          },
          action: {
            buttons: validButtons,
          },
        },
      };

      const res = await fetch(`https://graph.facebook.com/v20.0/${metaPhoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        console.log(`✅ [Meta WhatsApp Interactive Buttons Sent] to ${to}`);
        return true;
      } else {
        const errJson = await res.text();
        console.warn(`Meta WhatsApp interactive buttons failed (HTTP ${res.status}):`, errJson);
        // Fall back to sending standard text with numbered button options
      }
    } catch (err) {
      console.error('Error sending Meta WhatsApp interactive buttons:', err);
    }
  }

  // Fallback: send text with buttons presented as simple clean options
  const buttonListText = buttons
    .map((b) => `• [ ${b.title} ]`)
    .join('\n');
  return sendWhatsAppReply(to, `${formattedBody}\n\n${buttonListText}`);
}

// Download WhatsApp Media (PDFs, Images, Audio) via Meta Graph API
export async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
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
