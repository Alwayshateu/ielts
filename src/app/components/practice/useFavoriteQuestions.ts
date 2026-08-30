'use client';

import { useEffect, useState } from 'react';
import {
  isPracticeCollectionLinkEnabled,
  readSavedPracticeQuestionIds,
  removePracticeQuestionFromCollection,
  resolvePracticeQuestionDbIds,
  savePracticeQuestionToCollection,
} from '@/lib/question-collections';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { PracticeQuestion } from '@/lib/types';

/**
 * Per-question favorites for a practice session, backed by the shared favorites table.
 *
 * Inert unless NEXT_PUBLIC_PRACTICE_COLLECTION_LINK is on. One batch read on mount
 * resolves local question ids to DB uuids and loads which are already saved; toggles
 * update optimistically and roll back on failure. Questions with no DB row (unit not
 * seeded) simply can't be saved — `canSave` returns false for them.
 */
export function useFavoriteQuestions(questions: PracticeQuestion[]) {
  const [enabled] = useState(() => isPracticeCollectionLinkEnabled());
  const [userId, setUserId] = useState<string | null>(null);
  const [dbIdByLocalId, setDbIdByLocalId] = useState<Map<string, string> | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || questions.length === 0) return;

    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const map = await resolvePracticeQuestionDbIds(
        supabase,
        questions.map((question) => question.id)
      );
      if (cancelled) return;

      const savedDbIds = await readSavedPracticeQuestionIds({
        supabase,
        table: 'favorites',
        userId: user.id,
        practiceQuestionIds: [...map.values()],
      });
      if (cancelled) return;

      setUserId(user.id);
      setDbIdByLocalId(map);
      setSavedIds(
        new Set(
          [...map.entries()]
            .filter(([, dbId]) => savedDbIds.has(dbId))
            .map(([localId]) => localId)
        )
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, questions]);

  const ready = enabled && userId !== null && dbIdByLocalId !== null;

  const toggleFavorite = async (questionId: string) => {
    if (!ready || pendingId) return;

    const dbId = dbIdByLocalId!.get(questionId);
    if (!dbId) return;

    const wasSaved = savedIds.has(questionId);

    // Optimistic: flip immediately, roll back if the write fails.
    setPendingId(questionId);
    setSavedIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(questionId);
      else next.add(questionId);
      return next;
    });

    const supabase = createSupabaseBrowserClient();
    const error = wasSaved
      ? await removePracticeQuestionFromCollection({
          supabase,
          table: 'favorites',
          userId: userId!,
          practiceQuestionId: dbId,
        })
      : await savePracticeQuestionToCollection({
          supabase,
          table: 'favorites',
          userId: userId!,
          practiceQuestionId: dbId,
        });

    if (error) {
      setSavedIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.add(questionId);
        else next.delete(questionId);
        return next;
      });
    }

    setPendingId(null);
  };

  return {
    ready,
    savedIds,
    pendingId,
    canSave: (questionId: string) => Boolean(dbIdByLocalId?.has(questionId)),
    toggleFavorite,
  };
}
