# IELTS Trainer 真实练习模型规划

## 1. 为什么需要这份规划

当前 IELTS Trainer 已经完成一轮主要前端体验升级：登录页、Dashboard、Practice、Settings、收藏夹、错题本都已经统一为更高级的视觉和交互风格。下一步真正决定产品上限的不是继续加 hover，而是把练习模型从“随机单题”升级成“真实 IELTS 训练系统”。

真实 IELTS 不是一题一题孤立出现：

- Reading 是一整篇 Passage 对应多道题。
- Listening 是一个 Section / Audio 对应多道题。
- Writing 是 Task 1 / Task 2 的完整写作任务。
- Speaking 是 Part 1 / Part 2 / Part 3 的口语任务流。

当前项目应该先保留现有可用闭环，再渐进增加新的 Practice Session 模型，避免直接破坏已有的 Practice、Dashboard、Favorites、Wrong Book。

## 2. 当前模型现状

主要来源：`supabase/schema.sql`、`src/lib/types.ts`、`src/app/components/PracticeView.tsx`。

当前核心表：

- `profiles`
- `ielts_questions`
- `favorites`
- `wrong_book`
- `history`

当前 RPC：

- `get_random_questions(p_category, p_difficulty, p_limit)`

当前 TypeScript 类型：

```ts
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
```

当前 Practice 业务契约必须保留：

- 答案判定：`userAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase()`
- 每次有效提交都写入 `history`
- 答错后去重写入 `wrong_book`
- `category === 'mixed'` 时 difficulty 传 `null`
- 收藏使用 optimistic update，失败回滚
- `Enter` 提交
- `Space` 下一题

## 3. 当前 flat question model 的限制

### 3.1 没有 Passage / Section / Task 实体

`ielts_questions.article_content` 挂在单个 question row 上。

这意味着：

- 一篇文章无法自然对应多道题。
- 多道题复用同一篇 Passage 时只能复制 `article_content`。
- 无法维护 Passage 级标题、来源、难度、题组顺序、时间限制。

### 3.2 没有题组顺序

当前没有：

- `unit_id`
- `passage_id`
- `section_id`
- `question_number`
- `order_index`

因此不能表达：

```text
Reading Passage 1
  ├─ Question 1
  ├─ Question 2
  ├─ Question 3
  └─ Question 13
```

### 3.3 题型太少

当前只支持：

- `multiple_choice`
- `fill_in_the_blank`

真实 IELTS 还需要：

- True / False / Not Given
- Yes / No / Not Given
- Matching Headings
- Matching Information
- Sentence Completion
- Summary Completion
- Form / Note / Table Completion
- Map Labeling
- Short Answer
- Writing Task
- Speaking Cue Card

### 3.4 `correct_answer text` 不足以覆盖复杂答案

复杂题型需要：

- 多空答案
- 多选答案
- matching 映射
- 可接受同义答案
- 大小写/单复数/标点容错
- 写作/口语非客观评分

因此新模型应使用 `jsonb` 保存 answer key 和 user answer。

### 3.5 Listening / Writing / Speaking 缺少任务字段

当前没有：

- `audio_url`
- `duration_seconds`
- `transcript`
- `asset_url`
- `word_target`
- `rubric`
- `prep_seconds`
- `response_seconds`

所以 Listening / Writing / Speaking 现在只是 category，不是真实任务。

## 4. 未来内容模型

推荐新增通用概念：`Practice Unit`。

```text
Practice Unit
  ├─ Material: Passage / Audio / Task Prompt / Cue Card / Foundation Material
  └─ Questions[] 或 Task Submission
```

一个 `Practice Unit` 是用户进入一次训练时看到的完整任务单元。

## 5. Skill 模型

### 5.1 Reading

```text
Reading Unit
  ├─ title
  ├─ passage_text
  ├─ source
  ├─ difficulty
  ├─ time_limit_seconds
  └─ questions[] ordered by question_number
```

推荐支持题型：

- `multiple_choice`
- `true_false_not_given`
- `yes_no_not_given`
- `matching_headings`
- `matching_information`
- `sentence_completion`
- `summary_completion`
- `short_answer`

### 5.2 Listening

```text
Listening Unit
  ├─ title
  ├─ section_number
  ├─ audio_url
  ├─ transcript
  ├─ duration_seconds
  ├─ time_limit_seconds
  └─ questions[] ordered by question_number
```

推荐支持题型：

- `form_completion`
- `note_completion`
- `table_completion`
- `multiple_choice`
- `map_labeling`
- `matching`
- `short_answer`

### 5.3 Writing

```text
Writing Unit
  ├─ task_type: task_1 | task_2
  ├─ prompt
  ├─ asset_url optional chart/table/map/image
  ├─ word_target
  ├─ time_limit_seconds
  └─ rubric metadata
```

Writing 不适合继续套 `correct_answer`。

后续应支持：

- 用户作文提交
- 字数统计
- 手动自评
- rubric 展示
- 未来 AI feedback

### 5.4 Speaking

```text
Speaking Unit
  ├─ part: part_1 | part_2 | part_3
  ├─ prompt / cue_card
  ├─ prep_seconds
  ├─ response_seconds
  ├─ follow_up_questions
  └─ rubric metadata
```

Speaking 后续应支持：

- 准备倒计时
- 回答倒计时
- 录音
- 转写
- 自评或 AI feedback

本阶段只规划，不接录音/AI。

## 6. Basic / Progressive / Challenge 定义

未来不要把 Basic / Progressive / Challenge 简单等同于 `easy` / `medium` / `hard`。

它们应该是训练模式，而 difficulty 是内容难度。

### 6.1 Basic

目标：补基础能力，降低进入门槛。

内容可以不全是 IELTS 真题。

适合：

- vocabulary
- grammar
- long sentence parsing
- paraphrase recognition
- listening sound discrimination
- speaking sentence patterns
- writing sentence building

示例：

```text
Basic Reading
  └─ 长难句拆解 + paraphrase 识别

Basic Listening
  └─ 数字 / 日期 / 地址 / 名字听辨
```

### 6.2 Progressive

目标：IELTS 题型专项训练。

适合：

- Reading Passage 局部题型训练
- Listening Section 局部训练
- Writing Task 分步骤训练
- Speaking Cue Card 组织训练

示例：

```text
Progressive Reading
  └─ Passage + Matching Headings 题组

Progressive Listening
  └─ Section 1 + Form Completion
```

### 6.3 Challenge

目标：接近实考压力。

适合：

- 完整 Reading Passage
- 完整 Listening Section
- 限时训练
- 错题回炉
- 模考模式

示例：

```text
Challenge Reading
  └─ 20 分钟 Passage + 13 道题

Challenge Listening
  └─ 完整 Section + 音频一次播放
```

## 7. Schema（已应用）

实际 SQL 放在：

```text
supabase/migrations/0001_practice_sessions.sql   -- 5 张 practice_* 表 + RLS
supabase/migrations/0002_seed_practice_samples.sql -- 样题种子（由脚本生成）
```

这两份 migration **已经应用到 Supabase**。`supabase/schema.sql` 保留为现役 legacy 表
（`profiles` / `ielts_questions` / `favorites` / `wrong_book` / `history`）的结构记录；
migration 不修改这些表。重建项目时的顺序是 `schema.sql` → `0001` → `0002`。

0002 是生成文件，不要手改 —— 样题变了就重跑：

```bash
node scripts/generate-practice-seed.mjs   # 重新生成 SQL
node scripts/apply-practice-seed.mjs      # 直接上传（需要 service role key）
```

相对早期草案，最终 schema 有三处修正：`practice_questions.external_key`（存前端题目
id，让本地记录能对齐到 DB 行）、`practice_answers.outcome`（四态，`is_correct` 改为由它
推导的 generated column）、`practice_attempts` 的 `elapsed_seconds` / `self_rated_band`
等显式列（History 需要聚合排序，不塞 metadata）。

### 7.1 `practice_units`

```sql
create table public.practice_units (
  id uuid primary key default gen_random_uuid(),
  skill text not null check (skill in ('foundation', 'reading', 'listening', 'writing', 'speaking')),
  mode text not null check (mode in ('basic', 'progressive', 'challenge')),
  title text not null,
  description text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  material_type text not null check (material_type in ('none', 'passage', 'audio', 'writing_prompt', 'speaking_prompt', 'foundation_note')),
  passage_text text,
  audio_url text,
  transcript text,
  asset_url text,
  time_limit_seconds int,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 7.2 `practice_questions`

```sql
create table public.practice_questions (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.practice_units(id) on delete cascade,
  legacy_question_id uuid references public.ielts_questions(id) on delete set null,
  question_number int not null,
  question_type text not null,
  question_text text not null,
  options jsonb,
  answer_key jsonb,
  explanation text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, question_number)
);
```

`answer_key jsonb` 示例：

```json
{
  "answers": ["conclusion"],
  "caseSensitive": false,
  "acceptedAlternatives": ["a conclusion"]
}
```

Matching 示例：

```json
{
  "matches": {
    "1": "C",
    "2": "A",
    "3": "F"
  }
}
```

### 7.3 `practice_attempts`

```sql
create table public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references public.practice_units(id) on delete cascade,
  mode text not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  correct_count int,
  total_count int,
  metadata jsonb not null default '{}'::jsonb
);
```

### 7.4 `practice_answers`

```sql
create table public.practice_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.practice_attempts(id) on delete cascade,
  question_id uuid not null references public.practice_questions(id) on delete cascade,
  user_answer jsonb,
  is_correct boolean,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);
```

### 7.5 `practice_annotations`

Reading 预览已经加入本地 Passage highlight / note。正式持久化时不要混进 `practice_answers`，因为标注属于阅读过程，不等同于作答结果。

```sql
create table public.practice_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_id uuid not null references public.practice_units(id) on delete cascade,
  attempt_id uuid references public.practice_attempts(id) on delete cascade,
  paragraph_index int not null,
  start_offset int not null,
  end_offset int not null,
  selected_text text not null,
  kind text not null check (kind in ('highlight', 'note')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

关键约束：

- offset 基于 paragraph plain text，而不是 DOM child index。
- `selected_text` 用来校验 passage 内容更新后 offset 是否仍然有效。
- `attempt_id` 可为空：允许用户在未提交 session 前也保留阅读标注。
- RLS 必须限定 `auth.uid() = user_id`。
- MVP 可以先保存在浏览器 localStorage；只有确认产品需要跨设备同步时再落库。

### 7.6 收藏和错题兼容方案

当前表：

```sql
favorites(user_id, question_id)
wrong_book(user_id, question_id)
history(user_id, question_id, user_answer, is_correct)
```

不要立即破坏。

可选方案 A：新增新表。

```sql
favorite_practice_questions(user_id, practice_question_id)
wrong_practice_questions(user_id, practice_question_id)
```

优点：不影响旧功能。  
缺点：Review 页面要合并旧表和新表。

可选方案 B：扩展旧表。

```sql
alter table favorites add column practice_question_id uuid references practice_questions(id);
alter table wrong_book add column practice_question_id uuid references practice_questions(id);
```

优点：概念统一。  
缺点：唯一约束和 RLS 迁移更复杂。

推荐：MVP 先用方案 A，等新系统稳定后再考虑合并。

## 8. 新 RPC / 查询草案

### 8.1 获取一个训练单元

```sql
get_random_practice_unit(
  p_skill text default null,
  p_mode text default null,
  p_difficulty text default null
)
returns setof practice_units
```

### 8.2 获取训练单元和题目

实际可以先在 Server Component 中分两步查：

```ts
const unit = await supabase
  .from('practice_units')
  .select('*')
  .eq('id', unitId)
  .single();

const questions = await supabase
  .from('practice_questions')
  .select('*')
  .eq('unit_id', unitId)
  .order('question_number');
```

MVP 不一定需要复杂 RPC。

## 9. 新前端路由和组件规划

当前 legacy route：

```text
src/app/practice/page.tsx
src/app/components/PracticeView.tsx
```

建议保留，不直接替换。

新增 route：

```text
src/app/practice/session/[unitId]/page.tsx
```

新增组件：

```text
src/app/components/practice/PracticeSessionView.tsx
src/app/components/practice/SessionControlBar.tsx
src/app/components/practice/MaterialPane.tsx
src/app/components/practice/QuestionNavigator.tsx
src/app/components/practice/AnswerSheet.tsx
src/app/components/practice/ResultInspector.tsx
```

结构：

```text
PracticeSessionView
  ├─ SessionControlBar
  ├─ MaterialPane
  │   ├─ Reading Passage
  │   ├─ Local highlight / note annotations
  │   ├─ Listening Audio + Transcript
  │   ├─ Writing Prompt
  │   └─ Speaking Cue Card
  ├─ QuestionNavigator
  ├─ AnswerSheet
  └─ ResultInspector
```

### 当前本地预览状态

截至 2026-07-25，前端已经在不改库、不写 Supabase practice tables 的前提下完成了本地 Session Preview：

- `/practice/sessions`：Session Library，支持 Reading / Listening / Writing / Speaking 筛选、本地学习队列和下一步推荐。
- `/practice/session/reading-progressive-urban-green-roofs-001`：Reading Passage + 多题组 + 本地检查 + Passage highlight / note。
- `/practice/session/listening-progressive-library-orientation-001`：Listening Transcript + 音频占位/player shell + 多题组 + Transcript highlight / note。
- `/practice/session/writing-progressive-remote-work-task-2-001`：Writing Task 2 prompt + 本地长文草稿 + writing checklist + IELTS rubric 自评。
- `/practice/session/speaking-progressive-city-change-part-2-001`：Speaking Part 2 cue card + prep/response timer + 本地回答要点 / 自评草稿 + IELTS rubric 自评。

这些 sample 全部来自 `src/lib/practice-session-samples.ts`，answer draft / annotation draft / review tags / rubric ratings 使用浏览器 localStorage。当前仍然是 frontend-first MVP，不会创建 `practice_attempts`、`practice_answers` 或 `practice_annotations` rows。

本地 Review Report 现在覆盖：

- completion / accuracy / elapsed time
- question type breakdown
- prioritized review queue
- 错因标签
- Writing / Speaking rubric self-rating summary
- next actions

### 9.1 Practice Unit Adapter

Session routes must not depend directly on `practice-session-samples.ts`. The frontend uses a read-only data adapter:

```text
src/lib/practice-units.ts
```

Public contract:

- `getPracticeUnits(): Promise<PracticeUnit[]>`
- `getPracticeUnit(unitId: string): Promise<PracticeUnit | null>`
- route 层只消费 adapter，不直接知道 data source。
- `unitId` 兼容 slug 和 UUID-like id。
- 返回值必须是 UI-facing `PracticeUnit`，并且包含按 `question_number` 排序的 `questions`。
- 返回 `null` 表示 not found。
- repository contract 只有 `list` / `get`，不包含任何 write 方法。

当前 source policy：

```text
PRACTICE_UNITS_SOURCE unset/local  -> local sample repository（默认）
PRACTICE_UNITS_SOURCE=supabase     -> read-only Supabase repository
```

默认必须保持 local samples，这样前端 Session Preview 不依赖未迁移的 practice tables。只有显式设置 `PRACTICE_UNITS_SOURCE=supabase` 时，adapter 才读取 Supabase。

Supabase read-only mode：

```text
practice_units + practice_questions
  -> src/lib/practice-unit-mapper.ts
  -> normalize jsonb options / answer_key / metadata
  -> validate enums and active rows
  -> reject unit/question mismatch and duplicate question numbers
  -> return PracticeUnit with nested questions
  -> no writes
```

Failure policy：如果启用 `PRACTICE_UNITS_SOURCE=supabase` 但 practice tables 不存在、RLS 不允许读取、或者 row shape 无法映射，adapter 应显式抛错；不要静默 fallback 到 local samples。静默 fallback 会掩盖迁移/RLS 问题。

读路径本身不创建 `practice_attempts` / `practice_answers` / `practice_annotations` rows。
写入是独立的一层，见 §9.5。

### 9.5 Attempt 同步（写路径）

练习记录默认只存 localStorage。开启 `NEXT_PUBLIC_PRACTICE_ATTEMPT_SYNC=on` 后，History 页
会出现「同步到云端」按钮，把本地记录推到 `practice_attempts` / `practice_answers`。

```text
src/lib/practice-attempt-sync.ts    -- 纯函数：本地 entry → DB row（slug/external_key 反查 uuid）
src/lib/practice-attempt-remote.ts  -- 实际写入，env-gated
```

同步是幂等的：attempt upsert on `(user_id, client_attempt_id)`，answer upsert on
`(attempt_id, question_id)`，重复点不会产生重复行。题库里没有对应 Session 的记录会被跳过
而不是猜测。RLS 保证两件事：客户端只能写自己的行，且**删不掉**已记录的成绩
（`practice_attempts` 故意没有 delete policy）。

Live 测试覆盖读写两条路径，默认 `npm test` 跳过：

```bash
RUN_LIVE_SUPABASE_TESTS=1 npx vitest run src/lib/__tests__/supabase-read-smoke.live.test.ts
RUN_LIVE_SUPABASE_TESTS=1 npx vitest run src/lib/__tests__/practice-attempt-sync.live.test.ts
```

### 9.2 MaterialPane

负责显示：

- passage_text
- local highlight / note annotations（当前可先 localStorage，后续可接 `practice_annotations`）
- audio player
- transcript
- writing task asset
- speaking prompt / cue card

### 9.3 QuestionNavigator

负责显示：

- 题号列表
- answered / unanswered 状态
- correct / wrong 状态
- 跳转当前题

### 9.4 AnswerSheet

负责多题作答：

- 每题单独保存答案
- 支持不同 question_type
- 提交前不判分

### 9.5 ResultInspector

提交后展示：

- 总正确率
- 每题结果
- 正确答案
- explanation
- 加入错题 / 收藏
- 下一步建议

## 10. 新 TypeScript 类型草案

未来可在 `src/lib/types.ts` 中追加，而不是立即替换 `IeltsQuestion`。

```ts
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

export interface PracticeUnit {
  id: string;
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
  metadata: Record<string, unknown>;
}

export interface PracticeQuestion {
  id: string;
  unit_id: string;
  legacy_question_id: string | null;
  question_number: number;
  question_type: string;
  question_text: string;
  options: unknown;
  answer_key: unknown;
  explanation: string | null;
  metadata: Record<string, unknown>;
}
```

## 11. 迁移策略

### Step 1: 保留 legacy single-question practice

不要删除：

- `src/app/components/PracticeView.tsx`
- `get_random_questions`
- `ielts_questions`
- `history`
- `favorites`
- `wrong_book`

原因：这些已经构成可用闭环。

### Step 2: 新增 practice_units / practice_questions

先导入少量 Reading Passage 样例。

### Step 3: 新增 read-only session page

先只展示：

- Passage
- 多题列表
- 本地答案状态

不提交数据库。

### Step 4: 加 session submit

新增：

- `practice_attempts`
- `practice_answers`

提交后写入 session attempt。

### Step 5: 接入 Dashboard

Dashboard 同时读取：

- legacy `history`
- new `practice_attempts`

### Step 6: 接入 Review

Favorites / Wrong Book 支持：

- legacy question
- practice question + unit context

### Step 7: Listening / Writing / Speaking

顺序建议：

1. Reading MVP
2. Listening MVP
3. Writing manual MVP
4. Speaking manual MVP
5. AI feedback

## 12. Dashboard 未来演进

当前 `src/lib/dashboard-stats.ts` 只统计 legacy `history`。

未来可增加：

- session attempt count
- unit completion count
- skill-level accuracy
- question-type weakness
- recent session activity
- next recommendation

推荐 Dashboard 逻辑：

```text
if has wrong practice questions:
  recommend review
else if weak skill exists:
  recommend progressive unit for weak skill
else if enough recent practice:
  recommend challenge
else:
  recommend basic/progressive warmup
```

## 13. MVP 优先级

推荐最小可实施顺序：

- [x] 1. 文档规划：本文件。
- [x] 2. Schema migration + seed：见 §7，已应用。
- [x] 3. Reading Unit seed：一篇 Passage + 5 道题。
- [x] 4. Read-only `PracticeSessionView`。
- [x] 5. 多题本地作答。
- [x] 6. Passage / Transcript / Prompt / Cue card highlight / note 本地标注。
- [x] 7. Listening transcript + audio MVP。
- [x] 8. Writing / Speaking manual preview MVP。
- [x] 9. Session 写入 `practice_attempts` / `practice_answers`（见 §9.5，env-gated）。
- [ ] 10. Dashboard 读取 session stats（当前读 localStorage，未接 DB）。
- [ ] 11. 错题本 / 收藏联动 practice question context。
- [x] 12. Listening audio_url 播放和 transcript sync（含 karaoke 高亮、点击 seek）。
- [x] 13. Writing / Speaking rubric、自评、录音（MediaRecorder）。

已完成但不在原清单里的：Exam Mode（限时 + 自动交卷）、Writing 反馈面板（字数 / 句长 /
结构 checklist）、单次 attempt 详情页（逐题回顾 + 与历史对比）。

后续候选：annotations 持久化到 `practice_annotations`、Listening 换成真人录音、
把 legacy 单题流程和 Session 流程合并成一个入口。

## 14. 两套流程的合并状态

历史上有两套并行系统：legacy 单题练习（`ielts_questions` + `history` / `wrong_book` /
`favorites`）和 Practice Session（`practice_*`）。它们曾经完全隔离 —— Session 里做错的题
进不了错题本，因为那三张表的 `question_id` 是硬外键指向 `ielts_questions`，**结构上**存
不进 practice 题目。

`migrations/0003_link_collections_to_practice.sql` 解决了这一点：三张表各加一个可空的
`practice_question_id`，`question_id` 改为可空，加 check 约束保证二者恰有其一。已有行不
受影响（保持 `question_id` 有值、`practice_question_id` 为 null）。

```text
src/lib/collection-items.ts       -- 两种题目模型 → 统一的 CollectionItem 卡片
src/lib/question-collections.ts   -- 双源读取、写入、幂等保存
src/lib/dashboard-recommendation.ts -- 把两路信号收敛成一个「下一步做什么」
```

开关：`NEXT_PUBLIC_PRACTICE_COLLECTION_LINK=on`（migration 0003 已于 2026-07-26 应用，
开关已打开）。关闭时错题本和收藏只读 legacy 部分，功能不受影响。practice 那半边读取失败
也只是降级 —— legacy 卡片照常渲染，页面上给一条提示，不会整页报错。

两个实现要点（都被 live 测试钉住）：
- **id 解析**：本地样题的 question id 是 `green-roofs-q1` 这类 slug，而
  `practice_question_id` 列是指向 `practice_questions(id)` 的 uuid 外键。所有写入前先经
  `resolvePracticeQuestionDbIds()` 通过 `external_key` 反查 uuid；uuid 形态的 id
  （supabase 读源）原样通过。
- **幂等写入**：`(user_id, practice_question_id)` 的唯一索引是**部分索引**（带
  `where practice_question_id is not null`），Postgres 的 `ON CONFLICT` 无法经 PostgREST
  推断部分索引，所以保存用普通 insert 并把 23505 视为「已保存」，而不是 upsert。

Session 内的收藏入口：AnswerSheet 每道题的题头有「收藏」按钮
（`useFavoriteQuestions` hook —— 挂载时一次批量解析 + 读取已收藏状态，点按乐观更新、
失败回滚）。错题入口：检查答案后 Review Queue 下方的「存入错题本」
（`WrongBookSync`，只收录客观题错/漏，人工评分的题不算）。

Dashboard 之前有两套互相矛盾的展示：legacy 统计卡显示「0 次练习」的同时，紧挨着的 Session
卡显示真实的连续天数；两张推荐卡各自独立计算，可能给出冲突建议。现在推荐收敛为一张
（`resolveDashboardRecommendation`，按「未完成草稿 &gt; 待复盘 &gt; 错题 &gt; 新手 &gt; 常规」排序），
统计卡也会同时反映两套流程。
14. AI feedback。

## 14. 非目标

近期不要做：

- 直接删掉 `ielts_questions`
- 直接替换 `PracticeView.tsx`
- 直接把 `favorites` / `wrong_book` 改坏
- 现在就接 AI / RAG / Qdrant / LangChain
- 没有内容模型时先做复杂 UI
- 把 Basic / Progressive / Challenge 只当作 difficulty label

## 15. 验证清单

未来实施每一步时应验证：

- `/practice` legacy 单题练习仍可用。
- `Enter` / `Space` 快捷键不被破坏。
- 每次 legacy submit 仍写 `history`。
- legacy wrong answer 仍写 `wrong_book`。
- legacy favorite 仍乐观更新并失败回滚。
- 新 session 页面不会影响 `/favorites`、`/wrong-book`。
- Dashboard 同时支持无历史、有 legacy 历史、有 session 历史。
- Supabase RLS 仍只允许用户访问自己的 attempt / answer / collection 数据。
- `PRACTICE_UNITS_SOURCE` unset/local 时，Session Library 只读取本地 sample units。
- `PRACTICE_UNITS_SOURCE=supabase` 时，只读取 `practice_units` / `practice_questions`，不写入任何 practice tables。
- 如果 Supabase practice tables 尚未迁移，Supabase source mode 应显式失败，而不是 fallback。
- 执行 migration / seed / 写入 attempt rows 前必须再次请求用户授权。

## 16. 结论

下一阶段应该先做 Reading MVP，因为 Reading 最能体现“大材料 + 多题组”的核心结构，同时不需要音频、录音或 AI。

推荐下一次实施目标：

```text
新增 practice_units / practice_questions 的 SQL 草案与一篇 Reading Passage seed，
然后做一个只读版 /practice/session/[unitId] 页面，先展示 Passage + 多题组。
```

在这个 MVP 稳定前，当前 legacy PracticeView 应继续保留，作为可用训练闭环和回退路径。
