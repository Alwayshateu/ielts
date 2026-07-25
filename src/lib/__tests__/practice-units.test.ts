import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSamplePracticeUnit, getSamplePracticeUnits } from '../practice-session-samples';
import {
  createPracticeUnitService,
  createSupabasePracticeUnitRepository,
  getPracticeUnit,
  getPracticeUnits,
  getPracticeUnitsSource,
  type PracticeUnitRepository,
} from '../practice-units';

const originalSource = process.env.PRACTICE_UNITS_SOURCE;
const GREEN_ROOFS_UUID = '11111111-1111-4111-8111-111111111111';

afterEach(() => {
  vi.restoreAllMocks();
  if (originalSource === undefined) {
    delete process.env.PRACTICE_UNITS_SOURCE;
  } else {
    process.env.PRACTICE_UNITS_SOURCE = originalSource;
  }
});

function supabaseUnitRow(overrides: Record<string, unknown> = {}) {
  return {
    id: GREEN_ROOFS_UUID,
    slug: 'reading-progressive-urban-green-roofs-001',
    skill: 'reading',
    mode: 'progressive',
    title: 'Urban Green Roofs',
    description: 'Mapped from Supabase',
    difficulty: 'medium',
    material_type: 'passage',
    passage_text: 'Passage body',
    audio_url: null,
    transcript: null,
    asset_url: null,
    time_limit_seconds: 1200,
    metadata: { source: 'supabase-test' },
    is_active: true,
    ...overrides,
  };
}

function supabaseQuestionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'question-1',
    unit_id: GREEN_ROOFS_UUID,
    question_number: 1,
    question_type: 'short_answer',
    question_text: 'What is the answer?',
    options: null,
    answer_key: { answers: ['answer'], caseSensitive: false },
    explanation: 'Because it is the answer.',
    metadata: { ieltsType: 'short_answer' },
    is_active: true,
    ...overrides,
  };
}

function createFakeSupabaseClient({
  units = [supabaseUnitRow()],
  questions = [supabaseQuestionRow()],
  unitsError = null,
  questionsError = null,
}: {
  units?: Record<string, unknown>[];
  questions?: Record<string, unknown>[];
  unitsError?: { message: string } | null;
  questionsError?: { message: string } | null;
}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  class QueryBuilder {
    table: string;
    single = false;
    filters = new Map<string, unknown>();

    constructor(table: string) {
      this.table = table;
    }

    select(...args: unknown[]) {
      calls.push({ table: this.table, method: 'select', args });
      return this;
    }

    eq(column: string, value: unknown) {
      calls.push({ table: this.table, method: 'eq', args: [column, value] });
      this.filters.set(column, value);
      return this;
    }

    in(column: string, value: unknown[]) {
      calls.push({ table: this.table, method: 'in', args: [column, value] });
      this.filters.set(column, value);
      return this;
    }

    order(...args: unknown[]) {
      calls.push({ table: this.table, method: 'order', args });
      return this;
    }

    maybeSingle() {
      this.single = true;
      return this;
    }

    then(resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) {
      return Promise.resolve(this.result()).then(resolve, reject);
    }

    result() {
      if (this.table === 'practice_units') {
        if (unitsError) return { data: null, error: unitsError };
        const activeOnly = this.filters.get('is_active') === true;
        const id = this.filters.get('id');
        const slug = this.filters.get('slug');
        const rows = units.filter((unit) => {
          if (activeOnly && unit.is_active !== true) return false;
          if (id !== undefined && unit.id !== id) return false;
          if (slug !== undefined && unit.slug !== slug) return false;
          return true;
        });
        return { data: this.single ? rows[0] ?? null : rows, error: null };
      }

      if (questionsError) return { data: null, error: questionsError };
      const activeOnly = this.filters.get('is_active') === true;
      const ids = this.filters.get('unit_id');
      const rows = questions.filter((question) => {
        if (activeOnly && question.is_active !== true) return false;
        if (Array.isArray(ids) && !ids.includes(question.unit_id)) return false;
        return true;
      });
      return { data: rows, error: null };
    }
  }

  return {
    calls,
    client: {
      from(table: string) {
        calls.push({ table, method: 'from', args: [] });
        return new QueryBuilder(table);
      },
    },
  };
}

describe('practice unit adapter', () => {
  it('uses local sample units when the source is unset', async () => {
    delete process.env.PRACTICE_UNITS_SOURCE;

    expect(getPracticeUnitsSource()).toBe('local');
    await expect(getPracticeUnits()).resolves.toEqual(getSamplePracticeUnits());
  });

  it('uses local sample units when the source is explicitly local', async () => {
    process.env.PRACTICE_UNITS_SOURCE = 'local';

    await expect(getPracticeUnits()).resolves.toEqual(getSamplePracticeUnits());
  });

  it('resolves every local sample unit by id and slug', async () => {
    process.env.PRACTICE_UNITS_SOURCE = 'local';
    const samples = getSamplePracticeUnits();

    for (const unit of samples) {
      await expect(getPracticeUnit(unit.id)).resolves.toEqual(getSamplePracticeUnit(unit.id));
      await expect(getPracticeUnit(unit.slug)).resolves.toEqual(getSamplePracticeUnit(unit.slug));
    }
  });

  it('returns null for unknown local units', async () => {
    process.env.PRACTICE_UNITS_SOURCE = 'local';

    await expect(getPracticeUnit('not-a-real-unit')).resolves.toBeNull();
  });

  it('rejects unsupported source values instead of silently falling back', () => {
    expect(() => getPracticeUnitsSource('remote')).toThrow(/Unsupported PRACTICE_UNITS_SOURCE/);
  });

  it('delegates through an injected read-only repository', async () => {
    const units = getSamplePracticeUnits();
    const repository: PracticeUnitRepository = {
      list: vi.fn().mockResolvedValue(units),
      get: vi.fn().mockImplementation(async (unitId: string) => getSamplePracticeUnit(unitId)),
    };
    const service = createPracticeUnitService(repository);

    await expect(service.getPracticeUnits()).resolves.toBe(units);
    await expect(service.getPracticeUnit(units[0].slug)).resolves.toEqual(units[0]);
    await expect(service.getPracticeUnit('missing')).resolves.toBeNull();
    expect(repository.list).toHaveBeenCalledTimes(1);
    expect(repository.get).toHaveBeenCalledTimes(2);
  });

  it('maps Supabase list reads through the read-only repository', async () => {
    const { client, calls } = createFakeSupabaseClient({
      questions: [
        supabaseQuestionRow({ id: 'question-2', question_number: 2 }),
        supabaseQuestionRow(),
      ],
    });
    const repository = createSupabasePracticeUnitRepository(client as never);

    await expect(repository.list()).resolves.toMatchObject([
      {
        id: GREEN_ROOFS_UUID,
        slug: 'reading-progressive-urban-green-roofs-001',
        questions: [{ id: 'question-1' }, { id: 'question-2' }],
      },
    ]);
    expect(calls.some((call) => call.table === 'practice_units' && call.method === 'from')).toBe(
      true
    );
    expect(
      calls.some((call) => call.table === 'practice_questions' && call.method === 'in')
    ).toBe(true);
  });

  it('maps Supabase get reads by slug and UUID id', async () => {
    const bySlug = createFakeSupabaseClient({});
    const byId = createFakeSupabaseClient({});

    await expect(
      createSupabasePracticeUnitRepository(bySlug.client as never).get(
        'reading-progressive-urban-green-roofs-001'
      )
    ).resolves.toMatchObject({ id: GREEN_ROOFS_UUID });
    await expect(
      createSupabasePracticeUnitRepository(byId.client as never).get(GREEN_ROOFS_UUID)
    ).resolves.toMatchObject({ slug: 'reading-progressive-urban-green-roofs-001' });
    expect(bySlug.calls).toContainEqual({
      table: 'practice_units',
      method: 'eq',
      args: ['slug', 'reading-progressive-urban-green-roofs-001'],
    });
    expect(byId.calls).toContainEqual({
      table: 'practice_units',
      method: 'eq',
      args: ['id', GREEN_ROOFS_UUID],
    });
  });

  it('returns null for missing Supabase units', async () => {
    const { client } = createFakeSupabaseClient({ units: [] });

    await expect(
      createSupabasePracticeUnitRepository(client as never).get('missing-unit')
    ).resolves.toBeNull();
  });

  it('propagates Supabase read errors with operation context', async () => {
    const unitFailure = createFakeSupabaseClient({
      unitsError: { message: 'relation practice_units does not exist' },
    });
    const questionFailure = createFakeSupabaseClient({
      questionsError: { message: 'relation practice_questions does not exist' },
    });

    await expect(
      createSupabasePracticeUnitRepository(unitFailure.client as never).list()
    ).rejects.toThrow(/Unable to list units from Supabase practice tables/);
    await expect(
      createSupabasePracticeUnitRepository(questionFailure.client as never).list()
    ).rejects.toThrow(/Unable to read questions from Supabase practice tables/);
  });

  it('propagates repository read errors', async () => {
    const repository: PracticeUnitRepository = {
      list: vi.fn().mockRejectedValue(new Error('practice tables unavailable')),
      get: vi.fn().mockRejectedValue(new Error('practice tables unavailable')),
    };
    const service = createPracticeUnitService(repository);

    await expect(service.getPracticeUnits()).rejects.toThrow('practice tables unavailable');
    await expect(service.getPracticeUnit('unit-1')).rejects.toThrow(
      'practice tables unavailable'
    );
  });

  it('exposes no write operations in the repository contract', () => {
    const repository: PracticeUnitRepository = {
      list: async () => [],
      get: async () => null,
    };

    expect(Object.keys(repository).sort()).toEqual(['get', 'list']);
  });
});
