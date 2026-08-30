/**
 * Synced-transcript cue helpers for the Listening Session preview.
 *
 * A cue pairs a start time (seconds into the audio) with a line of transcript.
 * The player uses these to highlight the active line, auto-scroll it into view,
 * and support click-to-seek. Pure + serializable so it can be unit-tested and
 * stored alongside the local sample units in metadata.
 */

export interface TranscriptCue {
  start: number;
  text: string;
}

/**
 * Validates and normalizes raw cue data (typically from unit.metadata).
 * - drops entries without a finite start or non-empty text
 * - clamps negative starts to 0
 * - sorts ascending by start time
 */
export function parseTranscriptCues(raw: unknown): TranscriptCue[] {
  if (!Array.isArray(raw)) return [];

  const cues: TranscriptCue[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as { start?: unknown; text?: unknown };
    const start = candidate.start;
    const text = candidate.text;
    if (typeof start !== 'number' || !Number.isFinite(start)) continue;
    if (typeof text !== 'string' || !text.trim()) continue;
    cues.push({ start: Math.max(0, start), text: text.trim() });
  }

  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Returns the index of the active cue for the given playback time, i.e. the last
 * cue whose start is <= currentSeconds. Returns -1 before the first cue starts or
 * when there are no cues.
 */
export function resolveActiveCueIndex(cues: TranscriptCue[], currentSeconds: number): number {
  if (cues.length === 0) return -1;

  let active = -1;
  for (let i = 0; i < cues.length; i += 1) {
    if (currentSeconds + 1e-3 >= cues[i].start) {
      active = i;
    } else {
      break;
    }
  }
  return active;
}

export function formatClock(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

export function clampPlaybackTime(seconds: number, duration: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  if (Number.isFinite(duration) && duration > 0 && seconds > duration) return duration;
  return seconds;
}
