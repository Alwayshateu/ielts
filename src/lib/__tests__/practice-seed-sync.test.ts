import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { renderPracticeSeedSql } from '../../../scripts/render-practice-seed';
import { getSamplePracticeUnits } from '../practice-session-samples';

const SEED_PATH = fileURLToPath(
  new URL('../../../supabase/migrations/0002_seed_practice_samples.sql', import.meta.url)
);

// Compare independent of the checkout's line-ending setting (autocrlf on Windows).
const normalize = (text: string) => text.replace(/\r\n/g, '\n');

describe('practice seed sync', () => {
  it('keeps the committed 0002 seed in step with the samples', () => {
    const rendered = normalize(renderPracticeSeedSql(getSamplePracticeUnits()));
    const committed = normalize(readFileSync(SEED_PATH, 'utf8'));

    expect(
      rendered,
      'The seed migration is stale. Edit only src/lib/practice-session-samples.ts, then run `node scripts/generate-practice-seed.mjs` and commit the regenerated 0002_seed_practice_samples.sql.'
    ).toBe(committed);
  });

  it('renders deterministically for the same input', () => {
    const units = getSamplePracticeUnits();
    expect(renderPracticeSeedSql(units)).toBe(renderPracticeSeedSql(units));
  });
});
