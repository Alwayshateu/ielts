// Generate supabase/migrations/0002_seed_practice_samples.sql from the local sample units.
//
// The seed is derived rather than hand-written so the DB content cannot drift from
// src/lib/practice-session-samples.ts. Re-run this whenever the samples change.
//
//   node scripts/generate-practice-seed.mjs
//
// The rendering itself lives in ./render-practice-seed.ts so a test can assert the
// committed seed matches the samples byte-for-byte. The generated file is idempotent:
// units upsert on slug, questions upsert on (unit_id, external_key). It only touches
// practice_units / practice_questions.

import { writeFileSync } from 'node:fs';

import { getSamplePracticeUnits } from '../src/lib/practice-session-samples.ts';
import { renderPracticeSeedSql } from './render-practice-seed.ts';

const OUT = 'supabase/migrations/0002_seed_practice_samples.sql';

const units = getSamplePracticeUnits();
writeFileSync(OUT, renderPracticeSeedSql(units), 'utf8');

console.log(
  `wrote ${OUT}: ${units.length} units, ${units.reduce((s, u) => s + u.questions.length, 0)} questions`
);
