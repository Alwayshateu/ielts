import { describe, expect, it } from 'vitest';
import type { PassageAnnotation, PracticeUnit } from '@/lib/types';
import {
  annotationSyncCopy,
  formatMetadataSeconds,
  formatMetadataValue,
  getMaterialText,
} from '../format';
import { hasOverlap } from '../selection';

function makeUnit(overrides: Partial<PracticeUnit>): PracticeUnit {
  return { passage_text: null, transcript: null, metadata: {}, ...overrides } as unknown as PracticeUnit;
}

function makeAnnotation(overrides: Partial<PassageAnnotation>): PassageAnnotation {
  return { paragraphIndex: 0, startOffset: 0, endOffset: 10, ...overrides } as unknown as PassageAnnotation;
}

describe('formatMetadataSeconds', () => {
  it('falls back for non-numeric values', () => {
    expect(formatMetadataSeconds('abc')).toBe('未设置');
    expect(formatMetadataSeconds(undefined)).toBe('未设置');
    expect(formatMetadataSeconds(null)).toBe('未设置');
  });

  it('keeps sub-minute values in seconds', () => {
    expect(formatMetadataSeconds(45)).toBe('45 秒');
    expect(formatMetadataSeconds(59)).toBe('59 秒');
  });

  it('promotes to minutes at or above one minute', () => {
    expect(formatMetadataSeconds(60)).toBe('1 分钟');
    expect(formatMetadataSeconds(180)).toBe('3 分钟');
  });
});

describe('formatMetadataValue', () => {
  it('stringifies numbers including zero', () => {
    expect(formatMetadataValue(250)).toBe('250');
    expect(formatMetadataValue(0)).toBe('0');
  });

  it('keeps non-empty strings', () => {
    expect(formatMetadataValue('task_2')).toBe('task_2');
  });

  it('uses the fallback for blank or missing values', () => {
    expect(formatMetadataValue('   ')).toBe('未设置');
    expect(formatMetadataValue('')).toBe('未设置');
    expect(formatMetadataValue(null)).toBe('未设置');
    expect(formatMetadataValue(undefined)).toBe('未设置');
    expect(formatMetadataValue(true)).toBe('未设置');
  });

  it('honours a custom fallback', () => {
    expect(formatMetadataValue(undefined, 'task_2')).toBe('task_2');
  });
});

describe('getMaterialText', () => {
  it('prefers passage text', () => {
    expect(getMaterialText(makeUnit({ passage_text: 'Reading body', transcript: 'ignored' }))).toBe('Reading body');
  });

  it('falls back to transcript', () => {
    expect(getMaterialText(makeUnit({ transcript: 'Audio transcript' }))).toBe('Audio transcript');
  });

  it('falls back to the prompt then the cue card', () => {
    expect(getMaterialText(makeUnit({ metadata: { prompt: 'Write an essay' } }))).toBe('Write an essay');
    expect(getMaterialText(makeUnit({ metadata: { cueCard: 'Describe a place' } }))).toBe('Describe a place');
  });

  it('returns an empty string when nothing is available', () => {
    expect(getMaterialText(makeUnit({}))).toBe('');
  });
});

describe('annotationSyncCopy', () => {
  it('describes each sync status', () => {
    expect(annotationSyncCopy({ status: 'syncing', restoredCount: 0 })).toBe('，正在同步到云端…');
    expect(annotationSyncCopy({ status: 'error', restoredCount: 0 })).toBe(
      '，本机已保存，云端同步暂时失败，改动后会自动重试。'
    );
    expect(annotationSyncCopy({ status: 'synced', restoredCount: 0 })).toBe('，已同步到云端，换设备也能看到。');
    expect(annotationSyncCopy({ status: 'idle', restoredCount: 0 })).toBe('，本机已保存，改动后会同步到云端。');
    expect(annotationSyncCopy({ status: 'disabled', restoredCount: 0 })).toBe('，本机已保存，改动后会同步到云端。');
  });

  it('mentions the restored count when syncing pulled cloud annotations', () => {
    expect(annotationSyncCopy({ status: 'synced', restoredCount: 2 })).toContain('含 2 条');
  });
});

describe('hasOverlap', () => {
  it('detects an overlap within the same paragraph', () => {
    expect(hasOverlap([makeAnnotation({ startOffset: 0, endOffset: 10 })], { paragraphIndex: 0, startOffset: 5, endOffset: 15 })).toBe(true);
  });

  it('treats touching edges as non-overlapping', () => {
    expect(hasOverlap([makeAnnotation({ startOffset: 0, endOffset: 10 })], { paragraphIndex: 0, startOffset: 10, endOffset: 20 })).toBe(false);
  });

  it('ignores disjoint ranges', () => {
    expect(hasOverlap([makeAnnotation({ startOffset: 0, endOffset: 10 })], { paragraphIndex: 0, startOffset: 20, endOffset: 30 })).toBe(false);
  });

  it('ignores overlaps in a different paragraph', () => {
    expect(hasOverlap([makeAnnotation({ paragraphIndex: 0, startOffset: 0, endOffset: 10 })], { paragraphIndex: 1, startOffset: 0, endOffset: 10 })).toBe(false);
  });

  it('returns false for an empty annotation list', () => {
    expect(hasOverlap([], { paragraphIndex: 0, startOffset: 0, endOffset: 10 })).toBe(false);
  });
});
