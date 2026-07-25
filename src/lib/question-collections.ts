import type { SupabaseClient } from '@supabase/supabase-js';
import type { IeltsQuestion } from './types';

type CollectionTable = 'favorites' | 'wrong_book';

export async function getQuestionsForCollection(
  supabase: SupabaseClient,
  table: CollectionTable,
  userId: string
) {
  const { data: entries, error: entriesError } = await supabase
    .from(table)
    .select('question_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (entriesError) {
    return { questions: [] as IeltsQuestion[], error: entriesError };
  }

  const questionIds = entries.map((entry) => entry.question_id as string);
  if (questionIds.length === 0) {
    return { questions: [] as IeltsQuestion[], error: null };
  }

  const { data, error } = await supabase
    .from('ielts_questions')
    .select('*')
    .in('id', questionIds);

  if (error || !data) {
    return { questions: [] as IeltsQuestion[], error };
  }

  const questionById = new Map(
    data.map((question) => [question.id as string, question as IeltsQuestion])
  );

  const questions = questionIds
    .map((questionId) => questionById.get(questionId))
    .filter((question): question is IeltsQuestion => Boolean(question));

  return { questions, error: null };
}
