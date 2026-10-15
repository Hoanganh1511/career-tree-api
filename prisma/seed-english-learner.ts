// [2026-10-15] Seed English Learner - Phase 1 MVP, vertical slice Unit 1-4
// (Destination B2: Present time / Travel & transport / Past time / Hobbies,
// sport and games). Chi seed EnglishConcept + EnglishQuestion (noi dung
// dung chung, KHONG phai du lieu rieng user) - xem banner day du trong
// schema.prisma. Them Unit sau chi can noi dai UNIT_1..4 ben duoi, KHONG
// can sua code engine (english-learner.service.ts tu dong chon theo unit).
//
// Idempotent: xoa het EnglishQuestion/EnglishConcept thuoc Unit 1-4 truoc
// khi insert lai - KHONG dung toi bang nao khac (session/answer/mastery cua
// user giu nguyen, co the tro toi id cu da bi xoa trong luc dev, chap nhan
// duoc o giai doan nay).
//
// ts-node + Prisma 7 generator moi emit import dang "./internal/class.js"
// trong code .ts (dung cho tsc bien dich ra .js THAT, nhung ts-node chay
// truc tiep .ts thi khong tu resolve .js -> .ts duoc) - shim nho duoi day
// chi patch rieng cho LAN CHAY SEED NAY, khong dong vao tsconfig/package.json
// chung cua repo.
import Module from 'node:module';
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
const originalResolve = (Module as unknown as { _resolveFilename: (...a: unknown[]) => string })
  ._resolveFilename;
(Module as unknown as { _resolveFilename: (...a: unknown[]) => string })._resolveFilename =
  function (request: string, ...args: unknown[]) {
    try {
      return originalResolve.call(this, request, ...args);
    } catch (err) {
      if (request.endsWith('.js')) {
        try {
          return originalResolve.call(this, request.slice(0, -3) + '.ts', ...args);
        } catch {
          // fall through to rethrow the original error below
        }
      }
      throw err;
    }
  };

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type EnglishConceptCategory,
  type EnglishDifficulty,
  type EnglishQuestionType,
} from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SEEDED_UNITS = [1, 2, 3, 4, 5, 6, 7, 8];

interface ConceptSeed {
  unit: number;
  name: string;
  category: EnglishConceptCategory;
}

interface OptionSeed {
  id: string;
  text: string;
  errorType: string | null;
}

interface QuestionSeed {
  unit: number;
  conceptTags: string[];
  questionType: EnglishQuestionType;
  difficulty: EnglishDifficulty;
  stem: string;
  options: OptionSeed[];
  correctOptionId: string;
  explanation: string;
  distractorExplanations: Record<string, string>;
  minTimeSeconds: number;
  timeLimitSeconds: number;
  sourceUnitExample?: boolean;
}

// Trac nghiem 3 dap an a/b/c, 1 dung - helper tranh lap lai {id,text,errorType}.
function mc(
  correctText: string,
  distractors: [string, string][], // [text, errorType]
): { options: OptionSeed[]; correctOptionId: string } {
  const options: OptionSeed[] = [
    { id: 'a', text: correctText, errorType: null },
    ...distractors.map(([text, errorType], i) => ({
      id: String.fromCharCode(98 + i), // b, c, ...
      text,
      errorType,
    })),
  ];
  return { options, correctOptionId: 'a' };
}

// ---------------------------------------------------------------------------
// UNIT 1 - Grammar: Present time
// ---------------------------------------------------------------------------
const UNIT_1_CONCEPTS: ConceptSeed[] = [
  { unit: 1, name: 'present_simple_habit', category: 'GRAMMAR' },
  { unit: 1, name: 'present_continuous_now', category: 'GRAMMAR' },
  { unit: 1, name: 'present_perfect_duration', category: 'GRAMMAR' },
  { unit: 1, name: 'present_perfect_continuous_duration', category: 'GRAMMAR' },
  { unit: 1, name: 'stative_verb_exception', category: 'GRAMMAR' },
  { unit: 1, name: 'since_for_contrast', category: 'GRAMMAR' },
];

const UNIT_1_QUESTIONS: QuestionSeed[] = [
  {
    unit: 1,
    conceptTags: ['present_simple_habit'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: 'My brother ___ as a nurse at the city hospital.',
    ...mc('works', [
      ['is working', 'present_continuous_for_permanent_job'],
      ['has worked', 'present_perfect_for_habit'],
    ]),
    explanation: "A permanent job/habit uses Present Simple, not Present Continuous or Perfect.",
    distractorExplanations: {
      b: "'is working' suggests a temporary action, not a permanent job.",
      c: "'has worked' focuses on duration/experience, not the routine fact.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 1,
    conceptTags: ['present_continuous_now'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: "Shh, the baby ___. Don't make noise.",
    ...mc('is sleeping', [
      ['sleeps', 'present_simple_for_temporary_action'],
      ['has slept', 'present_perfect_for_ongoing_action'],
    ]),
    explanation: 'An action happening right now uses Present Continuous.',
    distractorExplanations: {
      b: "'sleeps' describes a habit, not what is happening at this exact moment.",
      c: "'has slept' implies completion, not an action still in progress.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 1,
    conceptTags: ['stative_verb_exception'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'I ___ her very well - we grew up together.',
    ...mc('know', [
      ['am knowing', 'stative_verb_continuous_misuse'],
      ['knew', 'past_simple_for_current_state'],
    ]),
    explanation: "'Know' is a stative verb and is not normally used in the continuous form.",
    distractorExplanations: {
      b: "Stative verbs like 'know' describe states, not actions - they don't take '-ing'.",
      c: "'knew' is past tense, but the sentence describes a state true now.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 1,
    conceptTags: ['present_perfect_duration', 'since_for_contrast'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'They ___ in this apartment for almost ten years.',
    ...mc('have lived', [
      ['live', 'present_simple_for_duration'],
      ['are living', 'present_continuous_for_duration'],
    ]),
    explanation: "Duration up to now ('for ten years') requires Present Perfect.",
    distractorExplanations: {
      b: "'live' alone doesn't express the idea of duration leading up to now.",
      c: "'are living' emphasises a temporary situation, not a long-term duration.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 1,
    conceptTags: ['present_simple_habit'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: 'My colleague Mark ___ a marketing report every Friday afternoon.',
    ...mc('writes', [
      ['is writing', 'present_continuous_for_routine'],
      ['has written', 'present_perfect_for_routine'],
    ]),
    explanation: "A recurring routine ('every Friday') uses Present Simple.",
    distractorExplanations: {
      b: "'is writing' would mean he is doing it right now, not as a routine.",
      c: "'has written' suggests a completed single action, not a repeated routine.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 1,
    conceptTags: ['present_continuous_now'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: 'Right now, the engineers ___ the new bridge design on the whiteboard.',
    ...mc('are sketching', [
      ['sketch', 'present_simple_for_right_now'],
      ['have sketched', 'present_perfect_for_ongoing_action'],
    ]),
    explanation: "'Right now' signals an action in progress - Present Continuous.",
    distractorExplanations: {
      b: "'sketch' would describe a habit, not what's happening at this moment.",
      c: "'have sketched' implies the action is finished, contradicting 'right now'.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 1,
    conceptTags: ['present_perfect_continuous_duration'],
    questionType: 'APPLICATION',
    difficulty: 'HARD',
    stem: 'Our team ___ on this project since January, and we still have a lot to do.',
    ...mc('has been working', [
      ['has worked', 'present_perfect_simple_for_continuous_emphasis'],
      ['works', 'present_simple_for_duration'],
    ]),
    explanation:
      'Emphasising an ongoing, unfinished activity over a period uses Present Perfect Continuous.',
    distractorExplanations: {
      b: "'has worked' is possible but puts less emphasis on the continuing, unfinished nature stressed here.",
      c: "'works' loses the sense of duration ('since January') entirely.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 1,
    conceptTags: ['stative_verb_exception'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: 'I ___ this painting is beautiful, even though the colours are unusual.',
    ...mc('think', [
      ['am thinking', 'stative_verb_continuous_misuse'],
      ['thought', 'past_simple_for_current_opinion'],
    ]),
    explanation: "'Think' meaning 'have an opinion' is stative and not used in the continuous form.",
    distractorExplanations: {
      b: "'am thinking' (continuous) here would wrongly suggest the action of 'thinking something over', not an opinion.",
      c: "'thought' is past tense, but the opinion is held now.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 1,
    conceptTags: ['since_for_contrast', 'present_perfect_duration'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: "Which sentence corrects the error in: 'She has lived in Paris for 2019.'?",
    ...mc('She has lived in Paris since 2019.', [
      ['She has lived in Paris for 2019 years.', 'for_duration_wrong_form'],
      ['She lived in Paris for 2019.', 'past_simple_with_since_for_confusion'],
    ]),
    explanation: "'For' is used with a length of time; a starting point like '2019' needs 'since'.",
    distractorExplanations: {
      b: "'for 2019 years' wrongly treats 2019 as a length of time, not a year.",
      c: 'Past Simple loses the connection to the present implied by Present Perfect.',
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
  {
    unit: 1,
    conceptTags: ['stative_verb_exception'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('I know the answer.', [
      ["I'm knowing the answer.", 'stative_verb_continuous_misuse'],
      ['I have known the answer since this morning, and I am still knowing it now.', 'stative_verb_continuous_misuse'],
    ]),
    explanation: "'Know' is stative and should stay in a simple form, not continuous.",
    distractorExplanations: {
      b: "'I'm knowing' is ungrammatical - stative verbs don't take the continuous form.",
      c: "'am still knowing' repeats the same stative-verb misuse.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
];

// ---------------------------------------------------------------------------
// UNIT 2 - Vocabulary: Travel and transport
// ---------------------------------------------------------------------------
const UNIT_2_CONCEPTS: ConceptSeed[] = [
  { unit: 2, name: 'travel_collocations', category: 'VOCABULARY' },
  { unit: 2, name: 'transport_confusable_words', category: 'VOCABULARY' },
  { unit: 2, name: 'travel_phrasal_verbs', category: 'VOCABULARY' },
  { unit: 2, name: 'transport_word_patterns', category: 'VOCABULARY' },
  { unit: 2, name: 'travel_booking_vocab', category: 'VOCABULARY' },
  { unit: 2, name: 'travel_idioms_expressions', category: 'VOCABULARY' },
];

const UNIT_2_QUESTIONS: QuestionSeed[] = [
  {
    unit: 2,
    conceptTags: ['travel_booking_vocab', 'travel_collocations'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: 'We need to ___ a flight to Hanoi for next week.',
    ...mc('book', [
      ['make', 'wrong_collocation_verb'],
      ['take', 'wrong_collocation_verb'],
    ]),
    explanation: "'Book a flight' is the standard collocation.",
    distractorExplanations: {
      b: "'make a flight' is not a natural English collocation.",
      c: "'take a flight' means to travel on one, not to reserve it in advance.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 2,
    conceptTags: ['transport_confusable_words'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'Our ___ to the mountains took almost two days by bus.',
    ...mc('journey', [
      ['travel', 'uncountable_noun_misuse'],
      ['voyage', 'register_mismatch'],
    ]),
    explanation: "'Journey' describes one specific trip from A to B; 'travel' is normally uncountable.",
    distractorExplanations: {
      b: "'travel' is uncountable and cannot take 'a' or be used this way for one specific trip.",
      c: "'voyage' is mainly used for long journeys by sea, not by bus.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 2,
    conceptTags: ['travel_phrasal_verbs'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: "Don't forget to ___ before your flight to avoid queueing at the airport.",
    ...mc('check in online', [
      ['check out', 'phrasal_verb_confusion'],
      ['check up', 'nonstandard_phrasal_verb'],
    ]),
    explanation: "'Check in' is the correct phrasal verb for registering before a flight.",
    distractorExplanations: {
      b: "'check out' is used for leaving a hotel, not boarding a flight.",
      c: "'check up' is not a standard phrasal verb in this context.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 2,
    conceptTags: ['transport_word_patterns'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: 'She usually travels ___ train when she visits her hometown.',
    ...mc('by', [
      ['with', 'wrong_preposition_transport'],
      ['in', 'wrong_preposition_transport'],
    ]),
    explanation: "'By + mode of transport' (by train/bus/car) is the standard pattern.",
    distractorExplanations: {
      b: "'with train' is not a correct preposition pattern for transport.",
      c: "'in train' is not idiomatic; 'in' is used with 'the car', not generally with 'train'.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 2,
    conceptTags: ['travel_phrasal_verbs'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: 'After months of planning, the Robinsons finally ___ for their round-the-world trip this morning.',
    ...mc('set off', [
      ['set up', 'wrong_phrasal_verb'],
      ['set down', 'nonstandard_phrasal_verb'],
    ]),
    explanation: "'Set off' means to begin a journey.",
    distractorExplanations: {
      b: "'set up' means to establish or arrange something, not to begin travelling.",
      c: "'set down' is not a standard phrasal verb for starting a trip.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 2,
    conceptTags: ['transport_confusable_words'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem:
      "The company's new intern described the client visit as more of a quick ___ than a proper journey because it only lasted one day.",
    ...mc('trip', [
      ['travel', 'uncountable_noun_misuse'],
      ['voyage', 'register_mismatch'],
    ]),
    explanation: "'Trip' fits a short, often round visit; 'travel' stays uncountable and general.",
    distractorExplanations: {
      b: "'travel' cannot be used with 'a' to mean one specific visit.",
      c: "'voyage' is used for long sea journeys, not a one-day client visit.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 2,
    conceptTags: ['travel_booking_vocab', 'travel_collocations'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: "Could you help me ___ a conference room for Thursday's workshop?",
    ...mc('book', [
      ['take', 'wrong_collocation_verb'],
      ['catch', 'wrong_collocation_verb'],
    ]),
    explanation: "'Book' collocates with reservable things like rooms, tickets, and flights.",
    distractorExplanations: {
      b: "'take a conference room' is not a natural collocation for reserving it in advance.",
      c: "'catch' collocates with transport (catch a flight/bus), not with rooms.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 2,
    conceptTags: ['travel_idioms_expressions'],
    questionType: 'APPLICATION',
    difficulty: 'HARD',
    stem:
      'Many backpackers enjoy exploring places that are ___, far away from the usual crowded tourist spots.',
    ...mc('off the beaten track', [
      ['off the record', 'idiom_confusion'],
      ['under the weather', 'idiom_confusion'],
    ]),
    explanation: "'Off the beaten track' describes places that are not commonly visited by tourists.",
    distractorExplanations: {
      b: "'off the record' means unofficial/not for publication - unrelated to travel.",
      c: "'under the weather' means feeling slightly ill - unrelated meaning.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 2,
    conceptTags: ['transport_confusable_words'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('I travelled to three countries last year.', [
      ['I have been to three countries by my travel last year.', 'uncountable_noun_misuse'],
      ['I have three travels to other countries last year.', 'uncountable_noun_misuse'],
    ]),
    explanation: "'Travel' is uncountable and is not used with 'a/my' or in the plural like this.",
    distractorExplanations: {
      b: "'by my travel' misuses the uncountable noun 'travel' as if it were countable.",
      c: "'three travels' incorrectly pluralises the uncountable noun 'travel'.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
  {
    unit: 2,
    conceptTags: ['travel_phrasal_verbs'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('We checked into our hotel at 2pm.', [
      ['We checked in our hotel at 2pm.', 'missing_preposition'],
      ['We checked up our hotel at 2pm.', 'wrong_phrasal_verb'],
    ]),
    explanation: "'Check into' (a place) is the correct pattern when naming the destination directly.",
    distractorExplanations: {
      b: "'checked in our hotel' is missing the preposition 'into' needed before a place.",
      c: "'checked up' is a different phrasal verb (to investigate), not used for arriving at a hotel.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
];

// ---------------------------------------------------------------------------
// UNIT 3 - Grammar: Past time
// ---------------------------------------------------------------------------
const UNIT_3_CONCEPTS: ConceptSeed[] = [
  { unit: 3, name: 'past_simple_completed', category: 'GRAMMAR' },
  { unit: 3, name: 'past_continuous_background', category: 'GRAMMAR' },
  { unit: 3, name: 'past_perfect_before_past', category: 'GRAMMAR' },
  { unit: 3, name: 'used_to_past_habit', category: 'GRAMMAR' },
  { unit: 3, name: 'would_past_habit', category: 'GRAMMAR' },
  { unit: 3, name: 'past_time_clause_order', category: 'GRAMMAR' },
];

const UNIT_3_QUESTIONS: QuestionSeed[] = [
  {
    unit: 3,
    conceptTags: ['past_perfect_before_past'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'When I arrived at the station, the train ___ already.',
    ...mc('had already left', [
      ['already left', 'past_simple_for_earlier_action'],
      ['was already leaving', 'past_continuous_for_completed_action'],
    ]),
    explanation: 'An action completed before another past action needs Past Perfect.',
    distractorExplanations: {
      b: "Plain Past Simple doesn't clearly show the leaving happened BEFORE the arriving.",
      c: "'was leaving' suggests the action was still in progress, not already finished.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 3,
    conceptTags: ['past_continuous_background'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: 'While Tom ___ dinner, the phone rang.',
    ...mc('was cooking', [
      ['cooked', 'past_simple_for_background_action'],
      ['had cooked', 'past_perfect_for_interrupted_action'],
    ]),
    explanation: 'A longer background action interrupted by a shorter one uses Past Continuous.',
    distractorExplanations: {
      b: "'cooked' (Past Simple) would suggest a completed, not interrupted, action.",
      c: "'had cooked' would mean the cooking finished before the phone rang, which isn't the meaning here.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 3,
    conceptTags: ['used_to_past_habit'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'My grandfather ___ to walk five kilometres to school every day when he was young.',
    ...mc('used to walk', [
      ['would walking', 'malformed_would_habit'],
      ['was used to walking', 'confusion_with_be_used_to'],
    ]),
    explanation: "'Used to + infinitive' describes a repeated past habit that no longer happens.",
    distractorExplanations: {
      b: "'would' must be followed by the base infinitive ('would walk'), not '-ing'.",
      c: "'be used to' means 'accustomed to', a different meaning from describing a past habit.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 3,
    conceptTags: ['would_past_habit'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem:
      'As a child, my aunt ___ tell us amazing stories before bed, though she never wrote any of them down.',
    ...mc('would', [
      ['used', 'incomplete_used_to_form'],
      ['was', 'wrong_auxiliary'],
    ]),
    explanation: "'Would' can describe repeated past actions (not states), just like 'used to'.",
    distractorExplanations: {
      b: "'used' alone is incomplete; it needs 'to' ('used to tell') to work this way.",
      c: "'was tell' is not a correct verb form.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 3,
    conceptTags: ['past_perfect_before_past'],
    questionType: 'APPLICATION',
    difficulty: 'HARD',
    stem:
      'By the time the firefighters arrived at the warehouse, most of the fire ___ out on its own.',
    ...mc('had already died', [
      ['already died', 'past_simple_for_earlier_action'],
      ['was already dying', 'past_continuous_for_completed_action'],
    ]),
    explanation: "'By the time' + an earlier completed event signals Past Perfect.",
    distractorExplanations: {
      b: "Past Simple doesn't clearly mark the fire dying out as happening BEFORE the firefighters arrived.",
      c: "'was dying' implies it was still happening, not already finished.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 3,
    conceptTags: ['past_continuous_background'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem:
      "At 8pm last night, our neighbours ___ loud music, which is why we couldn't sleep.",
    ...mc('were playing', [
      ['played', 'past_simple_for_specific_moment'],
      ['had played', 'past_perfect_for_ongoing_at_specific_time'],
    ]),
    explanation: 'An action in progress at a specific past time point uses Past Continuous.',
    distractorExplanations: {
      b: "'played' suggests a completed action, not one in progress exactly at 8pm.",
      c: "'had played' would mean it finished before 8pm, contradicting the sentence.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 3,
    conceptTags: ['used_to_past_habit'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem:
      "Every summer during her childhood, Lan's family ___ to her grandparents' farm in the countryside.",
    ...mc('used to travel', [
      ['would traveled', 'malformed_would_habit'],
      ['travel', 'present_simple_for_past_habit'],
    ]),
    explanation: "A repeated habit that no longer continues fits 'used to + infinitive'.",
    distractorExplanations: {
      b: "'would' takes the base infinitive, not the past form ('would travel', not 'would traveled').",
      c: "Plain present 'travel' doesn't signal this is a past habit.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 3,
    conceptTags: ['would_past_habit'],
    questionType: 'APPLICATION',
    difficulty: 'HARD',
    stem:
      'In the old factory, workers ___ sing traditional songs together during their lunch breaks to pass the time.',
    ...mc('would', [
      ['use to', 'missing_past_tense_d'],
      ['used', 'incomplete_used_to_form'],
    ]),
    explanation: "'Would' describes this repeated past action smoothly, without needing 'to'.",
    distractorExplanations: {
      b: "'use to' is missing the past-tense 'd' ('used to'), so it's the wrong form.",
      c: "'used' alone is incomplete without 'to' before the base verb.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 3,
    conceptTags: ['past_perfect_before_past', 'past_time_clause_order'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('After she finished her homework, she watched TV.', [
      ['After she finished her homework, she had watched TV.', 'unnecessary_past_perfect'],
      ['After she had finished her homework, she had watched TV.', 'unnecessary_past_perfect'],
    ]),
    explanation:
      "When 'after' already makes the sequence clear, both actions can simply use Past Simple.",
    distractorExplanations: {
      b: "The second action doesn't need Past Perfect since 'after' already shows the order.",
      c: 'Using Past Perfect for both actions is unnecessary and incorrect here.',
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
  {
    unit: 3,
    conceptTags: ['used_to_past_habit'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('She used to get up early when she was a soldier.', [
      ['She was used to getting up early when she was a soldier.', 'confusion_with_be_used_to'],
      ['She used to getting up early when she was a soldier.', 'missing_to_infinitive'],
    ]),
    explanation: "'Used to' describing a past habit is followed by the base infinitive ('get up').",
    distractorExplanations: {
      b: "'was used to' means 'was accustomed to', a different meaning than describing a past habit.",
      c: "'used to' must be followed by the infinitive ('get'), not the '-ing' form.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
];

// ---------------------------------------------------------------------------
// UNIT 4 - Vocabulary: Hobbies, sport and games
// ---------------------------------------------------------------------------
const UNIT_4_CONCEPTS: ConceptSeed[] = [
  { unit: 4, name: 'hobby_collocations', category: 'VOCABULARY' },
  { unit: 4, name: 'sport_verb_patterns', category: 'VOCABULARY' },
  { unit: 4, name: 'game_vocab_core', category: 'VOCABULARY' },
  { unit: 4, name: 'hobby_phrasal_verbs', category: 'VOCABULARY' },
  { unit: 4, name: 'sport_confusable_words', category: 'VOCABULARY' },
  { unit: 4, name: 'hobby_idioms_expressions', category: 'VOCABULARY' },
];

const UNIT_4_QUESTIONS: QuestionSeed[] = [
  {
    unit: 4,
    conceptTags: ['hobby_phrasal_verbs', 'hobby_collocations'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: 'My sister decided to ___ painting after she retired.',
    ...mc('take up', [
      ['take on', 'phrasal_verb_confusion'],
      ['take off', 'phrasal_verb_confusion'],
    ]),
    explanation: "'Take up' means to start a new hobby or activity.",
    distractorExplanations: {
      b: "'take on' means to accept a responsibility or challenge, not to start a hobby.",
      c: "'take off' means to depart, remove something, or suddenly become successful.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 4,
    conceptTags: ['sport_verb_patterns'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: 'He ___ tennis every Saturday morning with his colleagues.',
    ...mc('plays', [
      ['does', 'wrong_verb_pattern_for_ball_sport'],
      ['goes', 'wrong_verb_pattern_for_ball_sport'],
    ]),
    explanation: "Ball sports/games normally collocate with 'play' (play tennis/football/chess).",
    distractorExplanations: {
      b: "'does' collocates with individual activities (do yoga/karate), not ball sports.",
      c: "'goes' collocates with activities ending in '-ing' (go swimming/running), not 'tennis'.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 4,
    conceptTags: ['hobby_phrasal_verbs'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'After months of training, she finally decided to ___ running and try swimming instead.',
    ...mc('give up', [
      ['give in', 'phrasal_verb_confusion'],
      ['give out', 'phrasal_verb_confusion'],
    ]),
    explanation: "'Give up' means to stop doing something permanently.",
    distractorExplanations: {
      b: "'give in' means to surrender or finally agree to something after resisting.",
      c: "'give out' means to distribute something, or (informally) to stop working/run out.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 4,
    conceptTags: ['sport_confusable_words', 'game_vocab_core'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'The two teams drew 2-2 after a thrilling ___ last night.',
    ...mc('match', [
      ['game', 'confusable_noun_mismatch'],
      ['competition', 'register_mismatch'],
    ]),
    explanation: "'Match' is the standard word for one organised team sports event (football match).",
    distractorExplanations: {
      b: "'game' is more typical for board/video games or an individual point/round within a match.",
      c: "'competition' refers to a broader event, not one single team fixture.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 4,
    conceptTags: ['hobby_phrasal_verbs'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem:
      'Looking for a new way to relax after work, my uncle recently ___ pottery at a local community centre.',
    ...mc('took up', [
      ['took on', 'phrasal_verb_confusion'],
      ['took over', 'phrasal_verb_confusion'],
    ]),
    explanation: "'Take up' fits starting a new hobby.",
    distractorExplanations: {
      b: "'take on' means to accept a task or responsibility.",
      c: "'take over' means to assume control of something.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 4,
    conceptTags: ['sport_verb_patterns'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: 'On Sunday mornings, the children in our street usually ___ football in the park near the library.',
    ...mc('play', [
      ['do', 'wrong_verb_pattern_for_ball_sport'],
      ['make', 'wrong_verb_pattern_for_ball_sport'],
    ]),
    explanation: "Ball games collocate with 'play', regardless of the surrounding context.",
    distractorExplanations: {
      b: "'do' is used for individual activities (do karate), not team ball games.",
      c: "'make football' is not a correct collocation in English.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 4,
    conceptTags: ['game_vocab_core', 'sport_confusable_words'],
    questionType: 'APPLICATION',
    difficulty: 'HARD',
    stem:
      'During the chess ___, my coworker made a surprising move that caught everyone off guard.',
    ...mc('game', [
      ['match', 'confusable_noun_mismatch'],
      ['round', 'imprecise_collocation'],
    ]),
    explanation: "A single instance of chess being played is usually called a 'game', not a 'match'.",
    distractorExplanations: {
      b: "'match' usually frames a more formal, often team-based competition.",
      c: "'round' is less precise here; 'game' is the standard term for one chess game.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 4,
    conceptTags: ['hobby_phrasal_verbs'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem:
      'Feeling completely exhausted from the long project, Minh finally decided to ___ overtime and focus on rest.',
    ...mc('give up', [
      ['give away', 'phrasal_verb_confusion'],
      ['give back', 'phrasal_verb_confusion'],
    ]),
    explanation: "'Give up' means to stop doing something.",
    distractorExplanations: {
      b: "'give away' means to donate or reveal something (like a secret).",
      c: "'give back' means to return something to its owner.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 4,
    conceptTags: ['sport_verb_patterns'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'EASY',
    stem: 'Which sentence is correct?',
    ...mc('We play basketball every weekend.', [
      ['We go basketball every weekend.', 'wrong_verb_pattern_for_ball_sport'],
      ['We do basketball every weekend.', 'wrong_verb_pattern_for_ball_sport'],
    ]),
    explanation: "Ball sports like basketball collocate with 'play'.",
    distractorExplanations: {
      b: "'go' collocates with '-ing' activities (go swimming), not 'basketball' directly.",
      c: "'do' collocates with individual/martial activities, not team ball sports.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
  {
    unit: 4,
    conceptTags: ['hobby_phrasal_verbs'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('He took up jogging to stay fit.', [
      ['He took on jogging to stay fit.', 'phrasal_verb_confusion'],
      ['He took in jogging to stay fit.', 'phrasal_verb_confusion'],
    ]),
    explanation: "'Take up' is the correct phrasal verb for starting a new hobby like jogging.",
    distractorExplanations: {
      b: "'take on' means to accept a task or challenge, not start a hobby.",
      c: "'take in' means to absorb information, or to deceive someone.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
];

// ---------------------------------------------------------------------------
// UNIT 5 - Grammar: Future time
// ---------------------------------------------------------------------------
const UNIT_5_CONCEPTS: ConceptSeed[] = [
  { unit: 5, name: 'future_will_prediction', category: 'GRAMMAR' },
  { unit: 5, name: 'be_going_to_plan', category: 'GRAMMAR' },
  { unit: 5, name: 'present_continuous_future_arrangement', category: 'GRAMMAR' },
  { unit: 5, name: 'present_simple_future_timetable', category: 'GRAMMAR' },
  { unit: 5, name: 'future_time_clause_present', category: 'GRAMMAR' },
  { unit: 5, name: 'future_continuous_perfect', category: 'GRAMMAR' },
];

const UNIT_5_QUESTIONS: QuestionSeed[] = [
  {
    unit: 5,
    conceptTags: ['future_will_prediction'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: 'I think it ___ rain later today.',
    ...mc('will', [
      ['is going to', 'evidence_based_future_misuse'],
      ['is raining', 'present_continuous_for_prediction'],
    ]),
    explanation: "'Will' fits a prediction based on opinion ('I think'), not visible evidence.",
    distractorExplanations: {
      b: "'is going to' is more natural for a prediction based on something you can see right now.",
      c: "'is raining' describes an action happening now, not a future prediction.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 5,
    conceptTags: ['be_going_to_plan'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'Look at those dark clouds - it ___ rain soon.',
    ...mc('is going to', [
      ['will', 'opinion_based_future_misuse'],
      ['rains', 'present_simple_for_future_prediction'],
    ]),
    explanation: "'Be going to' fits a prediction based on visible evidence ('those dark clouds').",
    distractorExplanations: {
      b: "'will' is more natural for a prediction based on opinion, not something you can currently see.",
      c: "'rains' (Present Simple) doesn't signal a prediction about the near future.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 5,
    conceptTags: ['present_continuous_future_arrangement'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'I ___ Mai for dinner tonight - we arranged it last week.',
    ...mc('am meeting', [
      ['will meet', 'will_for_fixed_arrangement'],
      ['meet', 'present_simple_for_arrangement'],
    ]),
    explanation: 'A fixed personal arrangement uses Present Continuous.',
    distractorExplanations: {
      b: "'will meet' doesn't capture the sense of a pre-arranged plan.",
      c: "'meet' (Present Simple) suggests a routine, not one specific arranged event.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 5,
    conceptTags: ['present_simple_future_timetable'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'The train ___ at 9:15 tomorrow morning.',
    ...mc('leaves', [
      ['will leave', 'will_for_timetable'],
      ['is leaving', 'present_continuous_for_timetable'],
    ]),
    explanation: 'Fixed timetables/schedules use Present Simple, even for future events.',
    distractorExplanations: {
      b: "'will leave' is possible but less natural than Present Simple for a published timetable.",
      c: "'is leaving' suggests a personal arrangement, not an official timetable.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 5,
    conceptTags: ['future_time_clause_present'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: 'When she ___ home, please tell her to call me.',
    ...mc('gets', [
      ['will get', 'will_in_time_clause'],
      ['is getting', 'present_continuous_in_time_clause'],
    ]),
    explanation: "Time clauses with 'when/after/before/as soon as' use a present tense, not 'will'.",
    distractorExplanations: {
      b: "'will' is not used in a time clause, even though the meaning is future.",
      c: "'is getting' is not the standard present tense used in time clauses here.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 5,
    conceptTags: ['future_continuous_perfect'],
    questionType: 'APPLICATION',
    difficulty: 'HARD',
    stem: 'By this time next year, I ___ my degree.',
    ...mc('will have finished', [
      ['will finish', 'future_simple_for_completed_by_future_point'],
      ['will be finishing', 'future_continuous_for_completed_action'],
    ]),
    explanation: "'By + future time point' needs Future Perfect to show completion before that point.",
    distractorExplanations: {
      b: "'will finish' doesn't clearly show the action is completed BY that future point.",
      c: "'will be finishing' suggests the action is still in progress then, not completed.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 5,
    conceptTags: ['future_continuous_perfect'],
    questionType: 'APPLICATION',
    difficulty: 'HARD',
    stem: "Don't call me at 8pm - I ___ dinner with clients then.",
    ...mc('will be having', [
      ['will have', 'future_simple_for_ongoing_future_action'],
      ['am having', 'present_continuous_for_distant_future'],
    ]),
    explanation: 'Future Continuous describes an action in progress at a specific future time.',
    distractorExplanations: {
      b: "'will have' doesn't express an action in progress at that specific moment.",
      c: "'am having' is not natural for an event that far in the future without a clear arrangement context.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 5,
    conceptTags: ['present_continuous_future_arrangement'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: "My sister ___ to Japan next month - she's already booked the flights.",
    ...mc('is moving', [
      ['will move', 'will_for_fixed_arrangement'],
      ['moves', 'present_simple_for_arrangement'],
    ]),
    explanation: 'Flights already booked signal a fixed arrangement - Present Continuous.',
    distractorExplanations: {
      b: "'will move' loses the sense of an already-confirmed, booked plan.",
      c: "'moves' (Present Simple) suggests a routine, not a one-time arranged move.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 5,
    conceptTags: ['future_time_clause_present'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('As soon as I arrive, I will call you.', [
      ['As soon as I will arrive, I will call you.', 'will_in_time_clause'],
      ['As soon as I am arriving, I will call you.', 'present_continuous_in_time_clause'],
    ]),
    explanation: "The time clause after 'as soon as' uses Present Simple, not 'will'.",
    distractorExplanations: {
      b: "'will arrive' is incorrect inside a time clause.",
      c: "'am arriving' is not the standard present tense used in this type of time clause.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
  {
    unit: 5,
    conceptTags: ['present_simple_future_timetable', 'be_going_to_plan'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('The film starts at 7:30pm.', [
      ['The film will start at 7:30pm, I promise.', 'will_for_timetable'],
      ['The film is going to start at 7:30pm.', 'be_going_to_for_timetable'],
    ]),
    explanation: 'A fixed schedule (cinema showtime) is expressed with Present Simple.',
    distractorExplanations: {
      b: "Combining 'will' with 'I promise' misapplies a personal-commitment form to a fixed schedule.",
      c: "'be going to' is used for plans/predictions, not officially fixed showtimes.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
];

// ---------------------------------------------------------------------------
// UNIT 6 - Vocabulary: Science and technology
// ---------------------------------------------------------------------------
const UNIT_6_CONCEPTS: ConceptSeed[] = [
  { unit: 6, name: 'tech_word_formation', category: 'VOCABULARY' },
  { unit: 6, name: 'tech_collocations', category: 'VOCABULARY' },
  { unit: 6, name: 'tech_confusable_words', category: 'VOCABULARY' },
  { unit: 6, name: 'tech_phrasal_verbs', category: 'VOCABULARY' },
  { unit: 6, name: 'science_core_vocab', category: 'VOCABULARY' },
  { unit: 6, name: 'tech_idioms_expressions', category: 'VOCABULARY' },
];

const UNIT_6_QUESTIONS: QuestionSeed[] = [
  {
    unit: 6,
    conceptTags: ['tech_collocations', 'science_core_vocab'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'The scientist made a major ___ in cancer research.',
    ...mc('breakthrough', [
      ['discovery', 'wrong_collocation_noun'],
      ['invention', 'wrong_collocation_noun'],
    ]),
    explanation: "'Make a breakthrough' is the standard collocation for a major advance in research.",
    distractorExplanations: {
      b: "'discovery' is possible on its own but doesn't fit the fixed collocation 'make a breakthrough' here.",
      c: "'invention' implies creating a device, not making progress in research.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 6,
    conceptTags: ['tech_confusable_words'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'Alexander Fleming ___ penicillin by accident in 1928.',
    ...mc('discovered', [
      ['invented', 'confusable_verb_discover_invent'],
      ['developed', 'confusable_verb_discover_develop'],
    ]),
    explanation: "'Discover' means to find something that already existed in nature.",
    distractorExplanations: {
      b: "'invented' means to create something new, not to find something already existing.",
      c: "'developed' means to improve or build on something over time, not a one-off accidental finding.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 6,
    conceptTags: ['tech_word_formation'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: 'This smartphone has an ___ design that makes it very easy to use.',
    ...mc('innovative', [
      ['innovation', 'wrong_word_form_noun_for_adjective'],
      ['innovatively', 'wrong_word_form_adverb_for_adjective'],
    ]),
    explanation: "Describing a noun ('design') needs the adjective form 'innovative'.",
    distractorExplanations: {
      b: "'innovation' is a noun, but an adjective is needed before 'design'.",
      c: "'innovatively' is an adverb and cannot directly describe a noun.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 6,
    conceptTags: ['tech_phrasal_verbs'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'Researchers need to ___ several experiments before publishing their results.',
    ...mc('carry out', [
      ['carry on', 'phrasal_verb_confusion'],
      ['carry away', 'phrasal_verb_confusion'],
    ]),
    explanation: "'Carry out' means to perform or conduct (an experiment, a plan).",
    distractorExplanations: {
      b: "'carry on' means to continue doing something.",
      c: "'carry away' (often passive, 'get carried away') means to become very excited and lose control.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 6,
    conceptTags: ['tech_phrasal_verbs'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: "After years of work, the team finally ___ a solution to the energy storage problem.",
    ...mc('came up with', [
      ['came up to', 'nonstandard_phrasal_verb'],
      ['came on with', 'nonstandard_phrasal_verb'],
    ]),
    explanation: "'Come up with' means to think of or produce an idea or solution.",
    distractorExplanations: {
      b: "'came up to' is not a standard phrasal verb with this meaning.",
      c: "'came on with' is not a standard English phrasal verb.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 6,
    conceptTags: ['tech_idioms_expressions'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: "The company's new electric engine is considered ___ technology in the industry.",
    ...mc('cutting-edge', [
      ['old-fashioned', 'idiom_confusion'],
      ['second-hand', 'idiom_confusion'],
    ]),
    explanation: "'Cutting-edge' describes the most modern, advanced technology available.",
    distractorExplanations: {
      b: "'old-fashioned' means outdated - the opposite meaning intended here.",
      c: "'second-hand' means previously owned/used, unrelated to how advanced something is.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 6,
    conceptTags: ['tech_confusable_words'],
    questionType: 'APPLICATION',
    difficulty: 'HARD',
    stem: 'The pharmaceutical lab ___ a new vaccine after testing it on thousands of volunteers.',
    ...mc('developed', [
      ['discovered', 'confusable_verb_discover_develop'],
      ['invented', 'confusable_verb_invent_develop'],
    ]),
    explanation: "'Develop' fits a process of research and improvement over time, like creating a vaccine.",
    distractorExplanations: {
      b: "'discovered' implies finding something already existing, not building it through research.",
      c: "'invented' suggests creating something entirely from scratch, less natural for a vaccine developed through trials.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 6,
    conceptTags: ['tech_word_formation'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: 'Her presentation on renewable energy was both ___ and easy to follow.',
    ...mc('informative', [
      ['informational', 'wrong_word_form_similar_adjective'],
      ['information', 'wrong_word_form_noun_for_adjective'],
    ]),
    explanation: "'Informative' describes something that gives useful, engaging information.",
    distractorExplanations: {
      b: "'informational' is a less natural choice here, usually describing neutral factual material rather than an engaging quality.",
      c: "'information' is a noun and cannot directly describe the presentation this way.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 6,
    conceptTags: ['tech_phrasal_verbs'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('Scientists need to carry out more tests before approving the drug.', [
      ['Scientists need to carry on more tests before approving the drug.', 'phrasal_verb_confusion'],
      ['Scientists need to carry up more tests before approving the drug.', 'nonstandard_phrasal_verb'],
    ]),
    explanation: "'Carry out' (perform/conduct) is the correct phrasal verb for running tests.",
    distractorExplanations: {
      b: "'carry on' means to continue, not to perform/conduct something.",
      c: "'carry up' is not a standard English phrasal verb.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
  {
    unit: 6,
    conceptTags: ['tech_confusable_words'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('Marie Curie discovered radium.', [
      ['Marie Curie invented radium.', 'confusable_verb_discover_invent'],
      ['Marie Curie developed radium.', 'confusable_verb_discover_develop'],
    ]),
    explanation: "Radium already existed in nature - Curie 'discovered' it, she didn't create or improve it.",
    distractorExplanations: {
      b: "'invented' wrongly implies radium didn't exist before and was created by her.",
      c: "'developed' wrongly implies a process of building or improving something over time.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
];

// ---------------------------------------------------------------------------
// UNIT 7 - Grammar: Articles, countable/uncountable, quantifiers
// ---------------------------------------------------------------------------
const UNIT_7_CONCEPTS: ConceptSeed[] = [
  { unit: 7, name: 'indefinite_article_a_an', category: 'GRAMMAR' },
  { unit: 7, name: 'definite_article_the', category: 'GRAMMAR' },
  { unit: 7, name: 'zero_article_general', category: 'GRAMMAR' },
  { unit: 7, name: 'countable_uncountable_distinction', category: 'GRAMMAR' },
  { unit: 7, name: 'quantifier_some_any', category: 'GRAMMAR' },
  { unit: 7, name: 'quantifier_much_many_little_few', category: 'GRAMMAR' },
];

const UNIT_7_QUESTIONS: QuestionSeed[] = [
  {
    unit: 7,
    conceptTags: ['indefinite_article_a_an'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: 'I saw ___ elephant at the zoo yesterday.',
    ...mc('an', [
      ['a', 'wrong_article_before_vowel_sound'],
      ['the', 'definite_article_for_first_mention'],
    ]),
    explanation: "'An' is used before a vowel sound ('elephant').",
    distractorExplanations: {
      b: "'a' is used before a consonant sound, not a vowel sound like 'elephant'.",
      c: "'the' would wrongly imply the elephant was already known/specific before this first mention.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 7,
    conceptTags: ['definite_article_the'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'I bought a book yesterday. ___ book was really interesting.',
    ...mc('The', [
      ['A', 'indefinite_article_for_already_mentioned'],
      ['Some', 'quantifier_with_singular_countable_noun'],
    ]),
    explanation: "Once a noun has been mentioned once, later references use 'the'.",
    distractorExplanations: {
      b: "'A' is for first mentions; this book was already introduced in the previous sentence.",
      c: "'Some' doesn't go with a specific singular countable noun like this.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 7,
    conceptTags: ['zero_article_general'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: '___ dangerous animals when they feel threatened.',
    ...mc('Tigers are', [
      ['The tigers are', 'unnecessary_definite_article_general_concept'],
      ['A tigers is', 'article_number_mismatch'],
    ]),
    explanation: "A general statement about a whole category uses no article with the plural noun.",
    distractorExplanations: {
      b: "'The tigers' wrongly suggests specific, already-known tigers rather than tigers in general.",
      c: "'A' cannot be used with a plural noun like 'tigers'.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 7,
    conceptTags: ['quantifier_some_any', 'countable_uncountable_distinction'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: "I'd like ___ information about your new product line.",
    ...mc('some', [
      ['any', 'some_any_confusion_in_statement'],
      ['a', 'article_with_uncountable_noun'],
    ]),
    explanation: "'Some' fits a positive statement/request; 'information' is uncountable so it can't take 'a'.",
    distractorExplanations: {
      b: "'any' is typically used in negatives/questions, not in a polite positive request like this.",
      c: "'information' is uncountable and cannot be used with 'a'.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 7,
    conceptTags: ['quantifier_some_any'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: "There isn't ___ milk left in the fridge - we need to buy more.",
    ...mc('any', [
      ['some', 'some_any_confusion_in_negative'],
      ['a', 'article_with_uncountable_noun'],
    ]),
    explanation: "'Any' is used in negative sentences.",
    distractorExplanations: {
      b: "'some' is typically used in positive statements, not negatives like this.",
      c: "'milk' is uncountable and cannot be used with 'a'.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 7,
    conceptTags: ['quantifier_much_many_little_few', 'countable_uncountable_distinction'],
    questionType: 'APPLICATION',
    difficulty: 'HARD',
    stem: "We have ___ time before the meeting starts, so let's grab a coffee.",
    ...mc('a little', [
      ['a few', 'little_few_confusion'],
      ['much', 'much_many_confusion'],
    ]),
    explanation: "'Time' is uncountable, and 'a little' expresses a small positive amount in an affirmative sentence.",
    distractorExplanations: {
      b: "'a few' is used with countable nouns, but 'time' here is uncountable.",
      c: "'much' is more natural in questions/negatives than in this kind of affirmative statement.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 7,
    conceptTags: ['quantifier_much_many_little_few', 'countable_uncountable_distinction'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: 'Only ___ people showed up to the lecture, so it was cancelled.',
    ...mc('a few', [
      ['a little', 'little_few_confusion'],
      ['much', 'much_many_confusion'],
    ]),
    explanation: "'People' is countable, so 'a few' is the correct quantifier.",
    distractorExplanations: {
      b: "'a little' is used with uncountable nouns, but 'people' is countable.",
      c: "'much' pairs with uncountable nouns, not countable ones like 'people'.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 7,
    conceptTags: ['indefinite_article_a_an'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: 'Could I ask you ___ favour?',
    ...mc('a', [
      ['the', 'definite_article_for_first_mention'],
      ['some', 'quantifier_with_singular_countable_noun'],
    ]),
    explanation: "A single, unspecified favour being mentioned for the first time takes 'a'.",
    distractorExplanations: {
      b: "'the' would wrongly imply a specific favour already known to both speakers.",
      c: "'some' doesn't go with a singular countable noun like 'favour'.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 7,
    conceptTags: ['countable_uncountable_distinction', 'quantifier_much_many_little_few'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('I need some advice about my career.', [
      ['I need a advice about my career.', 'article_with_uncountable_noun'],
      ['I need many advice about my career.', 'much_many_confusion'],
    ]),
    explanation: "'Advice' is uncountable - it takes 'some', not 'a' or 'many'.",
    distractorExplanations: {
      b: "'a' cannot be used with the uncountable noun 'advice'.",
      c: "'many' is used with countable nouns, not with uncountable 'advice'.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
  {
    unit: 7,
    conceptTags: ['quantifier_much_many_little_few'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc('She gave me a few useful tips.', [
      ['She gave me a little useful tips.', 'little_few_confusion'],
      ['She gave me much useful tips.', 'much_many_confusion'],
    ]),
    explanation: "'Tips' is countable, so 'a few' is the correct quantifier.",
    distractorExplanations: {
      b: "'a little' is used with uncountable nouns, not countable 'tips'.",
      c: "'much' pairs with uncountable nouns, not countable 'tips'.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
];

// ---------------------------------------------------------------------------
// UNIT 8 - Vocabulary: The media
// ---------------------------------------------------------------------------
const UNIT_8_CONCEPTS: ConceptSeed[] = [
  { unit: 8, name: 'media_core_vocab', category: 'VOCABULARY' },
  { unit: 8, name: 'media_collocations', category: 'VOCABULARY' },
  { unit: 8, name: 'media_confusable_words', category: 'VOCABULARY' },
  { unit: 8, name: 'media_phrasal_verbs', category: 'VOCABULARY' },
  { unit: 8, name: 'media_word_formation', category: 'VOCABULARY' },
  { unit: 8, name: 'media_idioms_expressions', category: 'VOCABULARY' },
];

const UNIT_8_QUESTIONS: QuestionSeed[] = [
  {
    unit: 8,
    conceptTags: ['media_core_vocab', 'media_collocations'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'The newspaper gave extensive ___ to the election results.',
    ...mc('coverage', [
      ['broadcast', 'wrong_collocation_noun'],
      ['headline', 'wrong_collocation_noun'],
    ]),
    explanation: "'Coverage' describes the extent of reporting on an event.",
    distractorExplanations: {
      b: "'broadcast' refers to the transmission itself (usually TV/radio), not the extent of print reporting.",
      c: "'headline' is the title of an article, not the extent of coverage.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 8,
    conceptTags: ['media_collocations'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'The journalist was the first to ___ the corruption scandal.',
    ...mc('break', [
      ['cut', 'wrong_collocation_verb'],
      ['open', 'wrong_collocation_verb'],
    ]),
    explanation: "'Break a story' means to be the first to report it.",
    distractorExplanations: {
      b: "'cut a scandal' is not a standard English collocation.",
      c: "'open a scandal' is not a standard English collocation.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 8,
    conceptTags: ['media_confusable_words'],
    questionType: 'RECOGNITION',
    difficulty: 'MEDIUM',
    stem: 'Many young people now get their news from online ___ rather than printed newspapers.',
    ...mc('sources', [
      ['journals', 'confusable_noun_mismatch'],
      ['magazines', 'confusable_noun_mismatch'],
    ]),
    explanation: "'Sources' broadly covers where news comes from, including websites and apps.",
    distractorExplanations: {
      b: "'journals' usually refers to academic or professional publications, not general news sites.",
      c: "'magazines' refers to periodicals with articles/photos, not general online news sources.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 8,
    conceptTags: ['media_phrasal_verbs'],
    questionType: 'RECOGNITION',
    difficulty: 'EASY',
    stem: 'The reporter had to ___ the protest live from the city centre.',
    ...mc('report on', [
      ['tell on', 'wrong_collocation_verb'],
      ['speak on', 'wrong_collocation_verb'],
    ]),
    explanation: "'Report on' is the standard phrasal verb for journalists covering an event.",
    distractorExplanations: {
      b: "'tell on' means to inform an authority about someone's bad behaviour - unrelated meaning.",
      c: "'speak on' is not the standard phrasal verb for reporting on an event.",
    },
    minTimeSeconds: 8,
    timeLimitSeconds: 30,
  },
  {
    unit: 8,
    conceptTags: ['media_phrasal_verbs'],
    questionType: 'APPLICATION',
    difficulty: 'HARD',
    stem: 'Details of the merger ___ to the press before the official announcement.',
    ...mc('leaked out', [
      ['broke out', 'phrasal_verb_confusion'],
      ['came out', 'phrasal_verb_confusion'],
    ]),
    explanation: "'Leak out' means secret information becomes known without official permission.",
    distractorExplanations: {
      b: "'break out' is normally used for fires, wars, or disease suddenly starting.",
      c: "'came out' is more general and doesn't specifically capture the idea of secret information escaping.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 8,
    conceptTags: ['media_word_formation'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: 'As a trained ___, she always double-checks her facts before publishing.',
    ...mc('journalist', [
      ['journalism', 'wrong_word_form_abstract_noun_for_person'],
      ['journalistic', 'wrong_word_form_adjective_for_noun'],
    ]),
    explanation: "'Journalist' is the person who does the job; the sentence needs a person noun.",
    distractorExplanations: {
      b: "'journalism' is the abstract field/profession, not a person.",
      c: "'journalistic' is an adjective and cannot be the person doing the job.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 8,
    conceptTags: ['media_idioms_expressions'],
    questionType: 'APPLICATION',
    difficulty: 'HARD',
    stem: 'The scandal became ___ within hours of breaking.',
    ...mc('front-page news', [
      ['old news', 'idiom_confusion'],
      ['off the record', 'idiom_confusion'],
    ]),
    explanation: "'Front-page news' describes something considered highly important and widely reported.",
    distractorExplanations: {
      b: "'old news' means something no longer interesting - the opposite of the intended meaning.",
      c: "'off the record' means unofficial/not for publication, unrelated to becoming widely reported.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 8,
    conceptTags: ['media_core_vocab'],
    questionType: 'APPLICATION',
    difficulty: 'MEDIUM',
    stem: "The TV station's evening ___ reaches millions of viewers every night.",
    ...mc('broadcast', [
      ['coverage', 'wrong_collocation_noun'],
      ['headline', 'wrong_collocation_noun'],
    ]),
    explanation: "'Broadcast' refers to the transmitted programme itself.",
    distractorExplanations: {
      b: "'coverage' refers to the extent of reporting on a topic, not the transmitted programme.",
      c: "'headline' is the title of a single story, not an entire evening programme.",
    },
    minTimeSeconds: 12,
    timeLimitSeconds: 40,
  },
  {
    unit: 8,
    conceptTags: ['media_confusable_words'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'MEDIUM',
    stem: 'Which sentence is correct?',
    ...mc("The scientist's findings were published in a respected journal.", [
      ["The scientist's findings were published in a respected magazine.", 'confusable_noun_mismatch'],
      ["The scientist's findings were published in a respected newspaper.", 'confusable_noun_mismatch'],
    ]),
    explanation: "Academic research findings are published in a 'journal', a specialised professional publication.",
    distractorExplanations: {
      b: "'magazine' usually refers to general-interest periodicals, not academic research publications.",
      c: "'newspaper' publishes daily news, not formal academic research findings.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
  {
    unit: 8,
    conceptTags: ['media_idioms_expressions'],
    questionType: 'ERROR_DETECTION',
    difficulty: 'HARD',
    stem: 'Which sentence is correct?',
    ...mc('The minister refused to comment and said it was off the record.', [
      ['The minister refused to comment and said it was off the hook.', 'idiom_confusion'],
      ['The minister refused to comment and said it was off the cuff.', 'idiom_confusion'],
    ]),
    explanation: "'Off the record' means information given unofficially, not for publication.",
    distractorExplanations: {
      b: "'off the hook' means no longer blamed or responsible for something - unrelated meaning.",
      c: "'off the cuff' means said without preparation - unrelated meaning.",
    },
    minTimeSeconds: 10,
    timeLimitSeconds: 35,
  },
];

const ALL_CONCEPTS = [
  ...UNIT_1_CONCEPTS,
  ...UNIT_2_CONCEPTS,
  ...UNIT_3_CONCEPTS,
  ...UNIT_4_CONCEPTS,
  ...UNIT_5_CONCEPTS,
  ...UNIT_6_CONCEPTS,
  ...UNIT_7_CONCEPTS,
  ...UNIT_8_CONCEPTS,
];
const ALL_QUESTIONS = [
  ...UNIT_1_QUESTIONS,
  ...UNIT_2_QUESTIONS,
  ...UNIT_3_QUESTIONS,
  ...UNIT_4_QUESTIONS,
  ...UNIT_5_QUESTIONS,
  ...UNIT_6_QUESTIONS,
  ...UNIT_7_QUESTIONS,
  ...UNIT_8_QUESTIONS,
];

async function main() {
  await prisma.englishQuestion.deleteMany({ where: { unit: { in: SEEDED_UNITS } } });
  await prisma.englishConcept.deleteMany({ where: { unit: { in: SEEDED_UNITS } } });

  for (const c of ALL_CONCEPTS) {
    await prisma.englishConcept.create({ data: c });
  }
  console.log(`+ ${ALL_CONCEPTS.length} concepts (Unit ${SEEDED_UNITS.join(', ')})`);

  for (const q of ALL_QUESTIONS) {
    await prisma.englishQuestion.create({
      data: {
        unit: q.unit,
        conceptTags: q.conceptTags,
        questionType: q.questionType,
        difficulty: q.difficulty,
        stem: q.stem,
        options: q.options as unknown as object,
        correctOptionId: q.correctOptionId,
        explanation: q.explanation,
        distractorExplanations: q.distractorExplanations as unknown as object,
        minTimeSeconds: q.minTimeSeconds,
        timeLimitSeconds: q.timeLimitSeconds,
        sourceUnitExample: q.sourceUnitExample ?? false,
      },
    });
  }
  console.log(`+ ${ALL_QUESTIONS.length} questions (Unit ${SEEDED_UNITS.join(', ')})`);

  const byUnit = await prisma.englishQuestion.groupBy({
    by: ['unit', 'questionType'],
    where: { unit: { in: SEEDED_UNITS } },
    _count: true,
  });
  console.log('Breakdown:', byUnit.map((r) => `U${r.unit}/${r.questionType}=${r._count}`).join(' '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
