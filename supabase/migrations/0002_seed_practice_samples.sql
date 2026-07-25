-- IELTS Trainer — practice sample seed (migration 0002).
--
-- GENERATED FILE. Do not edit by hand.
-- Source: src/lib/practice-session-samples.ts
-- Regenerate: node scripts/generate-practice-seed.mjs
--
-- Apply after 0001_practice_sessions.sql. Idempotent: units upsert on slug,
-- questions upsert on (unit_id, external_key). Touches only practice_units and
-- practice_questions — no legacy tables, no user attempt data.
--
-- Units seeded: 4
-- Questions seeded: 12

-- ---------------------------------------------------------------------------
-- reading · Urban Green Roofs
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'reading-progressive-urban-green-roofs-001',
  'reading',
  'progressive',
  'Urban Green Roofs',
  'A Reading MVP preview: one passage with multiple linked questions.',
  'medium',
  'passage',
  $t$In many large cities, rooftops have traditionally been treated as empty technical spaces. They hold ventilation equipment, water tanks, and maintenance pathways, but they are rarely considered part of the urban environment. Over the last two decades, however, a growing number of architects and city planners have argued that rooftops can help solve several problems at once if they are covered with carefully selected plants.

A green roof usually consists of a waterproof layer, a root barrier, drainage material, lightweight soil, and vegetation. Some roofs are designed mainly for environmental performance and require little maintenance. Others are accessible gardens used by residents, office workers, or visitors. Although these two types look different, both can reduce the amount of heat absorbed by buildings during summer.

Supporters often point to stormwater management as one of the strongest benefits. During heavy rain, ordinary roofs send water quickly into drains, increasing pressure on urban sewage systems. A planted roof can hold part of that rainfall and release it more slowly. This does not remove the need for proper drainage, but it can reduce peak flow during storms.

Green roofs may also support biodiversity, especially in districts where ground-level habitat has disappeared. Even small areas of vegetation can provide food or resting places for insects and birds. The effect is greater when roofs are connected across several buildings, creating a network rather than isolated patches.

The main barrier is cost. Green roofs are more expensive to install than conventional roofs, and older buildings may need structural assessment before they can support the extra weight. For this reason, some cities have introduced grants or planning rules to encourage adoption. Advocates argue that the long-term savings in cooling, drainage, and roof durability can justify the initial investment.$t$,
  null,
  null,
  null,
  1200,
  $j${"source":"local-sample","status":"read-only-preview","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'green-roofs-q1',
    1,
    'multiple_choice',
    'What is the main purpose of the first paragraph?',
    $j$["To describe the technical equipment found on roofs","To introduce a changing view of rooftops in cities","To argue that all city roofs should become gardens","To compare old and new waterproofing materials"]$j$::jsonb,
    $j${"answers":["To introduce a changing view of rooftops in cities"],"caseSensitive":false}$j$::jsonb,
    'The paragraph contrasts the traditional view of rooftops with the newer idea that they can help solve urban problems.',
    $j${"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'green-roofs-q2',
    2,
    'true_false_not_given',
    'All green roofs are designed as accessible gardens for people to use.',
    $j$["True","False","Not Given"]$j$::jsonb,
    $j${"answers":["False"],"caseSensitive":false}$j$::jsonb,
    'The passage says some roofs are mainly for environmental performance and others are accessible gardens.',
    $j${"ieltsType":"true_false_not_given"}$j$::jsonb
  ),
  (
    'green-roofs-q3',
    3,
    'sentence_completion',
    'A planted roof can reduce pressure on sewage systems by holding rainfall and releasing it more ______.',
    null::jsonb,
    $j${"answers":["slowly"],"caseSensitive":false,"acceptedAlternatives":["gradually"]}$j$::jsonb,
    'Paragraph 3 states that a planted roof can hold rainfall and release it more slowly.',
    $j${"ieltsType":"sentence_completion"}$j$::jsonb
  ),
  (
    'green-roofs-q4',
    4,
    'multiple_choice',
    'According to the passage, biodiversity benefits are greater when green roofs are:',
    $j$["built only on new buildings","connected across several buildings","kept inaccessible to residents","made with heavier soil"]$j$::jsonb,
    $j${"answers":["connected across several buildings"],"caseSensitive":false}$j$::jsonb,
    'The passage says the effect is greater when roofs are connected across several buildings, creating a network.',
    $j${"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'green-roofs-q5',
    5,
    'short_answer',
    'What is described as the main barrier to installing green roofs?',
    null::jsonb,
    $j${"answers":["cost"],"caseSensitive":false,"acceptedAlternatives":["the cost","high cost"]}$j$::jsonb,
    'The final paragraph directly states that the main barrier is cost.',
    $j${"ieltsType":"short_answer"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'reading-progressive-urban-green-roofs-001'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- listening · Library Orientation
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'listening-progressive-library-orientation-001',
  'listening',
  'progressive',
  'Library Orientation',
  'A Listening MVP preview: one short section transcript with linked information-completion questions.',
  'medium',
  'audio',
  null,
  '/audio/sample-listening-orientation.wav',
  $t$Good morning everyone, and welcome to the first-year library orientation. My name is Helen Carter, and I work at the information desk on the ground floor. Today I will explain how to borrow books, where to find study rooms, and what to do if you need research help.

The main library is open from eight thirty in the morning until ten at night from Monday to Friday. On Saturdays it closes earlier, at six o'clock, and on Sundays only the online help service is available. You can enter the building with your student card, which also works as your borrowing card.

Undergraduate students can borrow up to twelve books at one time. Most books can be kept for three weeks, but high-demand course books must be returned after seven days. If nobody else has requested the item, you can renew it twice through your online library account.

Study rooms are located on the second and third floors. Small rooms for two to four people can be booked online, while the larger presentation room must be booked at the information desk. Please remember that food is not allowed in any study room, although drinks with lids are permitted.

If you need help finding academic articles, you can make an appointment with a subject librarian. These appointments are free, but they should be booked at least two days in advance, especially near assignment deadlines.$t$,
  null,
  600,
  $j${"source":"local-sample","status":"read-only-preview","audioStatus":"placeholder-tone","audioDurationSeconds":96,"transcriptCues":[{"start":0,"text":"Good morning everyone, and welcome to the first-year library orientation."},{"start":3,"text":"My name is Helen Carter, and I work at the information desk on the ground floor."},{"start":10,"text":"Today I will explain how to borrow books, where to find study rooms, and what to do if you need research help."},{"start":18,"text":"The main library is open from eight thirty in the morning until ten at night from Monday to Friday."},{"start":25,"text":"On Saturdays it closes earlier, at six o'clock, and on Sundays only the online help service is available."},{"start":32,"text":"You can enter the building with your student card, which also works as your borrowing card."},{"start":38,"text":"Undergraduate students can borrow up to twelve books at one time."},{"start":42,"text":"Most books can be kept for three weeks, but high-demand course books must be returned after seven days."},{"start":49,"text":"If nobody else has requested the item, you can renew it twice through your online library account."},{"start":56,"text":"Study rooms are located on the second and third floors."},{"start":60,"text":"Small rooms for two to four people can be booked online, while the larger presentation room must be booked at the information desk."},{"start":68,"text":"Please remember that food is not allowed in any study room, although drinks with lids are permitted."},{"start":75,"text":"If you need help finding academic articles, you can make an appointment with a subject librarian."},{"start":81,"text":"These appointments are free, but they should be booked at least two days in advance, especially near assignment deadlines."}],"seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'library-orientation-q1',
    1,
    'short_answer',
    'Where does Helen Carter work?',
    null::jsonb,
    $j${"answers":["information desk"],"caseSensitive":false,"acceptedAlternatives":["the information desk","ground floor information desk"]}$j$::jsonb,
    'Helen says she works at the information desk on the ground floor.',
    $j${"ieltsType":"short_answer"}$j$::jsonb
  ),
  (
    'library-orientation-q2',
    2,
    'sentence_completion',
    'From Monday to Friday, the main library closes at ______.',
    null::jsonb,
    $j${"answers":["ten at night"],"caseSensitive":false,"acceptedAlternatives":["10 at night","10 pm","10 p.m.","ten pm"]}$j$::jsonb,
    'The speaker says the library is open until ten at night from Monday to Friday.',
    $j${"ieltsType":"sentence_completion"}$j$::jsonb
  ),
  (
    'library-orientation-q3',
    3,
    'multiple_choice',
    'How many books can undergraduate students borrow at one time?',
    $j$["7","10","12","20"]$j$::jsonb,
    $j${"answers":["12"],"caseSensitive":false}$j$::jsonb,
    'Undergraduate students can borrow up to twelve books at one time.',
    $j${"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'library-orientation-q4',
    4,
    'multiple_choice',
    'Where must the larger presentation room be booked?',
    $j$["Online","At the information desk","On the third floor","Through a subject librarian"]$j$::jsonb,
    $j${"answers":["At the information desk"],"caseSensitive":false}$j$::jsonb,
    'The larger presentation room must be booked at the information desk.',
    $j${"ieltsType":"multiple_choice"}$j$::jsonb
  ),
  (
    'library-orientation-q5',
    5,
    'sentence_completion',
    'Subject librarian appointments should be booked at least ______ in advance.',
    null::jsonb,
    $j${"answers":["two days"],"caseSensitive":false,"acceptedAlternatives":["2 days"]}$j$::jsonb,
    'The speaker says appointments should be booked at least two days in advance.',
    $j${"ieltsType":"sentence_completion"}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'listening-progressive-library-orientation-001'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- writing · Remote Work and Productivity
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'writing-progressive-remote-work-task-2-001',
  'writing',
  'progressive',
  'Remote Work and Productivity',
  'A Writing Task 2 MVP preview: one prompt, planning notes, and a local long-form draft area.',
  'medium',
  'writing_prompt',
  null,
  null,
  null,
  null,
  2400,
  $j${"source":"local-sample","status":"read-only-preview","taskType":"task_2","wordTarget":250,"prompt":"Some people believe that working from home improves productivity, while others think it creates more distractions and weakens teamwork.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'remote-work-writing-q1',
    1,
    'writing_task',
    'Write a complete Task 2 response. Include both views and a clear personal opinion.',
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Writing responses need rubric-based feedback rather than exact-answer checking. A future version can evaluate task response, coherence, lexical resource, and grammar.',
    $j${"ieltsType":"writing_task_2","wordTarget":250}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'writing-progressive-remote-work-task-2-001'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- speaking · A Change in Your City
-- ---------------------------------------------------------------------------

insert into public.practice_units (
  slug, skill, mode, title, description, difficulty, material_type,
  passage_text, audio_url, transcript, asset_url, time_limit_seconds,
  metadata, is_active
) values (
  'speaking-progressive-city-change-part-2-001',
  'speaking',
  'progressive',
  'A Change in Your City',
  'A Speaking Part 2 MVP preview: one cue card, prep guidance, and a local response note area.',
  'medium',
  'speaking_prompt',
  null,
  null,
  null,
  null,
  120,
  $j${"source":"local-sample","status":"read-only-preview","part":2,"prepSeconds":60,"responseSeconds":120,"cueCard":"Describe a change that has improved the area where you live.\n\nYou should say:\n- what the change was\n- when it happened\n- who benefited from it\n- and explain why you think it improved the area.","seededFrom":"local-samples"}$j$::jsonb,
  true
)
on conflict (slug) do update set
  skill = excluded.skill,
  mode = excluded.mode,
  title = excluded.title,
  description = excluded.description,
  difficulty = excluded.difficulty,
  material_type = excluded.material_type,
  passage_text = excluded.passage_text,
  audio_url = excluded.audio_url,
  transcript = excluded.transcript,
  asset_url = excluded.asset_url,
  time_limit_seconds = excluded.time_limit_seconds,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.practice_questions (
  unit_id, external_key, question_number, question_type, question_text,
  options, answer_key, explanation, metadata, is_active
)
select
  u.id, q.external_key, q.question_number, q.question_type, q.question_text,
  q.options, q.answer_key, q.explanation, q.metadata, true
from public.practice_units u,
(values
  (
    'city-change-speaking-q1',
    1,
    'speaking_response',
    'Prepare your 1-2 minute response. Write keywords, a short transcript, or a self-review after speaking aloud.',
    null::jsonb,
    $j${"answers":[],"caseSensitive":false}$j$::jsonb,
    'Speaking responses need timing, recording, transcript, and fluency feedback rather than exact-answer checking. This preview keeps the rehearsal draft local only.',
    $j${"ieltsType":"speaking_part_2","prepSeconds":60,"responseSeconds":120}$j$::jsonb
  )
) as q(external_key, question_number, question_type, question_text, options, answer_key, explanation, metadata)
where u.slug = 'speaking-progressive-city-change-part-2-001'
on conflict (unit_id, external_key) do update set
  question_number = excluded.question_number,
  question_type = excluded.question_type,
  question_text = excluded.question_text,
  options = excluded.options,
  answer_key = excluded.answer_key,
  explanation = excluded.explanation,
  metadata = excluded.metadata,
  is_active = excluded.is_active,
  updated_at = now();

