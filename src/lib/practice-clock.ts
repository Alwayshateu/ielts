export function formatClock(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function formatMinutes(seconds: number | null) {
  if (!seconds) return '不限时';
  return `${Math.round(seconds / 60)} 分钟`;
}
