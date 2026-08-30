import type { PracticeQuestion, PracticeUnit } from '@/lib/types';

// A non-empty, trimmed URL string, or null. Centralises the "treat blank/whitespace as absent" guard
// so render sites can decide whether to show a reference image with a simple truthy check.
function cleanUrl(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

// Unit-level reference image — the Writing Task 1 chart/map, or a reading passage / listening section
// diagram. Lives in the first-class asset_url column (the practice model's asset_url slot).
export function getUnitAssetUrl(unit: Pick<PracticeUnit, 'asset_url'>): string | null {
  return cleanUrl(unit.asset_url);
}

// Question-level reference image — e.g. a listening map/plan that a specific question group labels.
// Questions have no dedicated column, so this rides in metadata.assetUrl.
export function getQuestionAssetUrl(question: Pick<PracticeQuestion, 'metadata'>): string | null {
  return cleanUrl(question.metadata?.assetUrl);
}
