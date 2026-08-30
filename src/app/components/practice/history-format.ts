// Pure date/duration formatters for the practice history view. formatDayLabel/formatTime
// are locale-driven (zh-CN) display wrappers; formatDuration and dayKey carry the testable logic.

export function formatDuration(seconds: number) {
  if (seconds <= 0) return '0 分钟';
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} 分钟`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`;
}

export function formatDayLabel(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function dayKey(ts: number) {
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
