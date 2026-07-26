export function formatLastPracticed(value: string | null) {
  if (!value) return '还没有记录';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '最近练过';

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
