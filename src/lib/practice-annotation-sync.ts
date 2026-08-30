import type { PassageAnnotation } from './types';

/**
 * Whether reading-annotation cloud sync is switched on. Off unless explicitly
 * enabled, so the default build keeps passage highlights / notes entirely local.
 */
export function isPracticeAnnotationSyncEnabled(
  value = process.env.NEXT_PUBLIC_PRACTICE_ANNOTATION_SYNC
) {
  return value === 'on';
}

const SELECTED_TEXT_MAX = 2000;
const NOTE_MAX = 2000;

/**
 * Row shape written to practice_annotations. These are reading-time marks, so
 * attempt_id is always null (they belong to the reading process, not a graded
 * attempt) and the local client id is carried in metadata so a later restore can
 * keep stable ids.
 */
export type PracticeAnnotationRow = {
  user_id: string;
  unit_id: string;
  attempt_id: null;
  paragraph_index: number;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  kind: PassageAnnotation['kind'];
  note: string | null;
  metadata: { client_annotation_id: string };
};

/** Whether an annotation is structurally valid to persist (mirrors the DB checks). */
export function isPersistableAnnotation(annotation: PassageAnnotation): boolean {
  return (
    typeof annotation.id === 'string' &&
    annotation.id.length > 0 &&
    (annotation.kind === 'highlight' || annotation.kind === 'note') &&
    Number.isInteger(annotation.paragraphIndex) &&
    annotation.paragraphIndex >= 0 &&
    Number.isInteger(annotation.startOffset) &&
    annotation.startOffset >= 0 &&
    Number.isInteger(annotation.endOffset) &&
    annotation.endOffset > annotation.startOffset &&
    typeof annotation.text === 'string' &&
    annotation.text.length > 0
  );
}

function normalizeNote(note: string | null): string | null {
  if (typeof note !== 'string') return null;
  const trimmed = note.slice(0, NOTE_MAX);
  return trimmed.length > 0 ? trimmed : null;
}

/** Map local PassageAnnotations → practice_annotations insert rows. Drops invalid ones. */
export function buildPracticeAnnotationRows({
  annotations,
  userId,
  unitId,
}: {
  annotations: PassageAnnotation[];
  userId: string;
  unitId: string;
}): PracticeAnnotationRow[] {
  return annotations.filter(isPersistableAnnotation).map((annotation) => ({
    user_id: userId,
    unit_id: unitId,
    attempt_id: null,
    paragraph_index: annotation.paragraphIndex,
    start_offset: annotation.startOffset,
    end_offset: annotation.endOffset,
    selected_text: annotation.text.slice(0, SELECTED_TEXT_MAX),
    kind: annotation.kind,
    note: normalizeNote(annotation.note),
    metadata: { client_annotation_id: annotation.id },
  }));
}

type RemoteAnnotationRow = {
  id: string;
  paragraph_index: number;
  start_offset: number;
  end_offset: number;
  selected_text: string | null;
  kind: string;
  note: string | null;
  metadata: unknown;
};

/** Map a practice_annotations DB row → PassageAnnotation for cross-device restore. */
export function mapRemoteAnnotationRow(row: RemoteAnnotationRow): PassageAnnotation | null {
  if (row.kind !== 'highlight' && row.kind !== 'note') return null;
  if (!Number.isInteger(row.paragraph_index) || row.paragraph_index < 0) return null;
  if (!Number.isInteger(row.start_offset) || row.start_offset < 0) return null;
  if (!Number.isInteger(row.end_offset) || row.end_offset <= row.start_offset) return null;

  const metadata = row.metadata;
  const clientId =
    metadata &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    typeof (metadata as Record<string, unknown>).client_annotation_id === 'string'
      ? ((metadata as Record<string, unknown>).client_annotation_id as string)
      : row.id;

  return {
    id: clientId,
    paragraphIndex: row.paragraph_index,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    text: typeof row.selected_text === 'string' ? row.selected_text : '',
    kind: row.kind,
    note: typeof row.note === 'string' ? row.note : null,
  };
}

/**
 * Content signature of an annotation set, independent of client ids. Lets the sync
 * layer skip redundant pushes and avoid a restore-echo (restored rows carry the
 * cloud's ids but identical content, so the signature still matches the baseline).
 */
export function annotationsSignature(annotations: PassageAnnotation[]): string {
  return annotations
    .filter(isPersistableAnnotation)
    .map(
      (annotation) =>
        `${annotation.paragraphIndex}:${annotation.startOffset}:${annotation.endOffset}:${annotation.kind}:${normalizeNote(annotation.note) ?? ''}`
    )
    .sort()
    .join('|');
}
