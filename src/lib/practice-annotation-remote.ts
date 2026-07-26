import type { SupabaseClient } from '@supabase/supabase-js';

import {
  buildPracticeAnnotationRows,
  mapRemoteAnnotationRow,
} from './practice-annotation-sync';
import type { PassageAnnotation } from './types';

/** Resolve a unit slug → practice_units uuid. Returns null when the unit isn't seeded. */
async function resolveUnitId(
  supabase: SupabaseClient,
  unitSlug: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('practice_units')
    .select('id')
    .eq('slug', unitSlug)
    .maybeSingle();

  if (error) throw new Error(`resolve unit ${unitSlug}: ${error.message}`);
  return (data?.id as string | undefined) ?? null;
}

export type LoadAnnotationsResult = {
  annotations: PassageAnnotation[];
  error: string | null;
};

/**
 * Read the signed-in user's reading annotations for a unit. Best-effort: any failure
 * comes back as an error string with an empty list, never throws to the caller, so a
 * reading session is never blocked by a sync problem.
 */
export async function loadPracticeUnitAnnotations({
  supabase,
  unitSlug,
}: {
  supabase: SupabaseClient;
  unitSlug: string;
}): Promise<LoadAnnotationsResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { annotations: [], error: 'not signed in' };

  let unitId: string | null;
  try {
    unitId = await resolveUnitId(supabase, unitSlug);
  } catch (error) {
    return { annotations: [], error: error instanceof Error ? error.message : String(error) };
  }
  // Unit not seeded in Supabase — nothing to restore, and not an error.
  if (!unitId) return { annotations: [], error: null };

  const { data, error } = await supabase
    .from('practice_annotations')
    .select('id,paragraph_index,start_offset,end_offset,selected_text,kind,note,metadata')
    .eq('user_id', user.id)
    .eq('unit_id', unitId)
    .is('attempt_id', null)
    .order('paragraph_index', { ascending: true })
    .order('start_offset', { ascending: true });

  if (error) return { annotations: [], error: error.message };

  const annotations = (data ?? [])
    .map((row) => mapRemoteAnnotationRow(row as never))
    .filter((annotation): annotation is PassageAnnotation => annotation !== null);

  return { annotations, error: null };
}

export type SyncAnnotationsResult = {
  pushed: number;
  cleared: boolean;
  error: string | null;
};

/**
 * Replace the signed-in user's reading annotations for a unit with the given set.
 *
 * Idempotent by construction: delete the user's reading marks for this unit, then
 * insert the current local set. Only ever touches practice_annotations rows owned by
 * the user (RLS enforces that independently) and only reading marks (attempt_id null).
 * The delete + insert is not a single transaction; localStorage stays the source of
 * truth, so a partial failure just re-syncs on the next change.
 */
export async function syncPracticeUnitAnnotations({
  supabase,
  unitSlug,
  annotations,
}: {
  supabase: SupabaseClient;
  unitSlug: string;
  annotations: PassageAnnotation[];
}): Promise<SyncAnnotationsResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { pushed: 0, cleared: false, error: 'not signed in' };

  let unitId: string | null;
  try {
    unitId = await resolveUnitId(supabase, unitSlug);
  } catch (error) {
    return { pushed: 0, cleared: false, error: error instanceof Error ? error.message : String(error) };
  }
  // Unit not seeded — skip rather than guess a target row.
  if (!unitId) return { pushed: 0, cleared: false, error: null };

  const rows = buildPracticeAnnotationRows({ annotations, userId: user.id, unitId });

  const { error: deleteError } = await supabase
    .from('practice_annotations')
    .delete()
    .eq('user_id', user.id)
    .eq('unit_id', unitId)
    .is('attempt_id', null);

  if (deleteError) return { pushed: 0, cleared: false, error: deleteError.message };

  if (rows.length === 0) return { pushed: 0, cleared: true, error: null };

  const { error: insertError } = await supabase.from('practice_annotations').insert(rows);
  if (insertError) return { pushed: 0, cleared: true, error: insertError.message };

  return { pushed: rows.length, cleared: true, error: null };
}
