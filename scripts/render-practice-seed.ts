// Pure renderer: sample practice units -> the 0002 seed SQL string.
//
// Extracted from generate-practice-seed.mjs so the exact same output can be
// asserted in a test (the seed must never drift from the samples). No file I/O
// here — the CLI wrapper writes the result; the drift test compares against it.

import type { PracticeUnit } from '../src/lib/types';

/** Quote a value as a Postgres literal. Uses dollar-quoting for anything multi-line. */
function lit(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  const text = String(value);
  if (text.includes('\n') || text.includes("'")) {
    let tag = '$t$';
    let n = 0;
    while (text.includes(tag)) tag = `$t${++n}$`;
    return `${tag}${text}${tag}`;
  }
  return `'${text}'`;
}

function jsonLit(value: unknown): string {
  if (value === null || value === undefined) return 'null::jsonb';
  const text = JSON.stringify(value);
  let tag = '$j$';
  let n = 0;
  while (text.includes(tag)) tag = `$j${++n}$`;
  return `${tag}${text}${tag}::jsonb`;
}

function num(value: number | null | undefined): string {
  return value === null || value === undefined ? 'null' : String(value);
}

/** Render the full, idempotent seed migration for the given units. */
export function renderPracticeSeedSql(units: PracticeUnit[]): string {
  const parts: string[] = [];

  parts.push(`-- IELTS Trainer — practice sample seed (migration 0002).
--
-- GENERATED FILE. Do not edit by hand.
-- Source: src/lib/practice-session-samples.ts
-- Regenerate: node scripts/generate-practice-seed.mjs
--
-- Apply after 0001_practice_sessions.sql. Idempotent: units upsert on slug,
-- questions upsert on (unit_id, external_key). Touches only practice_units and
-- practice_questions — no legacy tables, no user attempt data.
--
-- Units seeded: ${units.length}
-- Questions seeded: ${units.reduce((sum, unit) => sum + unit.questions.length, 0)}
`);

  for (const unit of units) {
    parts.push(`
-- ---------------------------------------------------------------------------
-- ${unit.skill} · ${unit.title}
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  ${lit(unit.slug)},
  ${lit(unit.skill)},
  ${lit(unit.mode)},
  ${lit(unit.title)},
  ${lit(unit.description)},
  ${lit(unit.difficulty)},
  ${lit(unit.material_type)},
  ${lit(unit.passage_text)},
  ${lit(unit.audio_url)},
  ${lit(unit.transcript)},
  ${lit(unit.asset_url)},
  ${num(unit.time_limit_seconds)},
  ${jsonLit({ ...(unit.metadata ?? {}), seededFrom: 'local-samples' })},
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
${unit.questions
  .map(
    (question) => `  (
    ${lit(question.id)},
    ${question.question_number},
    ${lit(question.question_type)},
    ${lit(question.question_text)},
    ${jsonLit(question.options)},
    ${jsonLit(question.answer_key)},
    ${lit(question.explanation)},
    ${jsonLit(question.metadata ?? {})}
  )`
  )
  .join(',\n')}
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = ${lit(unit.slug)}
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();
`);
  }

  return parts.join('').trimStart() + '\n';
}
