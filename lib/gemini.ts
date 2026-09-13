import { GoogleGenerativeAI, Part } from '@google/generative-ai';

export interface AIProcessedMessage {
  action?: {
    type: 'assignment' | 'exam' | 'grade' | 'habit';
    title?: string;
    subject?: string;
    date?: string; // YYYY-MM-DD
    score?: number;
    max_score?: number;
    value?: number;
    unit?: string;
  } | null;
  reply: string;
}

const SYSTEM_PROMPT = `You are "TSC AI" — the dedicated, highly intelligent AI tutor and study mentor for an Egyptian high school student enrolled in the new Egyptian Baccalaureate system (البكالوريا المصرية).

Current date: ${new Date().toISOString().split('T')[0]}.

DIRECTIVES:
1. ALWAYS TALK & BE HELPFUL:
   - Never be silent or give rigid canned responses. Talk like an inspiring, brilliant private tutor.
   - If the student writes in Arabic (Egyptian dialect or MSA), reply in natural, supportive Egyptian Arabic (عامية مصرية راقية ومشجعة). If English, reply in English.
   - Address the student warmly (e.g. "يا بطل" or their name if known).

2. ACADEMIC & DOCUMENT EXPERTISE:
   - When the student sends a PDF file (e.g. textbook lesson, notes, past papers, stories):
     * Thoroughly read and analyze the entire document.
     * Explain the lesson clearly, summarize key concepts, formulas, definitions, and important points for exams.
     * Ask if they want practice questions, summaries, or deeper explanations.
   - When the student sends an image or photo:
     * Solve the question/problem step-by-step with clear reasoning.
   - When the student asks any question or asks to chat:
     * Provide clear, engaging, and accurate answers.

3. DASHBOARD ACTION LOGGING:
   If the student asks to record an assignment, exam, score, or habit:
   Include this tag at the very end of your response:
   ACTION: {"type": "assignment"|"exam"|"grade"|"habit", "title": "...", "subject": "...", "date": "YYYY-MM-DD", "score": number, "max_score": number, "value": number}
   (Only include this tag if an actionable task or score was mentioned. Never include it for general conversation or document explanation).

4. CLEAN, BEAUTIFUL CHAT (STRICT FORMATTING):
   - NEVER use markdown headings (#, ##, ###). Write headers as natural text with bullet points or clean bolding.
   - NEVER use LaTeX math dollar signs ($ or $$). Write all math, equations, numbers, and formulas in clear, natural text (e.g. "1 + 1 = 2" or "V = I × R" or "E = mc²").
   - NEVER put asterisks around numbers or single punctuation (do not write **2** or **=**).
   - NEVER output markdown code blocks unless the student explicitly asks for code or programming.
   - Keep answers cleanly formatted, friendly, and readable directly in WhatsApp, Telegram, and mobile web.
`;

export async function processUserMessageWithAI(options: {
  text?: string;
  mediaPart?: {
    mimeType: string;
    data: string; // Base64
  };
  fileName?: string;
  recentContext?: string;
  userProfile?: {
    full_name?: string;
    study_division?: string;
    target_percentage?: number;
  };
}): Promise<AIProcessedMessage> {
  const { text = '', mediaPart, fileName, recentContext, userProfile } = options;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not configured');
    return {
      action: null,
      reply: text
        ? `👋 مرحباً! تم استلام رسالتك:\n"${text}"\n\nأنا معك دائماً لمساعدتك في كل مواد البكالوريا ومتابعة مهامك ومذاكرتك!`
        : '📚 مرحباً! تم استلام الملف بنجاح.',
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Verified available models in the user's Google API project
  const modelsToTry = [
    'gemini-3.6-flash',
    'gemini-flash-latest',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
    'gemini-pro-latest',
  ];

  let contextPrompt = SYSTEM_PROMPT;
  if (userProfile) {
    contextPrompt += `\nStudent Profile: Name: ${userProfile.full_name || 'Student'}, Track: ${userProfile.study_division || 'General'}, Target: ${userProfile.target_percentage || 95}%.`;
  }
  if (fileName) {
    contextPrompt += `\nAttached file name: "${fileName}".`;
  }
  if (recentContext) {
    contextPrompt += `\nRecent Student Context & Uploaded Documents:\n${recentContext.slice(0, 3000)}`;
  }

  const parts: (string | Part)[] = [{ text: contextPrompt }];

  if (mediaPart) {
    parts.push({
      inlineData: {
        mimeType: mediaPart.mimeType,
        data: mediaPart.data,
      },
    });
  }

  const userInstruction = text.trim()
    ? text
    : fileName
    ? `Please read and analyze this attached file ("${fileName}"). Explain what it is about in detail, give me a comprehensive summary, key takeaways, and ask if I have any questions.`
    : 'Please analyze this content and explain it.';

  parts.push({ text: `Student Input: "${userInstruction}"` });

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.6,
        },
      });

      const result = await model.generateContent(parts);
      let responseText = result.response.text().trim();

      // Check if there is an ACTION tag at the end
      let action: any = null;
      const actionMatch = responseText.match(/ACTION:\s*(\{[\s\S]*\})\s*$/);
      if (actionMatch) {
        try {
          action = JSON.parse(actionMatch[1]);
          // Strip the action tag from user reply
          responseText = responseText.replace(/ACTION:\s*\{[\s\S]*\}\s*$/, '').trim();
        } catch {
          // ignore action parse error
        }
      }

      // Sanitize output so it doesn't have messy $ and ugly *
      responseText = responseText
        .replace(/\$\$([\s\S]*?)\$\$/g, '$1') // remove $$ math blocks
        .replace(/\$([^\$\n]+)\$/g, '$1')   // remove inline $ math markers
        .replace(/\\\(([\s\S]*?)\\\)/g, '$1') // remove \( \)
        .replace(/\\\[([\s\S]*?)\\\]/g, '$1') // remove \[ \]
        .replace(/\*\*(\d+)\*\*/g, '$1')     // remove ** around isolated numbers
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\le/g, '≤')
        .replace(/\\ge/g, '≥');

      if (responseText) {
        return {
          action,
          reply: responseText,
        };
      }
    } catch (modelErr) {
      console.error(`Gemini error with model ${modelName}:`, modelErr);
      // Try next model
    }
  }

  // Graceful fallback
  return {
    action: null,
    reply: `👋 أهلاً بك! لقد استلمت:\n"${text || fileName || 'طلبك'}"\n\nأنا معك دائماً لمساعدتك في كل مواد البكالوريا ومتابعة مذاكرتك!`,
  };
}

export async function classifyTelegramMessage(messageText: string) {
  const result = await processUserMessageWithAI({ text: messageText });
  return {
    type: result.action?.type || 'note',
    confidence: result.action ? 'high' : 'low',
    data: result.action || { text: messageText },
  };
}
