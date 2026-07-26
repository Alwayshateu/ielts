import { describe, expect, it } from 'vitest';

import { isPracticeAnswerCorrect } from '../practice-answer-check';
import { getSamplePracticeUnits } from '../practice-session-samples';
import type { PracticeQuestionType } from '../types';

// Structural content-integrity checks over the hand-authored sample units. These complement
// practice-session-samples.test.ts (which validates ids/slugs, numbering, and keys BY SKILL) by
// validating BY QUESTION TYPE — catching the data-entry mistakes that surface when transcribing
// Cambridge answer keys: a choice answer that matches no option, an essay prompt given options,
// a fill-in question left without an accepted answer, or a duplicated question id across units.

const units = getSamplePracticeUnits();
const allQuestions = units.flatMap((unit) => unit.questions);

// Answer is picked from a fixed option list — the key MUST correspond to a listed option.
const CHOICE_TYPES: PracticeQuestionType[] = ['multiple_choice', 'true_false_not_given'];
// Objective free-text (reading/listening fill-ins): no options, but a non-empty accepted-answer key.
const FREE_TEXT_OBJECTIVE_TYPES: PracticeQuestionType[] = ['sentence_completion', 'short_answer'];
// Subjective (essay / spoken response): no options, intentionally keyless for manual review.
const SUBJECTIVE_TYPES: PracticeQuestionType[] = ['writing_task', 'speaking_response'];

describe('practice session content integrity', () => {
  it('gives every question a non-empty id and prompt', () => {
    allQuestions.forEach((question) => {
      expect(question.id.trim().length, `question ${question.id} id`).toBeGreaterThan(0);
      expect(question.question_text.trim().length, `question ${question.id} prompt`).toBeGreaterThan(0);
    });
  });

  it('keeps question ids globally unique across all units', () => {
    const ids = allQuestions.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives choice questions distinct options and an answer key that matches those options', () => {
    const choiceQuestions = allQuestions.filter((question) => CHOICE_TYPES.includes(question.question_type));
    // Guard: the fixtures actually exercise this path, so the assertions below are not vacuous.
    expect(choiceQuestions.length).toBeGreaterThan(0);

    choiceQuestions.forEach((question) => {
      const options = question.options;
      expect(options, `${question.id} must have options`).not.toBeNull();
      expect((options ?? []).length, `${question.id} option count`).toBeGreaterThanOrEqual(2);
      expect(new Set(options).size, `${question.id} options must be distinct`).toBe((options ?? []).length);

      // Every answer-key entry must be a selectable option under the app's OWN matching semantics —
      // the count of options the scorer accepts equals the number of keyed answers (supports multi-select).
      expect(question.answer_key.answers.length, `${question.id} needs a keyed answer`).toBeGreaterThan(0);
      const acceptedOptions = (options ?? []).filter((option) => isPracticeAnswerCorrect(question, option));
      expect(acceptedOptions.length, `${question.id} answer key must match a listed option`).toBe(
        question.answer_key.answers.length
      );
    });
  });

  it('gives free-text objective questions no options but a non-empty accepted-answer key', () => {
    const freeText = allQuestions.filter((question) => FREE_TEXT_OBJECTIVE_TYPES.includes(question.question_type));

    freeText.forEach((question) => {
      expect(question.options, `${question.id} should be free-text (no options)`).toBeNull();
      expect(question.answer_key.answers.length, `${question.id} needs an accepted answer`).toBeGreaterThan(0);
      question.answer_key.answers.forEach((answer) => {
        expect(answer.trim().length, `${question.id} answer must be non-empty`).toBeGreaterThan(0);
      });
    });
  });

  it('keeps subjective questions optionless and intentionally keyless for manual review', () => {
    const subjective = allQuestions.filter((question) => SUBJECTIVE_TYPES.includes(question.question_type));

    subjective.forEach((question) => {
      expect(question.options, `${question.id} essay/spoken prompt should have no options`).toBeNull();
      expect(question.answer_key.answers, `${question.id} should be keyless`).toEqual([]);
    });
  });

  it('keeps reference-image URLs well-formed when a unit or question declares one', () => {
    units.forEach((unit) => {
      if (unit.asset_url !== null) {
        expect(typeof unit.asset_url, `${unit.id} asset_url type`).toBe('string');
        expect(unit.asset_url.trim().length, `${unit.id} asset_url must be non-empty`).toBeGreaterThan(0);
      }
    });

    allQuestions.forEach((question) => {
      const assetUrl = question.metadata?.assetUrl;
      if (assetUrl !== undefined) {
        expect(typeof assetUrl, `${question.id} metadata.assetUrl type`).toBe('string');
        expect(String(assetUrl).trim().length, `${question.id} metadata.assetUrl must be non-empty`).toBeGreaterThan(0);
      }
    });
  });
});
