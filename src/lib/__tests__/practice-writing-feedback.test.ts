import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WRITING_WORD_TARGET,
  analyzeWritingResponse,
  countWritingParagraphs,
  countWritingWords,
  resolveWordTarget,
  splitWritingSentences,
} from '../practice-writing-feedback';

describe('countWritingWords', () => {
  it('counts whitespace-separated tokens and ignores extra spacing', () => {
    expect(countWritingWords('  hello   world  ')).toBe(2);
  });

  it('returns 0 for empty or whitespace-only input', () => {
    expect(countWritingWords('')).toBe(0);
    expect(countWritingWords('   \n  ')).toBe(0);
  });
});

describe('splitWritingSentences', () => {
  it('splits on sentence terminators and drops empties', () => {
    expect(splitWritingSentences('One. Two! Three?')).toEqual(['One', 'Two', 'Three']);
  });

  it('treats text with no terminator as a single sentence', () => {
    expect(splitWritingSentences('no terminator here')).toEqual(['no terminator here']);
  });
});

describe('countWritingParagraphs', () => {
  it('counts newline-separated blocks', () => {
    expect(countWritingParagraphs('intro\n\nbody\n\nconclusion')).toBe(3);
  });

  it('returns 0 for empty input', () => {
    expect(countWritingParagraphs('')).toBe(0);
  });
});

describe('resolveWordTarget', () => {
  it('uses a positive numeric target', () => {
    expect(resolveWordTarget(150)).toBe(150);
  });

  it('falls back to the default for invalid targets', () => {
    expect(resolveWordTarget(undefined)).toBe(DEFAULT_WRITING_WORD_TARGET);
    expect(resolveWordTarget(0)).toBe(DEFAULT_WRITING_WORD_TARGET);
    expect(resolveWordTarget(-10)).toBe(DEFAULT_WRITING_WORD_TARGET);
    expect(resolveWordTarget('250')).toBe(DEFAULT_WRITING_WORD_TARGET);
  });
});

describe('analyzeWritingResponse', () => {
  it('reports empty status with zeroed metrics for blank input', () => {
    const analysis = analyzeWritingResponse('', 250);

    expect(analysis.status).toBe('empty');
    expect(analysis.wordCount).toBe(0);
    expect(analysis.progressPercent).toBe(0);
    expect(analysis.remainingWords).toBe(250);
    expect(analysis.avgWordsPerSentence).toBe(0);
  });

  it('marks under when well below target', () => {
    const answer = Array.from({ length: 100 }, () => 'word').join(' ');
    const analysis = analyzeWritingResponse(answer, 250);

    expect(analysis.wordCount).toBe(100);
    expect(analysis.status).toBe('under');
    expect(analysis.progressPercent).toBe(40);
    expect(analysis.remainingWords).toBe(150);
  });

  it('marks near when within 90% of the target', () => {
    const answer = Array.from({ length: 230 }, () => 'word').join(' ');
    const analysis = analyzeWritingResponse(answer, 250);

    expect(analysis.status).toBe('near');
    expect(analysis.remainingWords).toBe(20);
  });

  it('marks met and caps progress at 100 when the target is reached', () => {
    const answer = Array.from({ length: 300 }, () => 'word').join(' ');
    const analysis = analyzeWritingResponse(answer, 250);

    expect(analysis.status).toBe('met');
    expect(analysis.progressPercent).toBe(100);
    expect(analysis.remainingWords).toBe(0);
  });

  it('computes sentence, paragraph and average-length metrics', () => {
    const answer = 'First point here. Second point follows.\n\nA new paragraph closes it.';
    const analysis = analyzeWritingResponse(answer, 250);

    expect(analysis.sentenceCount).toBe(3);
    expect(analysis.paragraphCount).toBe(2);
    expect(analysis.avgWordsPerSentence).toBe(Math.round(analysis.wordCount / 3));
  });

  it('flags sentences longer than the threshold', () => {
    const longSentence = Array.from({ length: 45 }, () => 'word').join(' ');
    const analysis = analyzeWritingResponse(`${longSentence}. Short one.`, 250);

    expect(analysis.longSentenceCount).toBe(1);
  });

  it('completes the word-target checklist item once the count is reached', () => {
    const answer = `In my opinion this is clear. However others think differently. ${Array.from(
      { length: 260 },
      () => 'word',
    ).join(' ')}. In conclusion, I agree.`;
    const analysis = analyzeWritingResponse(answer, 250);

    const wordTargetItem = analysis.checklist.find((item) => item.id === 'wordTarget');
    expect(wordTargetItem?.done).toBe(true);
    expect(analysis.checklistCompleted).toBeGreaterThanOrEqual(3);
  });

  it('falls back to the default target when metadata is missing', () => {
    const analysis = analyzeWritingResponse('word word word');
    expect(analysis.wordTarget).toBe(DEFAULT_WRITING_WORD_TARGET);
  });
});
