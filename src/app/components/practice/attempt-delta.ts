import { formatClock } from '@/lib/practice-clock';

// Delta presentation for the attempt comparison ("较上次") tiles. A zero delta is
// intentionally distinct from a missing one: zero renders a ± glyph, null renders nothing.
export function formatSignedPercent(delta: number) {
  return `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${Math.abs(delta)}%`;
}

export function formatSignedSeconds(delta: number) {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return `${sign}${formatClock(Math.abs(delta))}`;
}

export function deltaTone(delta: number | null) {
  if (delta === null || delta === 0) return undefined;
  return delta > 0 ? 'text-emerald-600' : 'text-rose-600';
}
