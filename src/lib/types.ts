export type QuestionType = 'multiple_choice' | 'fill_in_the_blank';

export interface IeltsQuestion {
  id: string;
  type: QuestionType;
  category: string;
  difficulty: string;
  article_content?: string | null;
  question_text: string;
  options?: string[] | null;
  correct_answer: string;
  explanation?: string | null;
}

export type PracticeSkill = 'foundation' | 'reading' | 'listening' | 'writing' | 'speaking';
export type PracticeMode = 'basic' | 'progressive' | 'challenge';
export type PracticeDifficulty = 'easy' | 'medium' | 'hard';

export type PracticeMaterialType =
  | 'none'
  | 'passage'
  | 'audio'
  | 'writing_prompt'
  | 'speaking_prompt'
  | 'foundation_note';

export type PracticeQuestionType =
  | 'multiple_choice'
  | 'true_false_not_given'
  | 'sentence_completion'
  | 'short_answer'
  | 'writing_task'
  | 'speaking_response';

export type PracticeAnswerKey = {
  answers: string[];
  caseSensitive?: boolean;
  acceptedAlternatives?: string[];
};

export interface PracticeQuestion {
  id: string;
  unit_id: string;
  question_number: number;
  question_type: PracticeQuestionType;
  question_text: string;
  options: string[] | null;
  answer_key: PracticeAnswerKey;
  explanation: string | null;
  metadata?: Record<string, unknown>;
}

export type PassageAnnotationKind = 'highlight' | 'note';

export interface PassageAnnotation {
  id: string;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
  kind: PassageAnnotationKind;
  note: string | null;
}

export interface PracticeUnit {
  id: string;
  slug: string;
  skill: PracticeSkill;
  mode: PracticeMode;
  title: string;
  description: string | null;
  difficulty: PracticeDifficulty;
  material_type: PracticeMaterialType;
  passage_text: string | null;
  audio_url: string | null;
  transcript: string | null;
  asset_url: string | null;
  time_limit_seconds: number | null;
  metadata?: Record<string, unknown>;
  questions: PracticeQuestion[];
}
