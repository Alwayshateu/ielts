import type {
  PracticeAttemptAnswer,
  PracticeAttemptOutcome,
  PracticeSessionHistoryEntry,
} from './practice-session-history';

export type PracticeAttemptOutcomeCounts = Record<PracticeAttemptOutcome, number>;

export type PracticeAttemptComparison = {
  /** 1-based position of this attempt among all attempts of the same unit, oldest first. */
  attemptIndex: number;
  unitAttempts: number;
  previous: PracticeSessionHistoryEntry | null;
  accuracyDelta: number | null;
  bandDelta: number | null;
  elapsedDelta: number | null;
  isPersonalBest: boolean;
};

/** Locate one attempt by id. Falls back to null so the page can render a friendly empty state. Pure. */
export function findPracticeAttempt(
  entries: PracticeSessionHistoryEntry[],
  attemptId: string
): PracticeSessionHistoryEntry | null {
  return entries.find((entry) => entry.id === attemptId) ?? null;
}

/** Tally per-question outcomes from a snapshot. Pure. */
export function summarizePracticeAttemptOutcomes(
  answers: PracticeAttemptAnswer[]
): PracticeAttemptOutcomeCounts {
  const counts: PracticeAttemptOutcomeCounts = {
    correct: 0,
    incorrect: 0,
    skipped: 0,
    manual_review: 0,
  };

  answers.forEach((answer) => {
    counts[answer.outcome] += 1;
  });

  return counts;
}

/** Questions worth re-practising, in question order. Pure. */
export function selectPracticeAttemptRetryAnswers(answers: PracticeAttemptAnswer[]) {
  return answers
    .filter((answer) => answer.outcome === 'incorrect' || answer.outcome === 'skipped')
    .sort((a, b) => a.questionNumber - b.questionNumber);
}

/**
 * Position this attempt within the unit's own attempt series and diff it against the previous one.
 * Deltas are null when either side lacks a comparable value. Pure.
 */
export function buildPracticeAttemptComparison(
  entries: PracticeSessionHistoryEntry[],
  attempt: PracticeSessionHistoryEntry
): PracticeAttemptComparison {
  const series = entries
    .filter((entry) => entry.unitId === attempt.unitId)
    .sort((a, b) => a.recordedAt - b.recordedAt);

  const position = series.findIndex((entry) => entry.id === attempt.id);
  const attemptIndex = position === -1 ? series.length : position + 1;
  const previous = position > 0 ? series[position - 1] : null;

  const accuracyDelta =
    attempt.accuracy !== null && previous?.accuracy !== null && previous?.accuracy !== undefined
      ? attempt.accuracy - previous.accuracy
      : null;

  const bandDelta =
    attempt.selfRatedBand !== null && previous?.selfRatedBand !== null && previous?.selfRatedBand !== undefined
      ? Math.round((attempt.selfRatedBand - previous.selfRatedBand) * 10) / 10
      : null;

  const elapsedDelta = previous ? attempt.elapsedSeconds - previous.elapsedSeconds : null;

  const otherAccuracies = series
    .filter((entry) => entry.id !== attempt.id)
    .map((entry) => entry.accuracy)
    .filter((accuracy): accuracy is number => accuracy !== null);

  const isPersonalBest =
    attempt.accuracy !== null &&
    series.length > 1 &&
    otherAccuracies.every((accuracy) => attempt.accuracy! >= accuracy);

  return {
    attemptIndex,
    unitAttempts: series.length,
    previous,
    accuracyDelta,
    bandDelta,
    elapsedDelta,
    isPersonalBest,
  };
}
