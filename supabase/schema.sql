-- IELTS Trainer — schema for a fresh Supabase project.
-- Reconstructed from the app's actual queries (no prior migration history existed).
-- Run this once in the new project's SQL Editor, top to bottom.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ielts_questions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('multiple_choice', 'fill_in_the_blank')),
  category text not null check (category in ('reading', 'listening', 'writing', 'speaking')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  article_content text,
  question_text text not null,
  options text[],
  correct_answer text not null,
  explanation text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.ielts_questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists public.wrong_book (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.ielts_questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id uuid not null references public.ielts_questions (id) on delete cascade,
  user_answer text,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists favorites_user_id_idx on public.favorites (user_id);
create index if not exists wrong_book_user_id_idx on public.wrong_book (user_id);
create index if not exists history_user_id_idx on public.history (user_id);
create index if not exists ielts_questions_category_difficulty_idx
  on public.ielts_questions (category, difficulty)
  where is_active = true;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user signs up
-- (covers both magic-link and anonymous sign-ins; harmless for anonymous
-- since the dashboard only reads profiles when isAnonymous is false).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPC used by the practice screen: pulls one (or more) random question(s),
-- optionally filtered by category / difficulty. `p_category = 'mixed'` or
-- null skips the category filter; null difficulty skips that filter too.
-- ---------------------------------------------------------------------------

create or replace function public.get_random_questions(
  p_category text default null,
  p_difficulty text default null,
  p_limit int default 1
)
returns setof public.ielts_questions
language sql
stable
as $$
  select *
  from public.ielts_questions
  where is_active = true
    and (p_category is null or p_category = 'mixed' or category = p_category)
    and (p_difficulty is null or difficulty = p_difficulty)
  order by random()
  limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.ielts_questions enable row level security;
alter table public.favorites enable row level security;
alter table public.wrong_book enable row level security;
alter table public.history enable row level security;

-- profiles: a user can only read/update their own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- ielts_questions: readable by any signed-in user (anonymous sign-ins count),
-- never writable from the client.
create policy "ielts_questions_select_authenticated" on public.ielts_questions
  for select to authenticated using (true);

-- favorites: fully scoped to the owning user
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);

-- wrong_book: fully scoped to the owning user
create policy "wrong_book_select_own" on public.wrong_book
  for select using (auth.uid() = user_id);
create policy "wrong_book_insert_own" on public.wrong_book
  for insert with check (auth.uid() = user_id);
create policy "wrong_book_delete_own" on public.wrong_book
  for delete using (auth.uid() = user_id);

-- history: write-only from the client today (no screen reads it back yet)
create policy "history_insert_own" on public.history
  for insert with check (auth.uid() = user_id);
create policy "history_select_own" on public.history
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed a handful of sample questions so /practice has something to serve
-- immediately after setup. Safe to delete once real content is imported.
-- ---------------------------------------------------------------------------

insert into public.ielts_questions
  (type, category, difficulty, article_content, question_text, options, correct_answer, explanation)
values
  (
    'multiple_choice', 'reading', 'easy', null,
    'According to common IELTS advice, skimming a passage before answering questions mainly helps you to:',
    array['memorize every word', 'get a general sense of structure and main ideas', 'guess the writer''s nationality', 'count the paragraphs'],
    'get a general sense of structure and main ideas',
    '略读（skimming）的目的是快速建立文章结构和主旨的整体印象，而不是记忆细节。'
  ),
  (
    'multiple_choice', 'listening', 'easy', null,
    'In IELTS Listening Section 1, the conversation is typically between:',
    array['two academics discussing research', 'two people in an everyday social context', 'a lecturer and a group of students', 'a radio host and a guest'],
    'two people in an everyday social context',
    'Section 1 通常是日常场景下两人之间的对话，例如预订、咨询等。'
  ),
  (
    'fill_in_the_blank', 'writing', 'medium', null,
    'Task 2 essays should typically be organized into an introduction, body paragraphs, and a ______.',
    null,
    'conclusion',
    '标准的 Task 2 结构为引言、主体段落和结论段。'
  ),
  (
    'multiple_choice', 'speaking', 'medium', null,
    'In IELTS Speaking Part 2, how long do you have to speak after your one minute of preparation?',
    array['30 seconds to 1 minute', '1 to 2 minutes', '3 to 4 minutes', 'as long as you like'],
    '1 to 2 minutes',
    'Part 2 要求准备 1 分钟后，连续讲述 1 到 2 分钟。'
  ),
  (
    'multiple_choice', 'reading', 'hard', null,
    'A "True / False / Not Given" question should be answered "Not Given" when:',
    array['the statement directly contradicts the passage', 'the passage does not mention the information at all', 'the statement matches the passage exactly', 'you are unsure and want to guess'],
    'the passage does not mention the information at all',
    '当文章中完全没有提及该信息时，应选择 Not Given，而不是靠猜测。'
  )
on conflict do nothing;
