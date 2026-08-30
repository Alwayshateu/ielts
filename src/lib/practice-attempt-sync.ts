import type {
  PracticeAttemptAnswer,
  PracticeSessionHistoryEntry,
} from './practice-session-history';

/**
 * Row shapes for the practice_attempts / practice_answers tables. These mirror the
 * DB columns exactly; is_correct is omitted because it is a generated column.
 */
export type PracticeAttemptInsert = {
  user_id: string;
  unit_id: string;
  client_attempt_id: string;
  mode: string;
  started_at: string;
  submitted_at: string;
  elapsed_seconds: number;
  score: number | null;
  correct_count: number;
  incorrect_count: number;
  skipped_count: number;
  manual_review_count: number;
  objective_total: number;
  total_count: number;
  completion_percent: number;
  self_rated_band: number | null;
  metadata: Record<string, unknown>;
};

export type PracticeAnswerInsert = {
  attempt_id: string;
  question_id: string;
  question_number: number;
  outcome: PracticeAttemptAnswer['outcome'];
  user_answer: string | null;
  accepted_answer: string | null;
};

/** Minimal lookup the caller resolves from the DB before building rows. */
export type PracticeUnitLookup = {
  /** DB uuid of the unit, keyed by unit slug. */
  unitIdBySlug: Map<string, string>;
  /** DB uuid of each question, keyed by `${unitSlug}::${externalKey}`. */
  questionIdByExternalKey: Map<string, string>;
};

export function questionLookupKey(unitSlug: string, externalKey: string) {
  return `${unitSlug}::${externalKey}`;
}

export type PracticeAttemptSyncPlan = {
  attempt: PracticeAttemptInsert;
  /** Answer rows without attempt_id — the caller fills it in after the attempt insert. */
  answers: Omit<PracticeAnswerInsert, 'attempt_id'>[];
  /** Local question keys that had no matching DB row; recorded for reporting, not fatal. */
  unresolvedQuestionKeys: string[];
};

export type PracticeAttemptSyncSkip = {
  entry: PracticeSessionHistoryEntry;
  reason: 'unknown-unit' | 'no-snapshot';
};

export type PracticeAttemptSyncBuild = {
  plans: PracticeAttemptSyncPlan[];
  skipped: PracticeAttemptSyncSkip[];
};

function isoFrom(ms: number) {
  return new Date(ms).toISOString();
}

/**
 * Turn local history entries into insert plans. Pure — all DB identity comes from
 * `lookup`, so this is fully testable without a database.
 *
 * Entries whose unit is not in the DB are skipped rather than guessed at. Entries
 * without a per-question snapshot still sync their attempt-level summary.
 */
export function buildPracticeAttemptSyncPlans({
  entries,
  userId,
  lookup,
}: {
  entries: PracticeSessionHistoryEntry[];
  userId: string;
  lookup: PracticeUnitLookup;
}): PracticeAttemptSyncBuild {
  const plans: PracticeAttemptSyncPlan[] = [];
  const skipped: PracticeAttemptSyncSkip[] = [];

  for (const entry of entries) {
    const unitId = lookup.unitIdBySlug.get(entry.slug);
    if (!unitId) {
      skipped.push({ entry, reason: 'unknown-unit' });
      continue;
    }

    const startedAt = Math.max(0, entry.recordedAt - entry.elapsedSeconds * 1000);
    const unresolvedQuestionKeys: string[] = [];
    const answers: Omit<PracticeAnswerInsert, 'attempt_id'>[] = [];

    for (const answer of entry.answers ?? []) {
      const questionId = lookup.questionIdByExternalKey.get(
        questionLookupKey(entry.slug, answer.questionId)
      );

      if (!questionId) {
        unresolvedQuestionKeys.push(answer.questionId);
        continue;
      }

      answers.push({
        question_id: questionId,
        question_number: answer.questionNumber,
        outcome: answer.outcome,
        user_answer: answer.userAnswer || null,
        accepted_answer: answer.correctAnswer || null,
      });
    }

    plans.push({
      attempt: {
        user_id: userId,
        unit_id: unitId,
        client_attempt_id: entry.id,
        mode: entry.mode,
        started_at: isoFrom(startedAt),
        submitted_at: isoFrom(entry.recordedAt),
        elapsed_seconds: entry.elapsedSeconds,
        score: entry.accuracy,
        correct_count: entry.correct,
        incorrect_count: entry.incorrect,
        skipped_count: entry.skipped,
        manual_review_count: entry.manualReview,
        objective_total: entry.objectiveTotal,
        total_count: entry.total,
        completion_percent: entry.completionPercent,
        self_rated_band: entry.selfRatedBand,
        metadata: {
          skill: entry.skill,
          difficulty: entry.difficulty,
          title: entry.title,
          syncedFrom: 'local-history',
          hasSnapshot: Boolean(entry.answers?.length),
        },
      },
      answers,
      unresolvedQuestionKeys,
    });
  }

  return { plans, skipped };
}

/** Entries not yet present remotely, matched on the local attempt id. Pure. */
export function selectUnsyncedEntries(
  entries: PracticeSessionHistoryEntry[],
  remoteClientAttemptIds: Iterable<string>
) {
  const remote = new Set(remoteClientAttemptIds);
  return entries.filter((entry) => !remote.has(entry.id));
}
