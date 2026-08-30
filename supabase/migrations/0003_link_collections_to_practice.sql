-- IELTS Trainer — link wrong book / favorites / history to practice questions (migration 0003).
--
-- Apply this once, top to bottom, in the Supabase SQL Editor.
--
-- Problem this solves:
-- favorites, wrong_book and history each have `question_id uuid not null` with a hard
-- FK to ielts_questions. Practice-session questions live in practice_questions, so they
-- are structurally impossible to record in these tables. That is why a question missed
-- in a Practice Session never reaches the wrong book.
--
-- Approach: make each table accept EITHER a legacy question or a practice question.
--   1. add nullable practice_question_id -> practice_questions(id)
--   2. drop the not-null on question_id
--   3. add a check constraint: exactly one of the two must be set
--   4. replace the old uniqueness with two partial unique indexes, one per source
--
-- Existing rows are untouched: they keep question_id set and practice_question_id null,
-- which already satisfies the new constraint. This migration adds capability only — it
-- deletes nothing and rewrites no data.
--
-- Safe to re-run: guarded with if not exists / if exists throughout.
--
-- Rollback (pre-production only):
-- alter table public.favorites  drop constraint if exists favorites_one_question_source;
-- alter table public.wrong_book drop constraint if exists wrong_book_one_question_source;
-- alter table public.history    drop constraint if exists history_one_question_source;
-- drop index if exists favorites_user_practice_question_key;
-- drop index if exists wrong_book_user_practice_question_key;
-- alter table public.favorites  drop column if exists practice_question_id;
-- alter table public.wrong_book drop column if exists practice_question_id;
-- alter table public.history    drop column if exists practice_question_id;

-- ---------------------------------------------------------------------------
-- 1. New nullable columns pointing at the practice question model
-- ---------------------------------------------------------------------------

alter table public.favorites
  add column if not exists practice_question_id uuid
    references public.practice_questions(id) on delete cascade;

alter table public.wrong_book
  add column if not exists practice_question_id uuid
    references public.practice_questions(id) on delete cascade;

alter table public.history
  add column if not exists practice_question_id uuid
    references public.practice_questions(id) on delete cascade;

-- history also gains attempt context so a session answer can be traced back.
alter table public.history
  add column if not exists practice_attempt_id uuid
    references public.practice_attempts(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. question_id becomes optional (a row may instead reference a practice question)
-- ---------------------------------------------------------------------------

alter table public.favorites  alter column question_id drop not null;
alter table public.wrong_book alter column question_id drop not null;
alter table public.history    alter column question_id drop not null;

-- ---------------------------------------------------------------------------
-- 3. Exactly one question source per row
-- ---------------------------------------------------------------------------

alter table public.favorites  drop constraint if exists favorites_one_question_source;
alter table public.favorites  add  constraint favorites_one_question_source check (
  (question_id is not null and practice_question_id is null)
  or (question_id is null and practice_question_id is not null)
);

alter table public.wrong_book drop constraint if exists wrong_book_one_question_source;
alter table public.wrong_book add  constraint wrong_book_one_question_source check (
  (question_id is not null and practice_question_id is null)
  or (question_id is null and practice_question_id is not null)
);

alter table public.history    drop constraint if exists history_one_question_source;
alter table public.history    add  constraint history_one_question_source check (
  (question_id is not null and practice_question_id is null)
  or (question_id is null and practice_question_id is not null)
);

-- ---------------------------------------------------------------------------
-- 4. Uniqueness per source.
--
-- The original `unique (user_id, question_id)` no longer covers practice rows: in
-- Postgres, nulls are distinct, so many practice rows would all satisfy it. Partial
-- unique indexes give one "already saved?" guarantee per source instead.
-- ---------------------------------------------------------------------------

create unique index if not exists favorites_user_practice_question_key
  on public.favorites (user_id, practice_question_id)
  where practice_question_id is not null;

create unique index if not exists wrong_book_user_practice_question_key
  on public.wrong_book (user_id, practice_question_id)
  where practice_question_id is not null;

create index if not exists favorites_practice_question_idx
  on public.favorites (practice_question_id)
  where practice_question_id is not null;

create index if not exists wrong_book_practice_question_idx
  on public.wrong_book (practice_question_id)
  where practice_question_id is not null;

create index if not exists history_practice_question_idx
  on public.history (practice_question_id)
  where practice_question_id is not null;

create index if not exists history_practice_attempt_idx
  on public.history (practice_attempt_id)
  where practice_attempt_id is not null;

-- ---------------------------------------------------------------------------
-- 5. history gains a delete policy for its owner.
--
-- wrong_book and favorites already allow owner deletes (removing a card is a normal
-- user action). history had insert/select only. Session answers now land here too, and
-- the Settings screen offers "clear my data", so the owner needs to be able to delete.
-- Graded attempt data in practice_attempts remains non-deletable by design.
-- ---------------------------------------------------------------------------

drop policy if exists "history_delete_own" on public.history;
create policy "history_delete_own" on public.history
  for delete to authenticated using (auth.uid() = user_id);
