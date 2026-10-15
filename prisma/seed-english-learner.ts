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

const SEEDED_UNITS = [1, 2, 3, 4];

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

const ALL_CONCEPTS = [...UNIT_1_CONCEPTS, ...UNIT_2_CONCEPTS, ...UNIT_3_CONCEPTS, ...UNIT_4_CONCEPTS];
const ALL_QUESTIONS = [...UNIT_1_QUESTIONS, ...UNIT_2_QUESTIONS, ...UNIT_3_QUESTIONS, ...UNIT_4_QUESTIONS];

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
