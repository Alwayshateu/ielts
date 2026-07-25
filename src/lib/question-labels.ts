const CATEGORY_LABELS: Record<string, string> = {
  mixed: '综合',
  reading: '阅读',
  listening: '听力',
  writing: '写作',
  speaking: '口语',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '基础',
  medium: '进阶',
  hard: '挑战',
};

export function formatCategory(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

export function formatDifficulty(difficulty: string) {
  return DIFFICULTY_LABELS[difficulty] ?? difficulty;
}
