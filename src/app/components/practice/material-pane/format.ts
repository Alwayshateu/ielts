import type { PracticeUnit } from '@/lib/types';
import type { AnnotationSyncStatus } from '../usePracticeAnnotationSync';

// mm:ss + minute-duration formatters live in @/lib/practice-clock; re-exported here for material-pane consumers.
export { formatClock as formatTimer, formatMinutes } from '@/lib/practice-clock';

export function formatMetadataSeconds(value: unknown) {
  if (typeof value !== 'number') return '未设置';
  if (value < 60) return `${value} 秒`;
  return `${Math.round(value / 60)} 分钟`;
}

export function formatMetadataValue(value: unknown, fallback = '未设置') {
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
}

export function getMaterialText(unit: PracticeUnit) {
  return unit.passage_text ?? unit.transcript ?? String(unit.metadata?.prompt ?? unit.metadata?.cueCard ?? '');
}

export function annotationSyncCopy(sync: { status: AnnotationSyncStatus; restoredCount: number }): string {
  switch (sync.status) {
    case 'syncing':
      return '，正在同步到云端…';
    case 'error':
      return '，本机已保存，云端同步暂时失败，改动后会自动重试。';
    case 'synced':
      return sync.restoredCount > 0
        ? `，已与云端同步（含 ${sync.restoredCount} 条从云端恢复），换设备也能看到。`
        : '，已同步到云端，换设备也能看到。';
    default:
      return '，本机已保存，改动后会同步到云端。';
  }
}
