import { describe, expect, it } from 'vitest';
import type { PracticeSkill, PracticeUnit } from '@/lib/types';
import { DEFAULT_EXAM_SECONDS_BY_SKILL, getExamDurationSeconds } from '../practice-session-timing';

function makeUnit(overrides: Partial<PracticeUnit>): PracticeUnit {
  return { skill: 'reading', time_limit_seconds: null, ...overrides } as unknown as PracticeUnit;
}

describe('getExamDurationSeconds', () => {
  it('uses the unit time limit when it is a positive number', () => {
    expect(getExamDurationSeconds(makeUnit({ time_limit_seconds: 900 }))).toBe(900);
  });

  it('ignores non-positive or non-numeric limits and falls back to the skill default', () => {
    expect(getExamDurationSeconds(makeUnit({ skill: 'writing', time_limit_seconds: 0 }))).toBe(2400);
    expect(getExamDurationSeconds(makeUnit({ skill: 'listening', time_limit_seconds: null }))).toBe(600);
    expect(getExamDurationSeconds(makeUnit({ skill: 'speaking', time_limit_seconds: -30 }))).toBe(120);
  });

  it('provides a default for every known skill', () => {
    expect(getExamDurationSeconds(makeUnit({ skill: 'foundation' }))).toBe(600);
    expect(getExamDurationSeconds(makeUnit({ skill: 'reading' }))).toBe(1200);
    expect(getExamDurationSeconds(makeUnit({ skill: 'listening' }))).toBe(600);
    expect(getExamDurationSeconds(makeUnit({ skill: 'writing' }))).toBe(2400);
    expect(getExamDurationSeconds(makeUnit({ skill: 'speaking' }))).toBe(120);
  });

  it('falls back to 600s when the skill is unknown', () => {
    expect(
      getExamDurationSeconds(makeUnit({ skill: 'unknown' as PracticeSkill, time_limit_seconds: null }))
    ).toBe(600);
  });
});

describe('DEFAULT_EXAM_SECONDS_BY_SKILL', () => {
  it('documents a duration for each skill', () => {
    expect(DEFAULT_EXAM_SECONDS_BY_SKILL).toEqual({
      foundation: 600,
      reading: 1200,
      listening: 600,
      writing: 2400,
      speaking: 120,
    });
  });
});
