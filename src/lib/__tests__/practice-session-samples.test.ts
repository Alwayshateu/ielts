import { describe, expect, it } from 'vitest';

import { getSamplePracticeUnit, getSamplePracticeUnits } from '../practice-session-samples';

describe('practice session sample fixtures', () => {
  const units = getSamplePracticeUnits();

  it('has unique sample IDs and slugs that can be looked up by either value', () => {
    expect(new Set(units.map((unit) => unit.id)).size).toBe(units.length);
    expect(new Set(units.map((unit) => unit.slug)).size).toBe(units.length);

    units.forEach((unit) => {
      expect(getSamplePracticeUnit(unit.id)).toBe(unit);
      expect(getSamplePracticeUnit(unit.slug)).toBe(unit);
    });
  });

  it('keeps question numbers ordered and every question attached to its unit', () => {
    units.forEach((unit) => {
      expect(unit.questions.length).toBeGreaterThan(0);
      expect(unit.questions.map((question) => question.question_number)).toEqual(
        [...unit.questions].sort((a, b) => a.question_number - b.question_number).map((question) => question.question_number)
      );

      unit.questions.forEach((question, index) => {
        expect(question.unit_id).toBe(unit.id);
        expect(question.question_number).toBe(index + 1);
      });
    });
  });

  it('gives objective samples answer keys and keeps manual samples intentionally keyless', () => {
    units.forEach((unit) => {
      unit.questions.forEach((question) => {
        if (unit.skill === 'reading' || unit.skill === 'listening') {
          expect(question.answer_key.answers.length).toBeGreaterThan(0);
        }

        if (unit.skill === 'writing' || unit.skill === 'speaking') {
          expect(question.answer_key.answers).toEqual([]);
        }
      });
    });
  });

  it('includes required skill-specific metadata and material content', () => {
    const reading = units.find((unit) => unit.skill === 'reading');
    const listening = units.find((unit) => unit.skill === 'listening');
    const writing = units.find((unit) => unit.skill === 'writing');
    const speaking = units.find((unit) => unit.skill === 'speaking');

    expect(reading?.passage_text).toContain('green roof');
    expect(reading?.metadata?.source).toBe('local-sample');

    expect(listening?.transcript).toContain('library orientation');
    expect(listening?.audio_url).toBe('/audio/sample-listening-orientation.wav');
    expect(listening?.metadata?.audioStatus).toBe('placeholder-tone');
    expect(Array.isArray(listening?.metadata?.transcriptCues)).toBe(true);
    expect((listening?.metadata?.transcriptCues as unknown[]).length).toBeGreaterThan(0);

    expect(writing?.metadata?.taskType).toBe('task_2');
    expect(writing?.metadata?.wordTarget).toBe(250);
    expect(typeof writing?.metadata?.prompt).toBe('string');

    expect(speaking?.metadata?.part).toBe(2);
    expect(speaking?.metadata?.prepSeconds).toBe(60);
    expect(speaking?.metadata?.responseSeconds).toBe(120);
    expect(typeof speaking?.metadata?.cueCard).toBe('string');
  });
});
