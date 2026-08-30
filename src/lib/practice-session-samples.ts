import type { PracticeUnit } from './types';

const READING_GREEN_ROOFS_UNIT: PracticeUnit = {
  id: 'sample-reading-green-roofs',
  slug: 'reading-progressive-urban-green-roofs-001',
  skill: 'reading',
  mode: 'progressive',
  title: 'Urban Green Roofs',
  description: 'A Reading MVP preview: one passage with multiple linked questions.',
  difficulty: 'medium',
  material_type: 'passage',
  audio_url: null,
  transcript: null,
  asset_url: null,
  time_limit_seconds: 1200,
  metadata: {
    source: 'local-sample',
    status: 'read-only-preview',
  },
  passage_text: `In many large cities, rooftops have traditionally been treated as empty technical spaces. They hold ventilation equipment, water tanks, and maintenance pathways, but they are rarely considered part of the urban environment. Over the last two decades, however, a growing number of architects and city planners have argued that rooftops can help solve several problems at once if they are covered with carefully selected plants.

A green roof usually consists of a waterproof layer, a root barrier, drainage material, lightweight soil, and vegetation. Some roofs are designed mainly for environmental performance and require little maintenance. Others are accessible gardens used by residents, office workers, or visitors. Although these two types look different, both can reduce the amount of heat absorbed by buildings during summer.

Supporters often point to stormwater management as one of the strongest benefits. During heavy rain, ordinary roofs send water quickly into drains, increasing pressure on urban sewage systems. A planted roof can hold part of that rainfall and release it more slowly. This does not remove the need for proper drainage, but it can reduce peak flow during storms.

Green roofs may also support biodiversity, especially in districts where ground-level habitat has disappeared. Even small areas of vegetation can provide food or resting places for insects and birds. The effect is greater when roofs are connected across several buildings, creating a network rather than isolated patches.

The main barrier is cost. Green roofs are more expensive to install than conventional roofs, and older buildings may need structural assessment before they can support the extra weight. For this reason, some cities have introduced grants or planning rules to encourage adoption. Advocates argue that the long-term savings in cooling, drainage, and roof durability can justify the initial investment.`,
  questions: [
    {
      id: 'green-roofs-q1',
      unit_id: 'sample-reading-green-roofs',
      question_number: 1,
      question_type: 'multiple_choice',
      question_text: 'What is the main purpose of the first paragraph?',
      options: [
        'To describe the technical equipment found on roofs',
        'To introduce a changing view of rooftops in cities',
        'To argue that all city roofs should become gardens',
        'To compare old and new waterproofing materials',
      ],
      answer_key: {
        answers: ['To introduce a changing view of rooftops in cities'],
        caseSensitive: false,
      },
      explanation: 'The paragraph contrasts the traditional view of rooftops with the newer idea that they can help solve urban problems.',
      metadata: { ieltsType: 'multiple_choice' },
    },
    {
      id: 'green-roofs-q2',
      unit_id: 'sample-reading-green-roofs',
      question_number: 2,
      question_type: 'true_false_not_given',
      question_text: 'All green roofs are designed as accessible gardens for people to use.',
      options: ['True', 'False', 'Not Given'],
      answer_key: {
        answers: ['False'],
        caseSensitive: false,
      },
      explanation: 'The passage says some roofs are mainly for environmental performance and others are accessible gardens.',
      metadata: { ieltsType: 'true_false_not_given' },
    },
    {
      id: 'green-roofs-q3',
      unit_id: 'sample-reading-green-roofs',
      question_number: 3,
      question_type: 'sentence_completion',
      question_text: 'A planted roof can reduce pressure on sewage systems by holding rainfall and releasing it more ______.',
      options: null,
      answer_key: {
        answers: ['slowly'],
        caseSensitive: false,
        acceptedAlternatives: ['gradually'],
      },
      explanation: 'Paragraph 3 states that a planted roof can hold rainfall and release it more slowly.',
      metadata: { ieltsType: 'sentence_completion' },
    },
    {
      id: 'green-roofs-q4',
      unit_id: 'sample-reading-green-roofs',
      question_number: 4,
      question_type: 'multiple_choice',
      question_text: 'According to the passage, biodiversity benefits are greater when green roofs are:',
      options: [
        'built only on new buildings',
        'connected across several buildings',
        'kept inaccessible to residents',
        'made with heavier soil',
      ],
      answer_key: {
        answers: ['connected across several buildings'],
        caseSensitive: false,
      },
      explanation: 'The passage says the effect is greater when roofs are connected across several buildings, creating a network.',
      metadata: { ieltsType: 'multiple_choice' },
    },
    {
      id: 'green-roofs-q5',
      unit_id: 'sample-reading-green-roofs',
      question_number: 5,
      question_type: 'short_answer',
      question_text: 'What is described as the main barrier to installing green roofs?',
      options: null,
      answer_key: {
        answers: ['cost'],
        caseSensitive: false,
        acceptedAlternatives: ['the cost', 'high cost'],
      },
      explanation: 'The final paragraph directly states that the main barrier is cost.',
      metadata: { ieltsType: 'short_answer' },
    },
  ],
};

const LISTENING_LIBRARY_ORIENTATION_UNIT: PracticeUnit = {
  id: 'sample-listening-library-orientation',
  slug: 'listening-progressive-library-orientation-001',
  skill: 'listening',
  mode: 'progressive',
  title: 'Library Orientation',
  description: 'A Listening MVP preview: one short section transcript with linked information-completion questions.',
  difficulty: 'medium',
  material_type: 'audio',
  passage_text: null,
  audio_url: '/audio/sample-listening-orientation.wav',
  asset_url: null,
  time_limit_seconds: 600,
  metadata: {
    source: 'local-sample',
    status: 'read-only-preview',
    audioStatus: 'placeholder-tone',
    audioDurationSeconds: 96,
    transcriptCues: [
      { start: 0, text: 'Good morning everyone, and welcome to the first-year library orientation.' },
      { start: 3, text: 'My name is Helen Carter, and I work at the information desk on the ground floor.' },
      { start: 10, text: 'Today I will explain how to borrow books, where to find study rooms, and what to do if you need research help.' },
      { start: 18, text: 'The main library is open from eight thirty in the morning until ten at night from Monday to Friday.' },
      { start: 25, text: "On Saturdays it closes earlier, at six o'clock, and on Sundays only the online help service is available." },
      { start: 32, text: 'You can enter the building with your student card, which also works as your borrowing card.' },
      { start: 38, text: 'Undergraduate students can borrow up to twelve books at one time.' },
      { start: 42, text: 'Most books can be kept for three weeks, but high-demand course books must be returned after seven days.' },
      { start: 49, text: 'If nobody else has requested the item, you can renew it twice through your online library account.' },
      { start: 56, text: 'Study rooms are located on the second and third floors.' },
      { start: 60, text: 'Small rooms for two to four people can be booked online, while the larger presentation room must be booked at the information desk.' },
      { start: 68, text: 'Please remember that food is not allowed in any study room, although drinks with lids are permitted.' },
      { start: 75, text: 'If you need help finding academic articles, you can make an appointment with a subject librarian.' },
      { start: 81, text: 'These appointments are free, but they should be booked at least two days in advance, especially near assignment deadlines.' },
    ],
  },
  transcript: `Good morning everyone, and welcome to the first-year library orientation. My name is Helen Carter, and I work at the information desk on the ground floor. Today I will explain how to borrow books, where to find study rooms, and what to do if you need research help.

The main library is open from eight thirty in the morning until ten at night from Monday to Friday. On Saturdays it closes earlier, at six o'clock, and on Sundays only the online help service is available. You can enter the building with your student card, which also works as your borrowing card.

Undergraduate students can borrow up to twelve books at one time. Most books can be kept for three weeks, but high-demand course books must be returned after seven days. If nobody else has requested the item, you can renew it twice through your online library account.

Study rooms are located on the second and third floors. Small rooms for two to four people can be booked online, while the larger presentation room must be booked at the information desk. Please remember that food is not allowed in any study room, although drinks with lids are permitted.

If you need help finding academic articles, you can make an appointment with a subject librarian. These appointments are free, but they should be booked at least two days in advance, especially near assignment deadlines.`,
  questions: [
    {
      id: 'library-orientation-q1',
      unit_id: 'sample-listening-library-orientation',
      question_number: 1,
      question_type: 'short_answer',
      question_text: 'Where does Helen Carter work?',
      options: null,
      answer_key: {
        answers: ['information desk'],
        caseSensitive: false,
        acceptedAlternatives: ['the information desk', 'ground floor information desk'],
      },
      explanation: 'Helen says she works at the information desk on the ground floor.',
      metadata: { ieltsType: 'short_answer' },
    },
    {
      id: 'library-orientation-q2',
      unit_id: 'sample-listening-library-orientation',
      question_number: 2,
      question_type: 'sentence_completion',
      question_text: 'From Monday to Friday, the main library closes at ______.',
      options: null,
      answer_key: {
        answers: ['ten at night'],
        caseSensitive: false,
        acceptedAlternatives: ['10 at night', '10 pm', '10 p.m.', 'ten pm'],
      },
      explanation: 'The speaker says the library is open until ten at night from Monday to Friday.',
      metadata: { ieltsType: 'sentence_completion' },
    },
    {
      id: 'library-orientation-q3',
      unit_id: 'sample-listening-library-orientation',
      question_number: 3,
      question_type: 'multiple_choice',
      question_text: 'How many books can undergraduate students borrow at one time?',
      options: ['7', '10', '12', '20'],
      answer_key: {
        answers: ['12'],
        caseSensitive: false,
      },
      explanation: 'Undergraduate students can borrow up to twelve books at one time.',
      metadata: { ieltsType: 'multiple_choice' },
    },
    {
      id: 'library-orientation-q4',
      unit_id: 'sample-listening-library-orientation',
      question_number: 4,
      question_type: 'multiple_choice',
      question_text: 'Where must the larger presentation room be booked?',
      options: ['Online', 'At the information desk', 'On the third floor', 'Through a subject librarian'],
      answer_key: {
        answers: ['At the information desk'],
        caseSensitive: false,
      },
      explanation: 'The larger presentation room must be booked at the information desk.',
      metadata: { ieltsType: 'multiple_choice' },
    },
    {
      id: 'library-orientation-q5',
      unit_id: 'sample-listening-library-orientation',
      question_number: 5,
      question_type: 'sentence_completion',
      question_text: 'Subject librarian appointments should be booked at least ______ in advance.',
      options: null,
      answer_key: {
        answers: ['two days'],
        caseSensitive: false,
        acceptedAlternatives: ['2 days'],
      },
      explanation: 'The speaker says appointments should be booked at least two days in advance.',
      metadata: { ieltsType: 'sentence_completion' },
    },
  ],
};

const WRITING_REMOTE_WORK_UNIT: PracticeUnit = {
  id: 'sample-writing-remote-work-task-2',
  slug: 'writing-progressive-remote-work-task-2-001',
  skill: 'writing',
  mode: 'progressive',
  title: 'Remote Work and Productivity',
  description: 'A Writing Task 2 MVP preview: one prompt, planning notes, and a local long-form draft area.',
  difficulty: 'medium',
  material_type: 'writing_prompt',
  passage_text: null,
  audio_url: null,
  transcript: null,
  asset_url: null,
  time_limit_seconds: 2400,
  metadata: {
    source: 'local-sample',
    status: 'read-only-preview',
    taskType: 'task_2',
    wordTarget: 250,
    prompt: `Some people believe that working from home improves productivity, while others think it creates more distractions and weakens teamwork.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.`,
  },
  questions: [
    {
      id: 'remote-work-writing-q1',
      unit_id: 'sample-writing-remote-work-task-2',
      question_number: 1,
      question_type: 'writing_task',
      question_text: 'Write a complete Task 2 response. Include both views and a clear personal opinion.',
      options: null,
      answer_key: {
        answers: [],
        caseSensitive: false,
      },
      explanation: 'Writing responses need rubric-based feedback rather than exact-answer checking. A future version can evaluate task response, coherence, lexical resource, and grammar.',
      metadata: { ieltsType: 'writing_task_2', wordTarget: 250 },
    },
  ],
};

const SPEAKING_CITY_CHANGE_UNIT: PracticeUnit = {
  id: 'sample-speaking-city-change-part-2',
  slug: 'speaking-progressive-city-change-part-2-001',
  skill: 'speaking',
  mode: 'progressive',
  title: 'A Change in Your City',
  description: 'A Speaking Part 2 MVP preview: one cue card, prep guidance, and a local response note area.',
  difficulty: 'medium',
  material_type: 'speaking_prompt',
  passage_text: null,
  audio_url: null,
  transcript: null,
  asset_url: null,
  time_limit_seconds: 120,
  metadata: {
    source: 'local-sample',
    status: 'read-only-preview',
    part: 2,
    prepSeconds: 60,
    responseSeconds: 120,
    cueCard: `Describe a change that has improved the area where you live.\n\nYou should say:\n- what the change was\n- when it happened\n- who benefited from it\n- and explain why you think it improved the area.`,
  },
  questions: [
    {
      id: 'city-change-speaking-q1',
      unit_id: 'sample-speaking-city-change-part-2',
      question_number: 1,
      question_type: 'speaking_response',
      question_text: 'Prepare your 1-2 minute response. Write keywords, a short transcript, or a self-review after speaking aloud.',
      options: null,
      answer_key: {
        answers: [],
        caseSensitive: false,
      },
      explanation: 'Speaking responses need timing, recording, transcript, and fluency feedback rather than exact-answer checking. This preview keeps the rehearsal draft local only.',
      metadata: { ieltsType: 'speaking_part_2', prepSeconds: 60, responseSeconds: 120 },
    },
  ],
};

const SAMPLE_UNITS = [
  READING_GREEN_ROOFS_UNIT,
  LISTENING_LIBRARY_ORIENTATION_UNIT,
  WRITING_REMOTE_WORK_UNIT,
  SPEAKING_CITY_CHANGE_UNIT,
];

export function getSamplePracticeUnits() {
  return SAMPLE_UNITS;
}

export function getSamplePracticeUnit(unitId: string) {
  return SAMPLE_UNITS.find((unit) => unit.slug === unitId || unit.id === unitId) ?? null;
}

export function getDefaultSamplePracticeUnit() {
  return READING_GREEN_ROOFS_UNIT;
}
