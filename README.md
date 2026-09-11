# Thanaweya Dashboard (منصة طالب الثانوية العامة) 🎓

A modern, high-performance school productivity web application built specifically for **Egyptian Thanaweya Amma students**, styled in an **Apple Dark Liquid Glass** aesthetic (deep charcoal/navy, frosted glass panels, specular edge reflections, and electric cyan accents).

Built with **Next.js (App Router)**, **TypeScript**, **Supabase Auth & PostgreSQL (Row Level Security)**, and an integrated **Telegram Memory Bot powered by Google Gemini AI**.

---

## ✨ Features (All 9 Modules Included)

1. **Today View (`/dashboard`)**:
   - Live daily timetable with classes, teacher/center, and time slots.
   - Assignments & homework due today with quick-complete toggles.
   - Quick daily to-do checklist with confetti celebrations.
   - Rotating inspirational Thanaweya motivational quotes in Arabic & English.

2. **Assignments & Deadlines (`/dashboard/assignments`)**:
   - Filter by subject and status (pending / completed).
   - Priority indicators (High, Medium, Low).
   - Sorted automatically by nearest due date.

3. **Exam Countdown (`/dashboard/exams`)**:
   - Live countdown ticker in days and hours.
   - Highlighting exams within 7 days with a pulsing urgency badge.
   - Thanaweya Amma official June finals countdown banner.

4. **Grade Tracker & Simulator (`/dashboard/grades`)**:
   - Per-subject weighted grade tracker.
   - Automatic percentage and cumulative average calculation.
   - **"What do I need on the next test?"** calculator to simulate the exact score needed to reach your target percentage.

5. **Study Planner (`/dashboard/planner`)**:
   - Weekly schedule (Saturday to Friday) with revision blocks.
   - Total planned study hours per subject breakdown.

6. **Pomodoro Focus Timer (`/dashboard/pomodoro`)**:
   - 25/5 and 50/10 min cycles tied to specific subjects.
   - Web Audio API harmonic chime bell synthesizer (zero external audio dependencies).
   - Automatic session logging and weekly focus statistics.

7. **Flashcards & Quiz Engine (`/dashboard/flashcards`)**:
   - Decks organized by subject.
   - Interactive 3D flip card quiz mode (tap to flip).
   - Tracks frequently missed cards and subject mastery percentage.

8. **Habit & Sleep Tracker (`/dashboard/habits`)**:
   - Daily sleep hours logger (target 7.5h for optimal memory consolidation).
   - Revision streak counter with flame animation.
   - 7-day completion matrix grid for custom habits (Fajr, MCQs, Revision).

9. **Quick Notes (`/dashboard/notes`)**:
   - Instant sticky-glass notes with tag filtering and pinning.
   - Direct integration: Notes captured via the Telegram bot appear here automatically tagged `#Telegram`.

10. **Telegram "Memory" Bot & Settings (`/dashboard/settings`)**:
    - Generates a unique 6-character link code.
    - User sends code to the bot to link their Telegram account.
    - Bot sends voice/text messages to **Gemini API**, extracts structured data (`assignment`, `exam`, `grade-info`, `habit`, `note`), and inserts directly into Supabase.

---

## 🚀 Environment Variables (Vercel Dashboard)

Configure the following environment variables in your Vercel Project Settings (`Settings` -> `Environment Variables`):

| Variable Name | Description | Where to Find |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | Supabase Dashboard > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Client Key | Supabase Dashboard > Project Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Secret Key | Supabase Dashboard > Project Settings > API |
| `TELEGRAM_BOT_TOKEN` | BotFather Telegram Bot Token | Created via [@BotFather](https://t.me/botfather) |
| `GEMINI_API_KEY` | Google Gemini API Key | [Google AI Studio](https://aistudio.google.com/) |

---

## 🗄️ Supabase Database Setup

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor**.
3. Open the file [`supabase/schema.sql`](./supabase/schema.sql) in this repo, copy its contents, and run it.
4. This script automatically creates all 12 tables, indexes, triggers, and configures **Row Level Security (RLS)** policies so that each student's data is strictly private to their `auth.uid()`.

---

## 🤖 Telegram Bot Webhook Registration

Once your application is deployed on Vercel:

1. Replace `<TELEGRAM_BOT_TOKEN>` with your BotFather token and `<YOUR_VERCEL_DOMAIN>` with your Vercel domain:
   ```bash
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<YOUR_VERCEL_DOMAIN>/api/telegram/webhook
   ```
2. Paste this URL into your browser address bar and press **Enter**.
3. You will receive: `{"ok":true,"result":true,"description":"Webhook was set"}`.
4. Open the Thanaweya Dashboard, visit `/dashboard/settings`, copy your 6-digit link code, and send it to your bot in Telegram!

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application. If Supabase keys are not set locally, the app automatically runs in **Interactive Demo Mode** with realistic Egyptian Thanaweya Amma sample data.
