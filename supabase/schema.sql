-- ============================================================
-- HyperJournal Database Schema
-- Run in Supabase SQL Editor
-- Requires: pgvector extension
-- ============================================================

-- Enable pgvector for embeddings / RAG memory
create extension if not exists vector with schema extensions;

-- ============================================================
-- USER PROFILES
-- ============================================================
create table if not exists public.profiles (
  id              uuid references auth.users on delete cascade primary key,
  email           text,
  display_name    text,
  avatar_url      text,

  -- Hyperliquid wallet
  hl_address      text unique,
  hl_connected_at timestamptz,

  -- Voice / Coach settings
  voice_mode_enabled     boolean  default true,
  voice_rate             numeric  default 1.0,
  voice_pitch            numeric  default 1.0,
  preferred_voice_uri    text,
  last_coaching_session  timestamptz,

  -- Trading profile (evolves with AI coach analysis)
  trading_profile        jsonb    default '{}',

  -- Subscription / tier
  tier               text     default 'free',

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile"    on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- TRADES
-- ============================================================
create table if not exists public.trades (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade not null,

  -- Hyperliquid identifiers
  hl_trade_id     text,
  hl_order_id     text,
  hl_fill_id      text unique,

  -- Trade details
  coin            text not null,
  direction       text not null check (direction in ('long', 'short')),
  entry_price     numeric(20, 8),
  exit_price      numeric(20, 8),
  size            numeric(20, 8),
  notional_value  numeric(20, 8),
  leverage        numeric(10, 2) default 1,

  -- P&L
  pnl             numeric(20, 8),
  pnl_percent     numeric(10, 4),
  fees            numeric(20, 8) default 0,
  net_pnl         numeric(20, 8),

  -- Timing
  entry_time      timestamptz,
  exit_time       timestamptz,
  duration_secs   integer,

  -- Execution quality
  entry_type      text check (entry_type in ('market', 'limit', 'stop', 'twap')),
  exit_type       text check (exit_type in ('market', 'limit', 'stop', 'tp', 'sl', 'liquidation')),
  slippage        numeric(10, 6),

  -- Risk
  max_adverse_excursion numeric(20, 8),
  max_favorable_excursion numeric(20, 8),
  risk_reward_ratio numeric(10, 4),

  -- Journal fields
  setup_tag       text,
  playbook_id     uuid,
  notes           text,
  emotion_before  text check (emotion_before in ('confident', 'anxious', 'neutral', 'excited', 'fearful', 'greedy', 'focused', 'distracted')),
  emotion_after   text check (emotion_after in ('satisfied', 'regretful', 'neutral', 'frustrated', 'relieved', 'overconfident', 'disciplined')),
  rating          integer check (rating between 1 and 5),
  mistakes        text[],
  tags            text[],

  -- Raw data from Hyperliquid
  raw_data        jsonb,

  -- Status
  status          text default 'closed' check (status in ('open', 'closed', 'liquidated')),

  -- Embedding for RAG
  embedding       extensions.vector(1536),

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index trades_user_id_idx on public.trades(user_id);
create index trades_entry_time_idx on public.trades(entry_time desc);
create index trades_coin_idx on public.trades(coin);
create index trades_embedding_idx on public.trades using ivfflat (embedding extensions.vector_cosine_ops);

alter table public.trades enable row level security;
create policy "Users can CRUD own trades" on public.trades for all using (auth.uid() = user_id);

-- ============================================================
-- PLAYBOOKS
-- ============================================================
create table if not exists public.playbooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  name        text not null,
  description text,
  setup_rules text,
  entry_rules text,
  exit_rules  text,
  risk_rules  text,
  tags        text[],
  coin_filter text[],
  is_active   boolean default true,
  trade_count integer default 0,
  win_rate    numeric(5, 2),
  avg_rr      numeric(10, 4),
  total_pnl   numeric(20, 8),
  color       text default '#97FCE4',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.playbooks enable row level security;
create policy "Users can CRUD own playbooks" on public.playbooks for all using (auth.uid() = user_id);

-- ============================================================
-- COACHING SESSIONS
-- ============================================================
create table if not exists public.coaching_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade not null,
  session_type    text default 'text' check (session_type in ('text', 'voice')),

  -- Session content
  messages        jsonb default '[]',   -- Array of {role, content, timestamp}
  session_summary text,

  -- What was analyzed
  trades_analyzed uuid[],
  date_range_start timestamptz,
  date_range_end   timestamptz,

  -- Structured insights extracted by AI
  psychological_insights jsonb,   -- {patterns, biases, emotions, strengths, weaknesses}
  technical_insights     jsonb,   -- {risk_management, entry_quality, exit_quality}
  recommendations        text[],

  -- Trading profile snapshot at time of session
  profile_snapshot jsonb,

  -- Metadata
  duration_secs   integer,
  token_count     integer,

  -- Embedding for RAG retrieval
  embedding       extensions.vector(1536),

  created_at  timestamptz default now()
);

create index coaching_sessions_user_id_idx on public.coaching_sessions(user_id);
create index coaching_sessions_created_at_idx on public.coaching_sessions(created_at desc);
create index coaching_sessions_embedding_idx on public.coaching_sessions
  using ivfflat (embedding extensions.vector_cosine_ops);

alter table public.coaching_sessions enable row level security;
create policy "Users can CRUD own coaching sessions"
  on public.coaching_sessions for all using (auth.uid() = user_id);

-- ============================================================
-- JOURNAL ENTRIES (standalone, can link to trades)
-- ============================================================
create table if not exists public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  trade_id    uuid references public.trades(id) on delete set null,
  title       text,
  content     text,
  mood        text,
  tags        text[],
  attachments jsonb default '[]',
  embedding   extensions.vector(1536),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.journal_entries enable row level security;
create policy "Users can CRUD own journal entries"
  on public.journal_entries for all using (auth.uid() = user_id);

-- ============================================================
-- SYNC STATE
-- ============================================================
create table if not exists public.sync_state (
  user_id       uuid references public.profiles(id) on delete cascade primary key,
  last_synced   timestamptz,
  last_fill_time bigint,   -- Hyperliquid timestamp of last synced fill
  sync_status   text default 'idle' check (sync_status in ('idle', 'syncing', 'error')),
  error_message text,
  total_trades_synced integer default 0,
  updated_at  timestamptz default now()
);

alter table public.sync_state enable row level security;
create policy "Users can manage own sync state" on public.sync_state for all using (auth.uid() = user_id);

-- ============================================================
-- DAILY STATISTICS (pre-computed for performance)
-- ============================================================
create table if not exists public.daily_stats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  date        date not null,
  trade_count integer default 0,
  win_count   integer default 0,
  loss_count  integer default 0,
  gross_pnl   numeric(20, 8) default 0,
  net_pnl     numeric(20, 8) default 0,
  fees        numeric(20, 8) default 0,
  win_rate    numeric(5, 2),
  avg_rr      numeric(10, 4),
  best_trade  numeric(20, 8),
  worst_trade numeric(20, 8),
  unique(user_id, date)
);

alter table public.daily_stats enable row level security;
create policy "Users can manage own daily stats" on public.daily_stats for all using (auth.uid() = user_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Similarity search for RAG
create or replace function public.match_trades(
  query_embedding extensions.vector(1536),
  match_user_id   uuid,
  match_threshold float default 0.7,
  match_count     int   default 5
)
returns table (
  id              uuid,
  coin            text,
  direction       text,
  pnl             numeric,
  entry_time      timestamptz,
  notes           text,
  similarity      float
)
language plpgsql as $$
begin
  return query
  select
    t.id,
    t.coin,
    t.direction,
    t.pnl,
    t.entry_time,
    t.notes,
    1 - (t.embedding <=> query_embedding) as similarity
  from public.trades t
  where t.user_id = match_user_id
    and t.embedding is not null
    and 1 - (t.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;

-- Similarity search for coaching sessions
create or replace function public.match_coaching_sessions(
  query_embedding extensions.vector(1536),
  match_user_id   uuid,
  match_threshold float default 0.6,
  match_count     int   default 3
)
returns table (
  id                     uuid,
  session_summary        text,
  psychological_insights jsonb,
  recommendations        text[],
  created_at             timestamptz,
  similarity             float
)
language plpgsql as $$
begin
  return query
  select
    cs.id,
    cs.session_summary,
    cs.psychological_insights,
    cs.recommendations,
    cs.created_at,
    1 - (cs.embedding <=> query_embedding) as similarity
  from public.coaching_sessions cs
  where cs.user_id = match_user_id
    and cs.embedding is not null
    and 1 - (cs.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;

-- Update updated_at timestamp automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_trades_updated_at
  before update on public.trades
  for each row execute procedure public.set_updated_at();

create trigger set_playbooks_updated_at
  before update on public.playbooks
  for each row execute procedure public.set_updated_at();
