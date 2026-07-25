import type { SupabaseClient } from '@supabase/supabase-js';

import {
  mapPracticeUnitRow,
  mapPracticeUnitRows,
  type RawPracticeQuestionRow,
  type RawPracticeUnitRow,
} from './practice-unit-mapper';
import { getSamplePracticeUnit, getSamplePracticeUnits } from './practice-session-samples';
import { createSupabaseServerClient } from './supabase-server';
import type { PracticeUnit } from './types';

export type PracticeUnitRepository = {
  list: () => Promise<PracticeUnit[]>;
  get: (unitId: string) => Promise<PracticeUnit | null>;
};

export type PracticeUnitsSource = 'local' | 'supabase';

const PRACTICE_UNIT_FIELDS = [
  'id',
  'slug',
  'skill',
  'mode',
  'title',
  'description',
  'difficulty',
  'material_type',
  'passage_text',
  'audio_url',
  'transcript',
  'asset_url',
  'time_limit_seconds',
  'metadata',
  'is_active',
].join(',');

const PRACTICE_QUESTION_FIELDS = [
  'id',
  'unit_id',
  'question_number',
  'question_type',
  'question_text',
  'options',
  'answer_key',
  'explanation',
  'metadata',
  'is_active',
].join(',');

export const localPracticeUnitRepository: PracticeUnitRepository = {
  async list() {
    return getSamplePracticeUnits();
  },
  async get(unitId) {
    return getSamplePracticeUnit(unitId);
  },
};

function practiceUnitsReadError(operation: string, message: string) {
  return new Error(`Unable to ${operation} from Supabase practice tables: ${message}`);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function createSupabasePracticeUnitRepository(
  supabase: SupabaseClient
): PracticeUnitRepository {
  async function readQuestions(unitIds: string[]) {
    if (unitIds.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('practice_questions')
      .select(PRACTICE_QUESTION_FIELDS)
      .in('unit_id', unitIds)
      .eq('is_active', true)
      .order('question_number', { ascending: true });

    if (error) {
      throw practiceUnitsReadError('read questions', error.message);
    }

    return (data ?? []) as unknown as RawPracticeQuestionRow[];
  }

  return {
    async list() {
      const { data, error } = await supabase
        .from('practice_units')
        .select(PRACTICE_UNIT_FIELDS)
        .eq('is_active', true)
        .order('skill', { ascending: true })
        .order('mode', { ascending: true })
        .order('title', { ascending: true })
        .order('id', { ascending: true });

      if (error) {
        throw practiceUnitsReadError('list units', error.message);
      }

      const unitRows = (data ?? []) as unknown as RawPracticeUnitRow[];
      const questionRows = await readQuestions(
        unitRows.map((row) => {
          if (typeof row.id !== 'string') {
            throw practiceUnitsReadError('list units', 'received a unit without a valid id');
          }
          return row.id;
        })
      );

      return mapPracticeUnitRows(unitRows, questionRows);
    },

    async get(unitId) {
      const column = isUuid(unitId) ? 'id' : 'slug';
      const { data, error } = await supabase
        .from('practice_units')
        .select(PRACTICE_UNIT_FIELDS)
        .eq(column, unitId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        throw practiceUnitsReadError(`read unit ${unitId}`, error.message);
      }
      if (!data) {
        return null;
      }

      const row = data as unknown as RawPracticeUnitRow;
      if (typeof row.id !== 'string') {
        throw practiceUnitsReadError(`read unit ${unitId}`, 'received a unit without a valid id');
      }

      const questions = await readQuestions([row.id]);
      return mapPracticeUnitRow(row, questions);
    },
  };
}

export function getPracticeUnitsSource(
  value = process.env.PRACTICE_UNITS_SOURCE
): PracticeUnitsSource {
  if (!value || value === 'local') {
    return 'local';
  }
  if (value === 'supabase') {
    return 'supabase';
  }

  throw new Error(
    `Unsupported PRACTICE_UNITS_SOURCE value "${value}". Use "local" or "supabase".`
  );
}

export function createPracticeUnitService(repository: PracticeUnitRepository) {
  return {
    getPracticeUnits: () => repository.list(),
    getPracticeUnit: (unitId: string) => repository.get(unitId),
  };
}

async function getConfiguredPracticeUnitRepository() {
  if (getPracticeUnitsSource() === 'local') {
    return localPracticeUnitRepository;
  }

  const supabase = await createSupabaseServerClient();
  return createSupabasePracticeUnitRepository(supabase);
}

export async function getPracticeUnits() {
  const repository = await getConfiguredPracticeUnitRepository();
  return repository.list();
}

export async function getPracticeUnit(unitId: string) {
  const repository = await getConfiguredPracticeUnitRepository();
  return repository.get(unitId);
}
