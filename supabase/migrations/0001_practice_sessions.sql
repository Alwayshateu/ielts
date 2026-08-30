-- IELTS Trainer — Practice Session schema (migration 0001).
--
-- Apply this once, top to bottom, in the Supabase SQL Editor.
--
-- What it does:
-- - Adds the Practice Session read model: practice_units + practice_questions.
-- - Adds persistence tables: practice_attempts, practice_answers, practice_annotations.
-- - Enables RLS on all five tables (content is read-only to authenticated users;
--   attempt data is strictly owner-scoped).
--
-- What it does NOT touch:
-- - Legacy tables ielts_questions, history, favorites, wrong_book, profiles.
-- - The get_random_questions RPC used by the legacy /practice screen.
--
-- Safe to re-run: every statement is idempotent (if not exists / or replace /
-- drop-then-create for policies and triggers).
--
-- Rollback (pre-production databases only — this drops user attempt data):
-- drop table if exists public.practice_annotations;
-- drop table if exists public.practice_answers;
-- drop table if exists public.practice_attempts;
-- drop table if exists public.practice_questions;
-- drop table if exists public.practice_units;
-- drop function if exists public.touch_practice_updated_at();

-- ---------------------------------------------------------------------------
-- Timestamp maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_practice_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Practice Units: one full training unit, e.g. a Reading Passage, Listening
-- Section, Writing Task, Speaking Cue Card, or foundation note.
-- ---------------------------------------------------------------------------

create table if not exists public.practice_units (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  skill text not null check (skill in ('foundation', 'reading', 'listening', 'writing', 'speaking')),
  mode text not null check (mode in ('basic', 'progressive', 'challenge')),
  title text not null,
  description text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  material_type text not null check (
    material_type in ('none', 'passage', 'audio', 'writing_prompt', 'speaking_prompt', 'foundation_note')
  ),
  passage_text text,
  audio_url text,
  transcript text,
  asset_url text,
  time_limit_seconds int check (time_limit_seconds is null or time_limit_seconds > 0),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object')
);

create index if not exists practice_units_active_order_idx
  on public.practice_units (skill, mode, title, id)
  where is_active = true;

create index if not exists practice_units_skill_mode_difficulty_idx
  on public.practice_units (skill, mode, difficulty)
  where is_active = true;

drop trigger if exists practice_units_touch_updated_at on public.practice_units;
create trigger practice_units_touch_updated_at
  before update on public.practice_units
  for each row execute function public.touch_practice_updated_at();

-- ---------------------------------------------------------------------------
-- Practice Questions: ordered questions inside a unit. answer_key is jsonb so
-- IELTS-specific formats can grow without changing the current frontend shape.
--
-- external_key holds the stable frontend-authored id (e.g. 'green-roofs-q1') so
-- locally recorded attempt snapshots can be matched back to a DB row.
-- ---------------------------------------------------------------------------

create table if not exists public.practice_questions (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.practice_units(id) on delete cascade,
  external_key text,
  legacy_question_id uuid references public.ielts_questions(id) on delete set null,
  question_number int not null check (question_number > 0),
  question_type text not null check (
    question_type in (
      'multiple_choice',
      'true_false_not_given',
      'sentence_completion',
      'short_answer',
      'writing_task',
      'speaking_response'
    )
  ),
  question_text text not null,
  options jsonb,
  answer_key jsonb not null default '{"answers":[]}'::jsonb,
  explanation text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, question_number),
  unique (unit_id, external_key),
  check (options is null or jsonb_typeof(options) = 'array'),
  check (jsonb_typeof(answer_key) = 'object'),
  check (jsonb_typeof(metadata) = 'object')
);

create index if not exists practice_questions_unit_order_idx
  on public.practice_questions (unit_id, question_number)
  where is_active = true;

create index if not exists practice_questions_external_key_idx
  on public.practice_questions (external_key)
  where external_key is not null;

create index if not exists practice_questions_legacy_question_id_idx
  on public.practice_questions (legacy_question_id)
  where legacy_question_id is not null;

drop trigger if exists practice_questions_touch_updated_at on public.practice_questions;
create trigger practice_questions_touch_updated_at
  before update on public.practice_questions
  for each row execute function public.touch_practice_updated_at();

-- ---------------------------------------------------------------------------
-- Practice Attempts: one recorded run of a unit, owned by one user.
--
-- elapsed_seconds and self_rated_band are explicit columns (not metadata keys)
-- because the History dashboard aggregates and sorts on them.
-- client_attempt_id carries the locally generated id ('<unitId>:<timestamp>') so
-- backfilling localStorage history is idempotent per user.
-- ---------------------------------------------------------------------------

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references public.practice_units(id) on delete cascade,
  client_attempt_id text,
  mode text not null check (mode in ('basic', 'progressive', 'challenge')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  elapsed_seconds int check (elapsed_seconds is null or elapsed_seconds >= 0),
  score numeric check (score is null or (score >= 0 and score <= 100)),
  correct_count int check (correct_count is null or correct_count >= 0),
  incorrect_count int check (incorrect_count is null or incorrect_count >= 0),
  skipped_count int check (skipped_count is null or skipped_count >= 0),
  manual_review_count int check (manual_review_count is null or manual_review_count >= 0),
  objective_total int check (objective_total is null or objective_total >= 0),
  total_count int check (total_count is null or total_count >= 0),
  completion_percent int check (completion_percent is null or (completion_percent between 0 and 100)),
  self_rated_band numeric check (self_rated_band is null or (self_rated_band >= 0 and self_rated_band <= 9)),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_attempt_id),
  check (submitted_at is null or submitted_at >= started_at),
  check (jsonb_typeof(metadata) = 'object')
);

create index if not exists practice_attempts_user_started_idx
  on public.practice_attempts (user_id, started_at desc);

create index if not exists practice_attempts_user_unit_idx
  on public.practice_attempts (user_id, unit_id, started_at desc);

create index if not exists practice_attempts_unit_idx
  on public.practice_attempts (unit_id, started_at desc);

drop trigger if exists practice_attempts_touch_updated_at on public.practice_attempts;
create trigger practice_attempts_touch_updated_at
  before update on public.practice_attempts
  for each row execute function public.touch_practice_updated_at();

-- ---------------------------------------------------------------------------
-- Practice Answers: the per-question snapshot behind the attempt detail page.
--
-- outcome is the source of truth. is_correct is a generated convenience column
-- (true/false for graded answers, null for skipped and manual_review) so writers
-- only ever set outcome and the two can never disagree.
-- ---------------------------------------------------------------------------

create table if not exists public.practice_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.practice_attempts(id) on delete cascade,
  question_id uuid not null references public.practice_questions(id) on delete cascade,
  question_number int check (question_number is null or question_number > 0),
  outcome text not null check (outcome in ('correct', 'incorrect', 'skipped', 'manual_review')),
  user_answer text,
  accepted_answer text,
  is_correct boolean generated always as (
    case
      when outcome = 'correct' then true
      when outcome = 'incorrect' then false
      else null
    end
  ) stored,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id),
  check (jsonb_typeof(metadata) = 'object')
);

create index if not exists practice_answers_attempt_idx
  on public.practice_answers (attempt_id, question_number);

create index if not exists practice_answers_question_idx
  on public.practice_answers (question_id);

create index if not exists practice_answers_review_idx
  on public.practice_answers (attempt_id)
  where outcome in ('incorrect', 'skipped');

-- ---------------------------------------------------------------------------
-- Practice Annotations: persistence target for passage highlights and notes.
-- The frontend is still local-only; this table is ready for when it isn't.
-- ---------------------------------------------------------------------------

create table if not exists public.practice_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references public.practice_units(id) on delete cascade,
  attempt_id uuid references public.practice_attempts(id) on delete cascade,
  paragraph_index int not null check (paragraph_index >= 0),
  start_offset int not null check (start_offset >= 0),
  end_offset int not null,
  selected_text text not null,
  kind text not null check (kind in ('highlight', 'note')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_offset > start_offset),
  check (jsonb_typeof(metadata) = 'object')
);

create index if not exists practice_annotations_user_unit_idx
  on public.practice_annotations (user_id, unit_id, created_at desc);

create index if not exists practice_annotations_attempt_idx
  on public.practice_annotations (attempt_id)
  where attempt_id is not null;

drop trigger if exists practice_annotations_touch_updated_at on public.practice_annotations;
create trigger practice_annotations_touch_updated_at
  before update on public.practice_annotations
  for each row execute function public.touch_practice_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Content (units/questions): readable by any signed-in user, never writable
-- from the client — seeding happens via the SQL Editor or a service role.
-- Attempt data: owner-scoped. No delete policy on attempts/answers, so a client
-- cannot erase its own graded history.
-- ---------------------------------------------------------------------------

alter table public.practice_units enable row level security;
alter table public.practice_questions enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.practice_answers enable row level security;
alter table public.practice_annotations enable row level security;

drop policy if exists "practice_units_select_authenticated" on public.practice_units;
create policy "practice_units_select_authenticated" on public.practice_units
  for select to authenticated using (is_active = true);

drop policy if exists "practice_questions_select_authenticated" on public.practice_questions;
create policy "practice_questions_select_authenticated" on public.practice_questions
  for select to authenticated using (is_active = true);

drop policy if exists "practice_attempts_select_own" on public.practice_attempts;
create policy "practice_attempts_select_own" on public.practice_attempts
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "practice_attempts_insert_own" on public.practice_attempts;
create policy "practice_attempts_insert_own" on public.practice_attempts
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "practice_attempts_update_own" on public.practice_attempts;
create policy "practice_attempts_update_own" on public.practice_attempts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "practice_answers_select_own" on public.practice_answers;
create policy "practice_answers_select_own" on public.practice_answers
  for select to authenticated using (
    exists (
      select 1
      from public.practice_attempts attempts
      where attempts.id = practice_answers.attempt_id
        and attempts.user_id = auth.uid()
    )
  );

drop policy if exists "practice_answers_insert_own" on public.practice_answers;
create policy "practice_answers_insert_own" on public.practice_answers
  for insert to authenticated with check (
    exists (
      select 1
      from public.practice_attempts attempts
      where attempts.id = practice_answers.attempt_id
        and attempts.user_id = auth.uid()
    )
  );

drop policy if exists "practice_annotations_select_own" on public.practice_annotations;
create policy "practice_annotations_select_own" on public.practice_annotations
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "practice_annotations_insert_own" on public.practice_annotations;
create policy "practice_annotations_insert_own" on public.practice_annotations
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "practice_annotations_update_own" on public.practice_annotations;
create policy "practice_annotations_update_own" on public.practice_annotations
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "practice_annotations_delete_own" on public.practice_annotations;
create policy "practice_annotations_delete_own" on public.practice_annotations
  for delete to authenticated using (auth.uid() = user_id);
