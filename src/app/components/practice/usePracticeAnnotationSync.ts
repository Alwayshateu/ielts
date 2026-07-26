'use client';

import { useEffect, useRef, useState } from 'react';

import {
  loadPracticeUnitAnnotations,
  syncPracticeUnitAnnotations,
} from '@/lib/practice-annotation-remote';
import {
  annotationsSignature,
  isPracticeAnnotationSyncEnabled,
} from '@/lib/practice-annotation-sync';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import type { PassageAnnotation } from '@/lib/types';

export type AnnotationSyncStatus = 'disabled' | 'idle' | 'syncing' | 'synced' | 'error';

const PUSH_DEBOUNCE_MS = 1000;

/**
 * Opt-in cloud mirror for a unit's reading annotations.
 *
 * Inert unless NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC is on. localStorage stays the
 * source of truth for live editing; the cloud copy is a cross-device backup. On mount
 * (signed in) it restores from the cloud only when local is empty, so it never clobbers
 * local edits — local always wins. On change it debounces a replace-all push. Every
 * failure is surfaced quietly through `status` and never blocks reading.
 */
export function usePracticeAnnotationSync({
  unitSlug,
  annotations,
  annotationsLoaded,
  onRestore,
}: {
  unitSlug: string;
  annotations: PassageAnnotation[];
  annotationsLoaded: boolean;
  onRestore: (annotations: PassageAnnotation[]) => void;
}) {
  const [enabled] = useState(() => isPracticeAnnotationSyncEnabled());
  const [status, setStatus] = useState<AnnotationSyncStatus>(enabled ? 'idle' : 'disabled');
  const [restoredCount, setRestoredCount] = useState(0);
  const lastSyncedSignatureRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  // Keep the latest restore callback without making it an effect dependency.
  const onRestoreRef = useRef(onRestore);
  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  // Restore from the cloud once, and only when local has nothing worth preserving.
  useEffect(() => {
    if (!enabled || !annotationsLoaded || hydratedRef.current) return;
    hydratedRef.current = true;

    if (annotations.length > 0) {
      // Local already has marks — local wins; treat them as the sync baseline.
      lastSyncedSignatureRef.current = annotationsSignature(annotations);
      return;
    }

    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    (async () => {
      const { annotations: remote } = await loadPracticeUnitAnnotations({ supabase, unitSlug });
      if (cancelled || remote.length === 0) return;
      lastSyncedSignatureRef.current = annotationsSignature(remote);
      setRestoredCount(remote.length);
      setStatus('synced');
      onRestoreRef.current(remote);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, annotationsLoaded, annotations, unitSlug]);

  // Debounced replace-all push whenever the local set changes after hydration.
  useEffect(() => {
    if (!enabled || !annotationsLoaded || !hydratedRef.current) return;

    const signature = annotationsSignature(annotations);
    if (signature === lastSyncedSignatureRef.current) return;

    const timer = window.setTimeout(() => {
      const supabase = createSupabaseBrowserClient();
      setStatus('syncing');
      syncPracticeUnitAnnotations({ supabase, unitSlug, annotations })
        .then((result) => {
          if (result.error) {
            setStatus('error');
            return;
          }
          lastSyncedSignatureRef.current = signature;
          setStatus('synced');
        })
        .catch(() => setStatus('error'));
    }, PUSH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [enabled, annotationsLoaded, annotations, unitSlug]);

  return { enabled, status, restoredCount };
}
