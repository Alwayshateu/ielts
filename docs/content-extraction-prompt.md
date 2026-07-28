# IELTS 题库抽取 Prompt(PDF → PracticeUnit JSON,含参考图）

把一份 Cambridge IELTS PDF(经 MinerU OCR)转成本项目的 `PracticeUnit` JSON,**包含题目参考图片**,产出直接可进 seed(`scripts/generate-practice-seed.mjs` → `render-practice-seed.ts` → `0002_seed_practice_samples.sql`)。

本文既是给「人」看的流程说明,末尾的 [§8 可复制 Prompt](#8-可复制-prompt) 是给「模型」看的、可直接粘贴的指令。

---

## 1. 先分清哪里真的有图

| 技能 | 图的角色 | 存哪 |
|------|---------|------|
| **写作 Task 1(学术)** | 图表/流程图/地图**就是题目本身** | unit 级 `asset_url` |
| **听力 Part 2(有时 3)** | 地图/平面图贴标签题 | question 级 `metadata.assetUrl` |
| **阅读** | 偶尔的流程图 labeling | 视情况 unit `asset_url` 或 question `metadata.assetUrl` |
| 口语 / 纯文字题 | 无图 | — |

**结论**:优先做写作 Task 1 和听力地图题,覆盖 90% 的「离不开图」的场景。

---

## 2. OCR / 抽图流程(MinerU)

关键认知:**图不用你手动截**。MinerU 的版面检测会把 figure 区域自动裁成单独 PNG,并给出结构化定位。

1. **按 passage/section 跑 MinerU**(别整本 PDF 一次跑,图集会乱):得到 `xxx.md` + `xxx_content_list.json` + `images/` 目录。
2. **用 `content_list.json`(不是 markdown)做「图↔题」映射**:里面每个块带 `type`(text/image/table)、`img_path`、`page`。按页码 + 位置 + 周围题号把图归到对应 unit / question。写作 Task1 一图对一 task 最简单;听力地图在它所标注题号组的正上方。
3. **重命名成稳定、可读**:按 [§3.1](#31-命名规范-cam18-已定cam19-必须沿用) 的资源路径模式,如 `t1-writing-task1.jpg`、`t2-listening-p2-map.jpg`。
4. **就位**:本地路径放 `public/images/{book}/`、`public/audio/{book}/`(cam18 现状);要走私有桶见 [§5](#5-图片存储supabase-storage)。
5. **在 JSON 里填 URL**:unit 级填 `asset_url`,question 级填 `metadata.assetUrl`(路径模式同 §3.1)。

---

## 3. 输出契约(严格匹配本项目 schema)

一个 section/passage = 一个 `PracticeUnit`。字段和类型**必须**和 `src/lib/types.ts` 一致:

```jsonc
{
  "id": "cam18-test1-reading-p2",          // 全局唯一,见 §3.1 命名规范
  "slug": "reading-cam18-t1-forest-management", // 全局唯一,人类可读
  "skill": "reading",                       // foundation | reading | listening | writing | speaking
  "mode": "challenge",                      // basic | progressive | challenge(训练模式,≠难度)
  "title": "Cambridge 18 · Test 1 · Reading P2",
  "description": "Forest management ...",   // 可为 null
  "difficulty": "hard",                     // easy | medium | hard(内容难度)
  "material_type": "passage",               // none | passage | audio | writing_prompt | speaking_prompt | foundation_note
  "passage_text": "……全文,段落用 \\n\\n 分隔……", // 阅读用;听力放 transcript;写作放 metadata.prompt
  "audio_url": null,                         // 听力音频;没有填 null
  "transcript": null,                        // 听力原文
  "asset_url": null,                         // ★ unit 级参考图(写作 Task1 图表/地图);没有填 null
  "time_limit_seconds": 1200,               // 建议用时;不限时填 null
  "metadata": { "source": "剑桥雅思18.pdf" },
  "questions": [ /* 见下 */ ]
}
```

每个 `question`:

```jsonc
{
  "id": "cam18-t1-p2-q14",                  // 全局唯一,q 后是原卷题号(P2 接 P1),见 §3.1
  "unit_id": "cam18-test1-reading-p2",      // == 所属 unit.id
  "question_number": 1,                      // 本 unit 内从 1 连续递增(≠ id 里的原卷题号)
  "question_type": "multiple_choice",        // 只有 6 种,见 §4
  "question_text": "What is the main purpose of ...?",
  "options": ["...", "...", "...", "..."],   // 选择类必填;填空/简答/主观填 null
  "answer_key": {
    "answers": ["..."],                      // 见 §4 规则
    "caseSensitive": false,                  // 填空默认 false
    "acceptedAlternatives": ["..."]          // 可选:同义 / 拼写变体
  },
  "explanation": "解析……",                  // 可为 null,尽量给
  "metadata": {
    "ieltsNumber": 14,                       // ★ 原卷题号(app 内部重新从 1 编号,原题号存这里)
    "ieltsType": "matching_information",      // ★ 原始 IELTS 题型(映射前)
    "assetUrl": null                         // ★ question 级参考图(听力地图);没有则省略或 null
  }
}
```

### 3.1 命名规范(★ cam18 已定,cam19+ 必须沿用)

cam18 全 4 套题已按下表落地。**新书必须逐字沿用这套模式**,只把 `cam18`/`t1` 换成对应书号和 test 号,否则前端关联和一致性测试会对不上。

**Unit `id`** — `{book}-test{n}-{skill}[-{part}]`(`part` 只有阅读/听力有):

| skill | unit id 模式 | 示例 |
|---|---|---|
| reading | `{book}-test{n}-reading-p{1..3}` | `cam18-test1-reading-p2` |
| listening | `{book}-test{n}-listening-p{1..4}` | `cam18-test1-listening-p2` |
| writing | `{book}-test{n}-writing` | `cam18-test1-writing` |
| speaking | `{book}-test{n}-speaking` | `cam18-test1-speaking` |

**Question `id`** — `{book}-t{n}-{seg}-q{k}`。⚠️ **`k` 用的是原卷题号,不是 unit 内序号**:阅读 P2 接着 P1 往下编(P1 是 q1–q13,P2 就从 `-q14` 起),听力 L2 接着 L1(L1 q1–q10,L2 从 `-q11` 起)。而 JSON 里的 `question_number` 字段仍是**每个 unit 内从 1 重编**——两者不一样,别混。`seg` 段码按 skill 固定:

| skill | seg 段码 | question id 示例(注意 q 后是原卷题号) |
|---|---|---|
| reading | `p1` / `p2` / `p3` | `cam18-t1-p1-q1`、`cam18-t1-p2-q14`、`cam18-t1-p3-q27` |
| listening | `l1` / `l2` / `l3` / `l4` | `cam18-t1-l1-q1`、`cam18-t1-l2-q11`、`cam18-t1-l2-q15` |
| writing | `writing` | `cam18-t1-writing-q1` |
| speaking | `speaking` | `cam18-t1-speaking-q1` |

> 两个「不同名」要记牢:(1) unit id 用全称 `test1`+`reading`,question id 用缩写 `t1`+段码 `p2`;(2) question id 的 `-q{k}` 是原卷连续题号,而 JSON `question_number` 字段是 unit 内从 1 重编。都是 cam18 既定事实,别去统一。

**Slug** — 人类可读且全局唯一:`{skill}-{book}-t{n}-{topic-kebab}`,如 `reading-cam18-t1-forest-management`、`writing-cam18-t1-electricity-bar`。

**资源文件路径** — 前端直接引用的本地路径(与 Storage 路径二选一,见 §5):

| 类型 | 路径模式 | 示例 |
|---|---|---|
| 听力音频 | `/audio/{book}/t{n}-p{1..4}.mp3` | `/audio/cam18/t2-p1.mp3` |
| 写作图表 | `/images/{book}/t{n}-writing-task1.jpg` | `/images/cam18/t1-writing-task1.jpg` |
| 听力地图 | `/images/{book}/t{n}-listening-p{n}-map.jpg` | `/images/cam18/t2-listening-p2-map.jpg` |
| 图表前后对比 | `/images/{book}/t{n}-writing-task1-{before,after}.jpg` | `/images/cam18/t3-writing-task1-before.jpg` |

---

## 4. 题型映射 + 答案键规则(**产出必须能过 `practice-session-content-integrity` 测试**)

本项目只有 6 种 `question_type`。IELTS 的各种题型要映射过来:

| IELTS 原题型 | 映射到 | options | answer_key.answers |
|---|---|---|---|
| Multiple choice | `multiple_choice` | 选项**完整文本** | 命中的**完整选项原文** |
| Matching(heading/info/feature) | `multiple_choice` | 各候选项完整文本(可带字母前缀) | 命中的完整选项原文 |
| True/False/Not Given、Yes/No/NG | `true_false_not_given` | `["True","False","Not Given"]` | 其中之一(整词) |
| Map / plan / diagram labeling | `multiple_choice`(候选标签作 options) | 候选标签文本 | 命中的标签原文 |
| Sentence / summary / note / table / form completion | `sentence_completion` | `null` | 接受的答案文本 |
| Short answer | `short_answer` | `null` | 接受的答案文本 |
| Writing Task 1 / Task 2 | `writing_task` | `null` | `[]`(留空,人工/AI 批改) |
| Speaking 各 part | `speaking_response` | `null` | `[]` |

**硬性规则(测试会挡):**

- **选择类**(`multiple_choice` / `true_false_not_given`):`options` 非 null、≥2 且互不相同;`answer_key.answers` 每一项都必须**等于某个 option 的原文**(用 app 的 `isPracticeAnswerCorrect` 归一化:去首尾空格、多空格并一、默认不分大小写)。答案存**完整文本**,不要只存 `A`/`B`。多选题就放多个。
- **填空/简答**(`sentence_completion` / `short_answer`):`options` 必须是 `null`;`answers` 至少一条、非空;拼写/同义变体放 `acceptedAlternatives`。
- **主观**(`writing_task` / `speaking_response`):`options` = `null`;`answer_key.answers` = `[]`。
- **通用**:`id` 全局唯一、`question_text` 非空;`asset_url` / `metadata.assetUrl` 若给则为非空字符串。

产出后跑 `npm test`;`src/lib/__tests__/practice-session-content-integrity.test.ts` 会自动挡下「答案对不上选项、缺答案、图 URL 空串」等录入错误。

---

## 5. 图片 / 音频存储

现在有两条路,cam18 走了 A,长期目标是 B。**cam19+ 先跟 cam18 保持一致(A),等版权方案定了再统一迁移。**

**A. 本地 `public/`(cam18 现状,最省事)**
- 文件放 `public/images/{book}/`、`public/audio/{book}/`;`asset_url` / `assetUrl` / `audio_url` 直接填 `/images/...`、`/audio/...`(见 §3.1 路径表)。
- `MaterialPane` / `AnswerSheet` 拿到这种路径直接渲染,零额外配置。
- ⚠️ **版权隐患**:Cambridge 原始音视频/图落在 `public/` 且**未 gitignore**,一旦 `git add` 就会公开提交。cam18 目前正是这个待处理状态。

**B. Supabase 私有桶 `practice-assets`(版权安全,目标态)**
- 文件传私有桶(不进 git、默认要登录才能取);`asset_url` / `assetUrl` 存**对象路径**(如 `cam18/t1-writing-task1.jpg`)。
- 前端由 server 端换成带时效的 **signed URL** 再渲染(该解析钩子尚未落地)。
- 和现在 gitignore 掉 `/raw/` 的做法一致。

**通用**:抠出来的 Cambridge 图/音**别放公开桶**;给 AI 批改留路——写作 Task1 的图要能被取回喂给 vision 模型,所以存成可取的对象,别只做纯静态贴图。

---

## 6. 完整示例

```jsonc
// 阅读单元(节选:1 道选择 + 1 道判断)
{
  "id": "cam18-test1-reading-p1", "slug": "reading-cam18-t1-green-roofs",
  "skill": "reading", "mode": "challenge", "title": "Cambridge 18 · Test 1 · Reading P1",
  "description": "Green roofs", "difficulty": "hard", "material_type": "passage",
  "passage_text": "……段落 1……\n\n……段落 2……", "audio_url": null, "transcript": null,
  "asset_url": null, "time_limit_seconds": 1200, "metadata": { "source": "剑桥雅思18.pdf" },
  "questions": [
    {
      "id": "cam18-t1-p1-q1", "unit_id": "cam18-test1-reading-p1", "question_number": 1,
      "question_type": "multiple_choice",
      "question_text": "What is the main purpose of the first paragraph?",
      "options": ["To describe the equipment on roofs", "To introduce a changing view of rooftops",
                  "To argue all roofs should be gardens", "To compare waterproofing materials"],
      "answer_key": { "answers": ["To introduce a changing view of rooftops"], "caseSensitive": false },
      "explanation": "首段对比传统与新观点。",
      "metadata": { "ieltsNumber": 1, "ieltsType": "multiple_choice" }
    },
    {
      "id": "cam18-t1-p1-q2", "unit_id": "cam18-test1-reading-p1", "question_number": 2,
      "question_type": "true_false_not_given",
      "question_text": "Green roofs were first developed in Germany.",
      "options": ["True", "False", "Not Given"],
      "answer_key": { "answers": ["Not Given"], "caseSensitive": false },
      "explanation": "文中未提起源国。", "metadata": { "ieltsNumber": 8, "ieltsType": "true_false_not_given" }
    }
  ]
}
```

```jsonc
// 写作 Task 1（带参考图表）
{
  "id": "cam18-test1-writing", "slug": "writing-cam18-t1-electricity-bar",
  "skill": "writing", "mode": "challenge", "title": "Cambridge 18 · Test 1 · Writing Task 1",
  "description": null, "difficulty": "hard", "material_type": "writing_prompt",
  "passage_text": null, "audio_url": null, "transcript": null,
  "asset_url": "/images/cam18/t1-writing-task1.jpg",   // ★ 图表,MaterialPane 会渲染
  "time_limit_seconds": 1200,
  "metadata": { "source": "剑桥雅思18.pdf", "taskType": "task_1", "wordTarget": 150,
                "prompt": "The chart below shows ... Summarise the information ..." },
  "questions": [
    { "id": "cam18-t1-writing-q1", "unit_id": "cam18-test1-writing", "question_number": 1,
      "question_type": "writing_task",
      "question_text": "Summarise the information by selecting and reporting the main features.",
      "options": null, "answer_key": { "answers": [] }, "explanation": null,
      "metadata": { "ieltsNumber": 1, "ieltsType": "writing_task_1" } }
  ]
}
```

---

## 7. 校验清单

1. `npx tsc --noEmit` — 类型对得上。
2. `npm test` — 尤其 `practice session sample fixtures` + `practice session content integrity` 全绿。
3. 抽检:选择题答案是否是原文选项;`question_number` 从 1 连续;`unit_id` 一致;图 URL 填对。

---

## 8. 可复制 Prompt

> 把下面整段连同 MinerU 的 `content_list.json`(或 markdown)+ `images/` 文件名清单一起发给模型。

```text
你是 IELTS 题库结构化助手。我给你一段 Cambridge IELTS 真题(来自 MinerU OCR 的 content_list.json /
markdown)以及抽出的图片文件名清单。请把「一个 passage / section」转成一个 PracticeUnit JSON,严格遵守:

【输出】只输出一个 JSON(或 JSON 数组),不要解释性文字。字段和取值必须完全匹配:
- PracticeUnit: id, slug, skill(foundation|reading|listening|writing|speaking), mode(basic|progressive|
  challenge), title, description|null, difficulty(easy|medium|hard), material_type(none|passage|audio|
  writing_prompt|speaking_prompt|foundation_note), passage_text|null, audio_url|null, transcript|null,
  asset_url|null, time_limit_seconds|null, metadata(对象), questions[]。
- PracticeQuestion: id, unit_id(==unit.id), question_number(本 unit 内从 1 连续递增),
  question_type(multiple_choice|true_false_not_given|sentence_completion|short_answer|writing_task|
  speaking_response), question_text, options(string[]|null), answer_key{answers:string[],
  caseSensitive?:boolean, acceptedAlternatives?:string[]}, explanation|null, metadata(对象)。

【题型映射】matching/heading/map-labeling → multiple_choice(候选项作 options);T/F/NG、Y/N/NG →
true_false_not_given(options=["True","False","Not Given"]);sentence/summary/note/table/form completion →
sentence_completion(options=null);short answer → short_answer(options=null);Writing → writing_task;
Speaking → speaking_response。

【答案键规则】
- 选择类:options 非 null、≥2、互不相同;answers 每项必须等于某个 option 的完整原文(不要只写字母);多选放多项。
- 填空/简答:options=null;answers 至少一条且非空;拼写/同义变体放 acceptedAlternatives;caseSensitive 一般 false。
- 主观(writing_task/speaking_response):options=null;answer_key.answers=[]。

【图片】写作 Task1 的图表/流程图/地图 → 填 unit.asset_url(用我给的图片文件名或其 Storage 路径);
听力/阅读某道题的地图/示意图 → 填该 question.metadata.assetUrl;没有图就填 null / 省略。

【元数据】metadata.source 填 PDF 名;每题 metadata.ieltsNumber 存原卷题号、metadata.ieltsType 存原始 IELTS 题型。

【命名】(必须逐字沿用 cam18 既定模式,只换书号/test 号)
- unit id:{book}-test{n}-{skill}[-p{k}],如 cam18-test1-reading-p2 / cam18-test1-writing / cam18-test1-listening-p4。
- question id:{book}-t{n}-{seg}-q{k},seg 段码:阅读 p1/p2/p3、听力 l1/l2/l3/l4、写作 writing、口语 speaking。
  ⚠️ q{k} 用原卷连续题号(阅读 P2 接 P1:P1=q1–13 则 P2 从 q14;听力 L2 接 L1),而 JSON question_number 字段是 unit 内从 1 重编。
  例:cam18-t1-p1-q1 / cam18-t1-p2-q14 / cam18-t1-l2-q11 / cam18-t1-writing-q1。unit id 用全称、question id 用缩写,别统一。
- slug:{skill}-{book}-t{n}-{topic},如 reading-cam18-t1-forest-management。
- 资源路径:图 /images/{book}/t{n}-writing-task1.jpg、/images/{book}/t{n}-listening-p{k}-map.jpg;音频 /audio/{book}/t{n}-p{k}.mp3。

【自检】输出前确认:选择题每个 answer 都能在 options 里找到原文;question_number 从 1 连续;unit_id 一致;
options 该 null 的为 null;主观题 answers 为 []。
```
