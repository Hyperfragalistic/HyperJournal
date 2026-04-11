# HyperJournal — Setup & Deployment Guide

## Folder Structure

```
hyperjournal/
├── .env.local.example          # Environment variable template
├── .gitignore
├── next.config.ts              # Next.js config (PWA enabled)
├── package.json
├── tailwind.config.ts          # Hyperliquid brand colors
├── tsconfig.json
├── postcss.config.js
├── components.json             # shadcn/ui config
├── public/
│   └── manifest.json           # PWA manifest
├── supabase/
│   └── schema.sql              # Full DB schema (run in Supabase SQL Editor)
└── src/
    ├── middleware.ts            # Auth middleware (route protection)
    ├── app/
    │   ├── layout.tsx           # Root layout
    │   ├── page.tsx             # Redirect to /dashboard or /login
    │   ├── globals.css          # Global styles + Hyperliquid brand
    │   ├── providers.tsx        # QueryClient + Auth provider
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── (dashboard)/
    │   │   ├── layout.tsx       # Sidebar layout (auth guard)
    │   │   ├── dashboard/page.tsx
    │   │   ├── journal/page.tsx
    │   │   ├── analytics/page.tsx
    │   │   ├── playbooks/page.tsx
    │   │   ├── coach/page.tsx   ← Voice-first AI coach (centerpiece)
    │   │   └── settings/page.tsx
    │   └── api/
    │       ├── coach/route.ts   ← Streaming AI coach endpoint
    │       └── trades/sync/route.ts ← Hyperliquid sync endpoint
    ├── components/
    │   ├── layout/
    │   │   └── Sidebar.tsx
    │   └── coach/
    │       ├── CoachChat.tsx
    │       ├── VoiceControls.tsx  ← Mic button + listening animation
    │       └── MessageBubble.tsx
    ├── hooks/
    │   ├── useVoice.ts          ← SpeechRecognition + SpeechSynthesis hook
    │   ├── useTrades.ts
    │   └── (useHyperliquid.ts)
    ├── stores/
    │   └── useAppStore.ts       ← Zustand: app state + coach session state
    └── lib/
        ├── utils.ts
        ├── supabase/
        │   ├── client.ts        ← Browser Supabase client
        │   ├── server.ts        ← Server Supabase client
        │   └── types.ts         ← Full DB type definitions
        ├── hyperliquid/
        │   ├── api.ts           ← Hyperliquid Info endpoint calls
        │   ├── websocket.ts     ← WebSocket manager with auto-reconnect
        │   └── types.ts
        └── anthropic/
            ├── coach.ts         ← System prompt builder, streaming, profile updater
            └── embeddings.ts    ← Voyage AI / pseudo-embedding
```

---

## 1. Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic API key](https://console.anthropic.com)
- (Optional but recommended) A [Voyage AI API key](https://voyageai.com) for real embeddings

---

## 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Voyage AI for production embeddings
# VOYAGE_API_KEY=pa-...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 3. Supabase Setup

### 3a. Enable pgvector

In your Supabase project → **Database → Extensions**, enable `vector`.

Or run in the SQL Editor:
```sql
create extension if not exists vector with schema extensions;
```

### 3b. Run the schema

In **SQL Editor**, paste and run the full contents of `supabase/schema.sql`.

This creates:
- `profiles` — user settings including voice preferences and trading profile
- `trades` — trade records with pgvector embeddings
- `playbooks` — strategy documentation
- `coaching_sessions` — full session history with embeddings
- `journal_entries` — standalone journal entries
- `sync_state` — Hyperliquid sync tracking
- `daily_stats` — pre-computed performance data
- `match_trades()` and `match_coaching_sessions()` — RAG similarity functions

### 3c. Configure Auth

In **Authentication → Settings**:
- Enable Email/Password
- (Optional) Enable Magic Links
- Set Site URL to your domain (e.g., `https://hyperjournal.vercel.app`)
- Add `http://localhost:3000` to allowed redirect URLs for dev

---

## 4. Install Dependencies

```bash
cd hyperjournal
npm install
```

### Install shadcn/ui components

```bash
npx shadcn@latest init
# Accept defaults, choose dark mode, slate base color

# Install required components:
npx shadcn@latest add button input label select switch tabs toast dialog
```

---

## 5. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

---

## 6. Voice Features

The voice coaching system uses two browser APIs:

### SpeechRecognition (voice input)
- **Supported**: Chrome, Edge, Safari 14.1+
- **Not supported**: Firefox
- Users need to grant microphone permission on first use
- Interim results show in a speech bubble while the user speaks
- Final transcript is auto-sent or user can review before sending

### SpeechSynthesis (voice output)
- **Supported**: All modern browsers
- Coach responses are split into sentences for natural pacing
- Rate and pitch configurable per user in Settings
- Best voices: Chrome has "Google" voices; macOS has "Samantha"

---

## 7. AI Coach Architecture

```
User speaks/types
       ↓
/api/coach (POST, streaming SSE)
       ↓
  1. Auth check (Supabase)
  2. Fetch recent trades since last session
  3. Fetch past coaching sessions (last 3)
  4. RAG: semantic search for relevant sessions via pgvector
  5. Build system prompt:
     - User trading profile
     - Recent trades summary
     - Past session context
     - Mandatory coaching flow (summary → psychology → technical → recommendations)
  6. Stream Claude response via Anthropic SDK
       ↓
Client receives stream → renders text + speaks it aloud
       ↓
Post-session (async):
  7. Extract structured insights (psychology, technical, recommendations)
  8. Generate embedding for the session
  9. Save coaching session to Supabase
 10. Update trading profile with new insights
```

The `trading_profile` JSON in the `profiles` table evolves after every session, building a richer psychological picture of the trader over time.

---

## 8. Hyperliquid Data Sync

Users connect their wallet by entering their public `0x` address (read-only — no private key needed).

**Sync flow:**
1. User enters address in Settings → clicks Save → clicks Sync
2. `POST /api/trades/sync` fetches fills from `https://api.hyperliquid.xyz/info`
3. Fills are normalized and upserted into the `trades` table
4. Each trade gets a pgvector embedding for RAG
5. Sync state is updated with timestamp for incremental future syncs

**Incremental syncs** use `last_fill_time` to only fetch new fills.

---

## 9. Deploy to Vercel

```bash
npm install -g vercel
vercel deploy
```

Or connect your GitHub repo to Vercel:

1. Push to GitHub
2. Import project at vercel.com
3. Add all environment variables from `.env.local`
4. Set Framework: **Next.js**
5. Deploy

**Important Vercel settings:**
- Set `maxDuration = 60` is already configured on the coach and sync routes
- Enable **Streaming** in Vercel project settings if you have a Pro plan for the coach SSE route

---

## 10. Required Environment Variables Summary

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role (server-only) |
| `ANTHROPIC_API_KEY` | ✅ | Anthropic API key (server-only) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Your deployment URL |
| `VOYAGE_API_KEY` | Optional | Voyage AI for real semantic embeddings |

---

## 11. Adding shadcn/ui Components

Some pages use Radix/shadcn primitives. If you see import errors, install the needed component:

```bash
npx shadcn@latest add [component-name]
```

Or install all at once:
```bash
npx shadcn@latest add button input label select switch tabs toast dialog badge scroll-area separator dropdown-menu
```

---

## 12. PWA Installation

HyperJournal is installable as a PWA. After deployment:

- **Desktop Chrome**: Click the install icon in the address bar
- **Mobile Chrome**: Tap "Add to Home Screen" from the browser menu
- **iOS Safari**: Share → Add to Home Screen

---

## 13. Extending the App

### Adding new pages
Add a file under `src/app/(dashboard)/your-page/page.tsx` — it automatically gets the sidebar layout and auth guard.

### Adding new Hyperliquid data
Extend `src/lib/hyperliquid/api.ts` with new endpoint calls. The Hyperliquid Info API docs: `https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api`

### Updating the coach system prompt
Edit `src/lib/anthropic/coach.ts` → `buildCoachSystemPrompt()`. The structured sections are clearly labeled.

### Adding new chart types
Add to `src/app/(dashboard)/analytics/page.tsx` using Recharts components already imported.

---

## 14. Security Notes

- The Anthropic API key is **never exposed to the client**. All coach calls go through `/api/coach`.
- The Supabase service role key is **server-only** (only used in API routes).
- All database tables have Row Level Security (RLS) policies — users can only read/write their own data.
- Wallet addresses are **read-only** — no private keys are ever requested or stored.
