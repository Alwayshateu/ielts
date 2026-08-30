import type { PracticeSessionDraftStatus } from './practice-session-draft';
import type { PracticeUnit } from './types';

export type PracticeRecommendationReason = 'review' | 'continue' | 'start' | 'stretch';

export type PracticeLearningSummary = {
  inProgress: number;
  needsReview: number;
  checked: number;
};

const REASON_SCORE: Record<PracticeRecommendationReason, number> = {
  review: 400,
  continue: 300,
  start: 200,
  stretch: 100,
};

export function getPracticeRecommendationReason(
  unit: Pick<PracticeUnit, 'mode'>,
  status: PracticeSessionDraftStatus | undefined
): PracticeRecommendationReason {
  if (status?.showResults && (status.flagged > 0 || status.notes > 0)) return 'review';
  if (status && !status.showResults && status.answered > 0) return 'continue';
  if (!status) return 'start';
  return unit.mode === 'challenge' ? 'stretch' : 'start';
}

export function scorePracticeRecommendation(
  unit: Pick<PracticeUnit, 'id' | 'mode' | 'questions'>,
  status: PracticeSessionDraftStatus | undefined
) {
  const reason = getPracticeRecommendationReason(unit, status);

  return REASON_SCORE[reason] + (status?.updatedAt ?? 0) / 1_000_000_000_000_000 + unit.questions.length / 100;
}

export function getRecommendedPracticeUnits(
  units: PracticeUnit[],
  statuses: Record<string, PracticeSessionDraftStatus>,
  limit = 3
) {
  return [...units]
    .sort((left, right) =>
      scorePracticeRecommendation(right, statuses[right.id]) -
      scorePracticeRecommendation(left, statuses[left.id])
    )
    .slice(0, limit);
}

export function getPracticeLearningSummary(
  statuses: Record<string, PracticeSessionDraftStatus>
): PracticeLearningSummary {
  const values = Object.values(statuses);

  return {
    inProgress: values.filter((status) => !status.showResults && status.answered > 0).length,
    needsReview: values.filter(
      (status) => status.showResults && (status.flagged > 0 || status.notes > 0)
    ).length,
    checked: values.filter((status) => status.showResults).length,
  };
}
