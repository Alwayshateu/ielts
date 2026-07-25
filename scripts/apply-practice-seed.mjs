// Upload the generated practice sample seed to Supabase using the service role key.
//
//   node scripts/apply-practice-seed.mjs          # apply
//   node scripts/apply-practice-seed.mjs --check  # verify only, no writes
//
// Why a script instead of the SQL Editor: the seed only needs row inserts, not DDL,
// so it can go through the REST API. Content tables deliberately have no client
// insert policy, hence the service role key.
//
// Scope guard: this script only ever writes practice_units and practice_questions.
// It never touches user data (practice_attempts / practice_answers / annotations)
// or the legacy tables, and it performs no DDL and no deletes.

import { readFileSync } from 'node:fs';

const CHECK_ONLY = process.argv.includes('--check');
const ALLOWED_TABLES = new Set(['practice_units', 'practice_questions']);

function readEnv() {
  let raw = '';
  try {
    raw = readFileSync('.env.local', 'utf8');
  } catch {
    throw new Error('.env.local not found — run this from the project root.');
  }

  const get = (key) => {
    const match = raw.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\r\\n]+?)"?\\s*$`, 'm'));
    return match?.[1];
  };

  const url = get('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL missing from .env.local');
  if (!serviceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY missing from .env.local.\n' +
        'Add it with:  printf "\\nSUPABASE_SERVICE_ROLE_KEY=<key>\\n" >> .env.local'
    );
  }

  return { url: url.replace(/\/$/, ''), serviceKey };
}

async function rest(env, path, { method = 'GET', body, prefer } = {}) {
  const response = await fetch(`${env.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env.serviceKey,
      Authorization: `Bearer ${env.serviceKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status}: ${text.slice(0, 400)}`);
  }

  return text ? JSON.parse(text) : null;
}

async function upsert(env, table, rows, onConflict) {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(`refusing to write to ${table} — this script only seeds content tables`);
  }

  return rest(env, `${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    body: rows,
    prefer: 'resolution=merge-duplicates,return=representation',
  });
}

async function main() {
  const env = readEnv();
  const { getSamplePracticeUnits } = await import('../src/lib/practice-session-samples.ts');
  const units = getSamplePracticeUnits();

  console.log(`project: ${env.url}`);
  console.log(`source : ${units.length} local sample units, ${units.reduce((s, u) => s + u.questions.length, 0)} questions`);
  console.log('');

  if (CHECK_ONLY) {
    await report(env, units);
    return;
  }

  const unitRows = units.map((unit) => ({
    slug: unit.slug,
    skill: unit.skill,
    mode: unit.mode,
    title: unit.title,
    description: unit.description,
    difficulty: unit.difficulty,
    material_type: unit.material_type,
    passage_text: unit.passage_text,
    audio_url: unit.audio_url,
    transcript: unit.transcript,
    asset_url: unit.asset_url,
    time_limit_seconds: unit.time_limit_seconds,
    metadata: { ...(unit.metadata ?? {}), seededFrom: 'local-samples' },
    is_active: true,
  }));

  const savedUnits = await upsert(env, 'practice_units', unitRows, 'slug');
  console.log(`practice_units      → upserted ${savedUnits.length}`);

  const idBySlug = new Map(savedUnits.map((row) => [row.slug, row.id]));

  const questionRows = units.flatMap((unit) =>
    unit.questions.map((question) => ({
      unit_id: idBySlug.get(unit.slug),
      external_key: question.id,
      question_number: question.question_number,
      question_type: question.question_type,
      question_text: question.question_text,
      options: question.options,
      answer_key: question.answer_key,
      explanation: question.explanation,
      metadata: question.metadata ?? {},
      is_active: true,
    }))
  );

  const missing = questionRows.filter((row) => !row.unit_id);
  if (missing.length) throw new Error(`${missing.length} questions had no resolved unit_id`);

  const savedQuestions = await upsert(env, 'practice_questions', questionRows, 'unit_id,external_key');
  console.log(`practice_questions  → upserted ${savedQuestions.length}`);
  console.log('');

  await report(env, units);
}

async function report(env, units) {
  const dbUnits = await rest(env, 'practice_units?select=id,slug,skill,title,is_active&order=skill');
  const dbQuestions = await rest(env, 'practice_questions?select=external_key,unit_id,question_number');

  console.log(`in database: ${dbUnits.length} units, ${dbQuestions.length} questions`);
  console.log('');

  const localSlugs = new Set(units.map((unit) => unit.slug));
  const dbSlugs = new Set(dbUnits.map((row) => row.slug));

  const unitIdBySlug = new Map(dbUnits.map((row) => [row.slug, row.id]));

  for (const unit of units) {
    const present = dbSlugs.has(unit.slug);
    const dbCount = dbQuestions.filter((row) => row.unit_id === unitIdBySlug.get(unit.slug)).length;
    console.log(
      `  ${present ? 'ok  ' : 'MISS'} ${unit.skill.padEnd(10)} ${unit.slug.padEnd(46)} ${dbCount}/${unit.questions.length} questions`
    );
  }

  const extra = dbUnits.filter((row) => !localSlugs.has(row.slug));
  if (extra.length) {
    console.log('');
    console.log(`note: ${extra.length} unit(s) in DB not present locally: ${extra.map((r) => r.slug).join(', ')}`);
  }

  const localKeys = new Set(units.flatMap((unit) => unit.questions.map((q) => q.id)));
  const dbKeys = new Set(dbQuestions.map((row) => row.external_key));
  const missingKeys = [...localKeys].filter((key) => !dbKeys.has(key));
  console.log('');
  console.log(missingKeys.length ? `questions missing: ${missingKeys.join(', ')}` : 'all local question keys present in DB');
}

main().catch((error) => {
  console.error('');
  console.error('FAILED:', error.message);
  process.exit(1);
});
