import type { PracticeSkill, PracticeUnit } from '@/lib/types';

export const DEFAULT_EXAM_SECONDS_BY_SKILL: Record<PracticeSkill, number> = {
  foundation: 600,
  reading: 1200,
  listening: 600,
  writing: 2400,
  speaking: 120,
};

export function getExamDurationSeconds(unit: PracticeUnit) {
  if (typeof unit.time_limit_seconds === 'number' && unit.time_limit_seconds > 0) {
    return unit.time_limit_seconds;
  }

  return DEFAULT_EXAM_SECONDS_BY_SKILL[unit.skill] ?? 600;
}
