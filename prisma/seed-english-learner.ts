import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  type ElConceptType,
  type ElExerciseType,
  type ElDifficulty,
  type ElSectionType,
  type ElUnitType,
} from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// [2026-10-15] Seed demo cho English Learner - noi dung BIEN SOAN DOC LAP,
// LAY CAU TRUC tham khao tu giao trinh Destination B2 (Course->Unit->
// Section->Lesson->Concept->Exercise, nhom Grammar/Vocabulary xen ke, co
// Review tong hop) nhung KHONG sao chep nguyen van bai/vi du tu sach co ban
// quyen (spec muc 2.12) - moi explanation/example/exercise duoi day la chu
// MOI, tu viet rieng cho demo nay. `isDemo: true` tren Course de FE hien
// badge ro rang (spec muc 10: "Không tạo số liệu giả... phân biệt rõ").
//
// Idempotent - dung upsert theo slug/number o MOI cap, chay lai an toan
// (khong tao trung, chi ghi de noi dung moi nhat).

async function main() {
  const course = await prisma.elCourse.upsert({
    where: { slug: 'b2-grammar-vocabulary' },
    create: {
      slug: 'b2-grammar-vocabulary',
      title: 'B2 Grammar & Vocabulary (Demo)',
      description:
        'Nội dung demo biên soạn độc lập, tham khảo cấu trúc tổ chức kiến thức bậc B2 (CEFR) - không sao chép từ bất kỳ giáo trình có bản quyền nào. Dùng để kiểm thử luồng học: Course → Unit → Section → Lesson → Concept → Exercise.',
      level: 'B2',
      objectives: [
        'Phân biệt và sử dụng chính xác các thì quá khứ/hiện tại thường gây nhầm lẫn ở trình độ B2.',
        'Mở rộng vốn từ vựng chủ đề công việc qua phrasal verbs, collocations và word formation.',
      ],
      isDemo: true,
      sortOrder: 0,
    },
    update: {},
  });

  // ---------------------------------------------------------------------
  // UNIT 1 - GRAMMAR: Present Perfect vs Past Simple
  // ---------------------------------------------------------------------
  const unit1 = await prisma.elUnit.upsert({
    where: { courseId_slug: { courseId: course.id, slug: 'present-perfect-vs-past-simple' } },
    create: {
      courseId: course.id,
      slug: 'present-perfect-vs-past-simple',
      number: 1,
      title: 'Present Perfect vs Past Simple',
      type: 'GRAMMAR' as ElUnitType,
      topic: 'Talking about experience and finished time',
      description:
        'Phân biệt khi nào dùng Present Perfect và khi nào dùng Past Simple - lỗi phổ biến nhất ở trình độ B2.',
      objectives: [
        'Nắm vững công thức và cách dùng Present Perfect Simple.',
        'Phân biệt Present Perfect với Past Simple qua ngữ cảnh thời gian.',
      ],
      estimatedMinutes: 25,
      sortOrder: 0,
    },
    update: {},
  });

  const section1a = await prisma.elSection.upsert({
    where: { unitId_slug: { unitId: unit1.id, slug: 'grammar-explanation' } },
    create: {
      unitId: unit1.id,
      slug: 'grammar-explanation',
      title: 'Grammar Explanation',
      type: 'GRAMMAR_EXPLANATION' as ElSectionType,
      description: 'Quy tắc, công thức và ví dụ.',
      sortOrder: 0,
    },
    update: {},
  });

  const lesson1a = await prisma.elLesson.upsert({
    where: { sectionId_slug: { sectionId: section1a.id, slug: 'present-perfect-basics' } },
    create: {
      sectionId: section1a.id,
      slug: 'present-perfect-basics',
      title: 'Present Perfect: Form & Use',
      objectives: ['Dựng đúng câu khẳng định/phủ định/nghi vấn ở Present Perfect.'],
      sortOrder: 0,
    },
    update: {},
  });

  const concept1a1 = await prisma.elConcept.upsert({
    where: { id: 'seed-concept-present-perfect' },
    create: {
      id: 'seed-concept-present-perfect',
      lessonId: lesson1a.id,
      type: 'GRAMMAR' as ElConceptType,
      title: 'Present Perfect Simple',
      explanation:
        'Present Perfect Simple diễn tả một hành động xảy ra trong quá khứ nhưng có liên hệ với hiện tại - hoặc vì nó vừa mới xảy ra, hoặc vì kết quả của nó vẫn còn đúng ở hiện tại. Khác với Past Simple, Present Perfect KHÔNG nói rõ hành động xảy ra chính xác khi nào.',
      formula: 'S + have/has + past participle (V3)',
      examples: [
        { en: 'I have lived in this city for three years.', vi: 'Tôi đã sống ở thành phố này được ba năm (và vẫn đang sống ở đây).' },
        { en: 'She has just finished her report.', vi: 'Cô ấy vừa hoàn thành xong báo cáo.' },
        { en: 'They have never been to Japan.', vi: 'Họ chưa bao giờ đến Nhật Bản.', isNegative: true },
      ],
      commonMistakes: [
        {
          title: 'Dùng Present Perfect với mốc thời gian đã kết thúc',
          note: 'Sai: "I have visited Paris in 2019." → Đúng: "I visited Paris in 2019." ("in 2019" là mốc thời gian đã kết thúc, phải dùng Past Simple.',
        },
      ],
      usageNotes: [
        { title: 'Tín hiệu nhận biết', note: 'Thường đi kèm: already, just, yet, ever, never, since, for.' },
      ],
      sortOrder: 0,
    },
    update: {},
  });

  const ex1 = await prisma.elExercise.upsert({
    where: { id: 'seed-ex-pp-mc-1' },
    create: {
      id: 'seed-ex-pp-mc-1',
      conceptId: concept1a1.id,
      unitId: unit1.id,
      type: 'MULTIPLE_CHOICE' as ElExerciseType,
      instruction: 'Chọn đáp án đúng.',
      prompt: { text: 'We ___ this problem twice already this week.' },
      options: {
        choices: [
          { id: 'a', text: 'discussed' },
          { id: 'b', text: 'have discussed' },
          { id: 'c', text: 'are discussing' },
          { id: 'd', text: 'discuss' },
        ],
      },
      answerConfig: { correctOptionId: 'b' },
      explanation:
        '"twice already this week" - "this week" chưa kết thúc (tuần hiện tại), nên dùng Present Perfect để nói về số lần đã xảy ra tính đến thời điểm nói.',
      difficulty: 'EASY' as ElDifficulty,
      points: 1,
      sortOrder: 0,
    },
    update: {},
  });

  const ex2 = await prisma.elExercise.upsert({
    where: { id: 'seed-ex-pp-gapfill-1' },
    create: {
      id: 'seed-ex-pp-gapfill-1',
      conceptId: concept1a1.id,
      unitId: unit1.id,
      type: 'GAP_FILL' as ElExerciseType,
      instruction: 'Điền động từ trong ngoặc vào chỗ trống, chia đúng thì Present Perfect.',
      prompt: {
        segments: [
          { type: 'text', value: 'My sister ' },
          { type: 'blank', id: 'b1' },
          { type: 'text', value: ' (not / finish) her thesis yet.' },
        ],
      },
      answerConfig: {
        blanks: [{ id: 'b1', acceptedAnswers: ['has not finished', "hasn't finished", 'has not finish'] }],
      },
      explanation: 'Phủ định Present Perfect: has/have + not + V3. "yet" là tín hiệu rõ ràng của Present Perfect phủ định.',
      difficulty: 'MEDIUM' as ElDifficulty,
      points: 1,
      hint: 'Chủ ngữ số ít → has.',
      sortOrder: 1,
    },
    update: {},
  });

  const section1b = await prisma.elSection.upsert({
    where: { unitId_slug: { unitId: unit1.id, slug: 'compare-and-contrast' } },
    create: {
      unitId: unit1.id,
      slug: 'compare-and-contrast',
      title: 'Compare & Contrast',
      type: 'GRAMMAR_EXPLANATION' as ElSectionType,
      description: 'So sánh Present Perfect với Past Simple.',
      sortOrder: 1,
    },
    update: {},
  });

  const lesson1b = await prisma.elLesson.upsert({
    where: { sectionId_slug: { sectionId: section1b.id, slug: 'pp-vs-past-simple' } },
    create: {
      sectionId: section1b.id,
      slug: 'pp-vs-past-simple',
      title: 'Present Perfect vs Past Simple',
      objectives: ['Chọn đúng thì dựa vào việc mốc thời gian đã kết thúc hay chưa.'],
      sortOrder: 0,
    },
    update: {},
  });

  const concept1b1 = await prisma.elConcept.upsert({
    where: { id: 'seed-concept-pp-vs-past' },
    create: {
      id: 'seed-concept-pp-vs-past',
      lessonId: lesson1b.id,
      type: 'GRAMMAR' as ElConceptType,
      title: 'Present Perfect vs Past Simple',
      explanation:
        'Dùng Past Simple khi hành động xảy ra ở một thời điểm cụ thể ĐÃ KẾT THÚC trong quá khứ (yesterday, last week, in 2020, when I was young). Dùng Present Perfect khi thời gian KHÔNG được nói rõ, hoặc mốc thời gian còn tiếp diễn đến hiện tại (today, this week, so far, since 2020).',
      examples: [
        { en: 'I saw that film last night.', vi: 'Tôi đã xem bộ phim đó tối qua. (mốc thời gian cụ thể, đã kết thúc)' },
        { en: "I've seen that film three times.", vi: 'Tôi đã xem bộ phim đó ba lần. (không nói rõ khi nào)' },
      ],
      commonMistakes: [
        { title: 'Nhầm "since" với "for"', note: '"since" + mốc thời gian (since 2020), "for" + khoảng thời gian (for 3 years) - cả hai đều đi với Present Perfect, không phải Past Simple.' },
      ],
      relatedConceptIds: [concept1a1.id],
      sortOrder: 0,
    },
    update: {},
  });

  const ex3 = await prisma.elExercise.upsert({
    where: { id: 'seed-ex-transform-1' },
    create: {
      id: 'seed-ex-transform-1',
      conceptId: concept1b1.id,
      unitId: unit1.id,
      type: 'SENTENCE_TRANSFORMATION' as ElExerciseType,
      instruction: 'Viết lại câu sau bắt đầu bằng từ cho sẵn, giữ nguyên nghĩa.',
      prompt: {
        original: 'It is three years since I last visited my hometown.',
        keyword: "I haven't",
      },
      answerConfig: {
        acceptedAnswers: [
          "I haven't visited my hometown for three years.",
          "I haven't visited my hometown in three years.",
        ],
      },
      explanation: '"It is X time since..." chuyển thành "haven\'t + V3 + for X time" - cấu trúc chuyển đổi kinh điển giữa 2 cách diễn đạt cùng nghĩa.',
      difficulty: 'HARD' as ElDifficulty,
      points: 2,
      sortOrder: 0,
    },
    update: {},
  });

  const ex4 = await prisma.elExercise.upsert({
    where: { id: 'seed-ex-errorcorrection-1' },
    create: {
      id: 'seed-ex-errorcorrection-1',
      conceptId: concept1b1.id,
      unitId: unit1.id,
      type: 'ERROR_CORRECTION' as ElExerciseType,
      instruction: 'Câu sau có một lỗi sai. Viết lại câu đúng.',
      prompt: { sentence: 'I have graduated from university in 2018.' },
      answerConfig: {
        acceptedAnswers: ['I graduated from university in 2018.', 'I graduated university in 2018.'],
      },
      explanation: '"in 2018" là mốc thời gian cụ thể đã kết thúc → phải dùng Past Simple, không dùng Present Perfect.',
      difficulty: 'MEDIUM' as ElDifficulty,
      points: 1,
      sortOrder: 1,
    },
    update: {},
  });

  // ---------------------------------------------------------------------
  // UNIT 2 - VOCABULARY: Work & Responsibility
  // ---------------------------------------------------------------------
  const unit2 = await prisma.elUnit.upsert({
    where: { courseId_slug: { courseId: course.id, slug: 'work-and-responsibility' } },
    create: {
      courseId: course.id,
      slug: 'work-and-responsibility',
      number: 2,
      title: 'Work & Responsibility',
      type: 'VOCABULARY' as ElUnitType,
      topic: 'Workplace vocabulary',
      description: 'Từ vựng chủ đề công việc: từ đồng nghĩa dễ nhầm, phrasal verbs và word formation.',
      objectives: [
        'Phân biệt responsible/reliable/accountable/dependable.',
        'Sử dụng đúng các phrasal verb phổ biến trong môi trường công việc.',
      ],
      estimatedMinutes: 20,
      sortOrder: 1,
    },
    update: {},
  });

  const section2a = await prisma.elSection.upsert({
    where: { unitId_slug: { unitId: unit2.id, slug: 'vocabulary-in-contrast' } },
    create: {
      unitId: unit2.id,
      slug: 'vocabulary-in-contrast',
      title: 'Vocabulary in Contrast',
      type: 'VOCAB_CONTRAST' as ElSectionType,
      description: 'Các từ gần nghĩa dễ nhầm lẫn.',
      sortOrder: 0,
    },
    update: {},
  });

  const lesson2a = await prisma.elLesson.upsert({
    where: { sectionId_slug: { sectionId: section2a.id, slug: 'responsible-and-friends' } },
    create: {
      sectionId: section2a.id,
      slug: 'responsible-and-friends',
      title: '"Responsible" and similar words',
      objectives: ['Dùng đúng responsible/reliable/accountable/dependable theo ngữ cảnh.'],
      sortOrder: 0,
    },
    update: {},
  });

  const concept2a1 = await prisma.elConcept.upsert({
    where: { id: 'seed-concept-responsible' },
    create: {
      id: 'seed-concept-responsible',
      lessonId: lesson2a.id,
      type: 'VOCABULARY' as ElConceptType,
      title: 'Responsible, reliable, accountable, dependable',
      explanation:
        'Bốn tính từ này đều liên quan đến "đáng tin cậy" nhưng sắc thái khác nhau: "responsible" nhấn mạnh trách nhiệm được giao; "reliable"/"dependable" nhấn mạnh việc luôn làm đúng như mong đợi; "accountable" nhấn mạnh việc phải giải trình khi có sai sót.',
      sortOrder: 0,
    },
    update: {},
  });

  const vocab2a1 = await prisma.elVocabularyItem.upsert({
    where: { id: 'seed-vocab-responsible' },
    create: {
      id: 'seed-vocab-responsible',
      conceptId: concept2a1.id,
      term: 'responsible',
      partOfSpeech: 'adjective',
      meaningVi: 'có trách nhiệm (với việc gì)',
      definitionEn: 'having a duty to deal with or take care of something.',
      ipa: '/rɪˈspɒn.sə.bəl/',
      examples: [
        { en: 'She is responsible for managing the whole team.', vi: 'Cô ấy chịu trách nhiệm quản lý cả đội.' },
      ],
      collocations: ['responsible for something', 'responsible for doing something'],
      wordPatterns: ['responsible for something', 'responsible for doing something'],
      wordFamily: [
        { word: 'responsibility', partOfSpeech: 'noun' },
        { word: 'responsibly', partOfSpeech: 'adverb' },
        { word: 'irresponsible', partOfSpeech: 'adjective' },
      ],
      confusableTerms: ['reliable', 'accountable'],
      sortOrder: 0,
    },
    update: {},
  });

  await prisma.elVocabularyItem.upsert({
    where: { id: 'seed-vocab-reliable' },
    create: {
      id: 'seed-vocab-reliable',
      conceptId: concept2a1.id,
      term: 'reliable',
      partOfSpeech: 'adjective',
      meaningVi: 'đáng tin cậy, luôn làm đúng như mong đợi',
      definitionEn: 'able to be trusted to do something well.',
      ipa: '/rɪˈlaɪ.ə.bəl/',
      examples: [{ en: 'He is a reliable colleague - he never misses a deadline.', vi: 'Anh ấy là một đồng nghiệp đáng tin cậy - không bao giờ trễ hạn.' }],
      wordFamily: [{ word: 'reliability', partOfSpeech: 'noun' }, { word: 'rely on', partOfSpeech: 'phrasal verb' }],
      confusableTerms: ['responsible', 'dependable'],
      sortOrder: 1,
    },
    update: {},
  });

  await prisma.elVocabularyItem.upsert({
    where: { id: 'seed-vocab-accountable' },
    create: {
      id: 'seed-vocab-accountable',
      conceptId: concept2a1.id,
      term: 'accountable',
      partOfSpeech: 'adjective',
      meaningVi: 'phải chịu trách nhiệm giải trình',
      definitionEn: 'required to explain your actions or decisions; having to accept responsibility if things go wrong.',
      ipa: '/əˈkaʊn.tə.bəl/',
      examples: [{ en: 'Managers must be held accountable for their decisions.', vi: 'Quản lý phải chịu trách nhiệm giải trình cho quyết định của mình.' }],
      collocations: ['accountable for something', 'accountable to somebody'],
      wordFamily: [{ word: 'accountability', partOfSpeech: 'noun' }],
      confusableTerms: ['responsible'],
      sortOrder: 2,
    },
    update: {},
  });

  await prisma.elVocabularyItem.upsert({
    where: { id: 'seed-vocab-dependable' },
    create: {
      id: 'seed-vocab-dependable',
      conceptId: concept2a1.id,
      term: 'dependable',
      partOfSpeech: 'adjective',
      meaningVi: 'đáng tin cậy, luôn ổn định',
      definitionEn: 'able to be trusted or relied on.',
      examples: [{ en: 'We need someone dependable to lead this project.', vi: 'Chúng ta cần một người đáng tin cậy để dẫn dắt dự án này.' }],
      wordFamily: [{ word: 'dependability', partOfSpeech: 'noun' }, { word: 'depend on', partOfSpeech: 'phrasal verb' }],
      confusableTerms: ['reliable'],
      sortOrder: 3,
    },
    update: {},
  });

  const ex5 = await prisma.elExercise.upsert({
    where: { id: 'seed-ex-matching-1' },
    create: {
      id: 'seed-ex-matching-1',
      conceptId: concept2a1.id,
      unitId: unit2.id,
      type: 'MATCHING' as ElExerciseType,
      instruction: 'Nối từ ở cột trái với định nghĩa phù hợp ở cột phải.',
      prompt: {
        leftItems: [
          { id: 'l1', text: 'responsible' },
          { id: 'l2', text: 'accountable' },
          { id: 'l3', text: 'dependable' },
        ],
        rightItems: [
          { id: 'r1', text: 'must explain/justify your actions if something goes wrong' },
          { id: 'r2', text: 'having a duty to take care of something' },
          { id: 'r3', text: 'always trustworthy and stable' },
        ],
      },
      answerConfig: {
        correctPairs: [
          { leftId: 'l1', rightId: 'r2' },
          { leftId: 'l2', rightId: 'r1' },
          { leftId: 'l3', rightId: 'r3' },
        ],
      },
      explanation: 'responsible = có trách nhiệm được giao; accountable = phải giải trình; dependable = luôn ổn định, đáng tin.',
      difficulty: 'MEDIUM' as ElDifficulty,
      points: 1,
      sortOrder: 0,
    },
    update: {},
  });

  const section2b = await prisma.elSection.upsert({
    where: { unitId_slug: { unitId: unit2.id, slug: 'phrasal-verbs' } },
    create: {
      unitId: unit2.id,
      slug: 'phrasal-verbs',
      title: 'Phrasal Verbs',
      type: 'PHRASAL_VERBS' as ElSectionType,
      description: 'Phrasal verb thường gặp trong môi trường công việc.',
      sortOrder: 1,
    },
    update: {},
  });

  const lesson2b = await prisma.elLesson.upsert({
    where: { sectionId_slug: { sectionId: section2b.id, slug: 'work-phrasal-verbs' } },
    create: {
      sectionId: section2b.id,
      slug: 'work-phrasal-verbs',
      title: 'Workplace phrasal verbs',
      objectives: ['Dùng đúng take on, deal with, carry out, look into trong câu.'],
      sortOrder: 0,
    },
    update: {},
  });

  const concept2b1 = await prisma.elConcept.upsert({
    where: { id: 'seed-concept-phrasal-verbs' },
    create: {
      id: 'seed-concept-phrasal-verbs',
      lessonId: lesson2b.id,
      type: 'VOCABULARY' as ElConceptType,
      title: 'Workplace phrasal verbs',
      explanation: 'Các phrasal verb này rất phổ biến trong email/họp công việc, mang sắc thái trang trọng hơn so với từ đơn tương đương.',
      sortOrder: 0,
    },
    update: {},
  });

  await prisma.elVocabularyItem.upsert({
    where: { id: 'seed-vocab-take-on' },
    create: {
      id: 'seed-vocab-take-on',
      conceptId: concept2b1.id,
      term: 'take on',
      partOfSpeech: 'phrasal verb',
      meaningVi: 'nhận (thêm việc, trách nhiệm)',
      definitionEn: 'to accept a new responsibility or job.',
      examples: [{ en: "I can't take on any more projects this month.", vi: 'Tháng này tôi không thể nhận thêm dự án nào nữa.' }],
      sortOrder: 0,
    },
    update: {},
  });
  await prisma.elVocabularyItem.upsert({
    where: { id: 'seed-vocab-deal-with' },
    create: {
      id: 'seed-vocab-deal-with',
      conceptId: concept2b1.id,
      term: 'deal with',
      partOfSpeech: 'phrasal verb',
      meaningVi: 'xử lý, giải quyết',
      definitionEn: 'to take action in order to achieve something or in order to solve a problem.',
      examples: [{ en: 'HR will deal with your complaint directly.', vi: 'Phòng nhân sự sẽ trực tiếp xử lý khiếu nại của bạn.' }],
      sortOrder: 1,
    },
    update: {},
  });
  await prisma.elVocabularyItem.upsert({
    where: { id: 'seed-vocab-carry-out' },
    create: {
      id: 'seed-vocab-carry-out',
      conceptId: concept2b1.id,
      term: 'carry out',
      partOfSpeech: 'phrasal verb',
      meaningVi: 'thực hiện, tiến hành',
      definitionEn: 'to do a particular piece of work or task.',
      examples: [{ en: 'The team carried out a detailed survey before the launch.', vi: 'Đội ngũ đã tiến hành một khảo sát chi tiết trước khi ra mắt.' }],
      sortOrder: 2,
    },
    update: {},
  });
  await prisma.elVocabularyItem.upsert({
    where: { id: 'seed-vocab-look-into' },
    create: {
      id: 'seed-vocab-look-into',
      conceptId: concept2b1.id,
      term: 'look into',
      partOfSpeech: 'phrasal verb',
      meaningVi: 'điều tra, tìm hiểu',
      definitionEn: 'to try to find out the facts about a problem or situation.',
      examples: [{ en: "We're looking into why the server went down last night.", vi: 'Chúng tôi đang tìm hiểu nguyên nhân máy chủ gặp sự cố tối qua.' }],
      sortOrder: 3,
    },
    update: {},
  });

  const ex6 = await prisma.elExercise.upsert({
    where: { id: 'seed-ex-gapfill-phrasal' },
    create: {
      id: 'seed-ex-gapfill-phrasal',
      conceptId: concept2b1.id,
      unitId: unit2.id,
      type: 'GAP_FILL' as ElExerciseType,
      instruction: 'Điền phrasal verb phù hợp (đúng dạng) vào chỗ trống.',
      prompt: {
        segments: [
          { type: 'text', value: 'The committee will ' },
          { type: 'blank', id: 'b1' },
          { type: 'text', value: ' the matter before making a decision.' },
        ],
      },
      answerConfig: { blanks: [{ id: 'b1', acceptedAnswers: ['look into', 'investigate'] }] },
      explanation: '"look into" = điều tra/tìm hiểu kỹ trước khi quyết định - đúng ngữ cảnh "before making a decision".',
      difficulty: 'MEDIUM' as ElDifficulty,
      points: 1,
      sortOrder: 0,
    },
    update: {},
  });

  const section2c = await prisma.elSection.upsert({
    where: { unitId_slug: { unitId: unit2.id, slug: 'word-formation' } },
    create: {
      unitId: unit2.id,
      slug: 'word-formation',
      title: 'Word Formation',
      type: 'WORD_FORMATION' as ElSectionType,
      description: 'Biến đổi từ loại trong ngữ cảnh câu.',
      sortOrder: 2,
    },
    update: {},
  });
  const lesson2c = await prisma.elLesson.upsert({
    where: { sectionId_slug: { sectionId: section2c.id, slug: 'word-formation-practice' } },
    create: {
      sectionId: section2c.id,
      slug: 'word-formation-practice',
      title: 'Word formation practice',
      objectives: ['Biến đổi đúng dạng từ (danh từ/tính từ/trạng từ) theo ngữ cảnh.'],
      sortOrder: 0,
    },
    update: {},
  });
  const concept2c1 = await prisma.elConcept.upsert({
    where: { id: 'seed-concept-word-formation' },
    create: {
      id: 'seed-concept-word-formation',
      lessonId: lesson2c.id,
      type: 'VOCABULARY' as ElConceptType,
      title: 'Word formation: responsibility family',
      explanation: 'Từ một gốc tính từ, có thể biến đổi thành danh từ (-ity), trạng từ (-ly) hoặc thêm tiền tố phủ định (ir-).',
      sortOrder: 0,
    },
    update: {},
  });

  const ex7 = await prisma.elExercise.upsert({
    where: { id: 'seed-ex-wordformation-1' },
    create: {
      id: 'seed-ex-wordformation-1',
      conceptId: concept2c1.id,
      unitId: unit2.id,
      type: 'WORD_FORMATION' as ElExerciseType,
      instruction: 'Biến đổi từ trong ngoặc để hoàn thành câu.',
      prompt: {
        sentence: 'Taking care of client data is a huge ___ (RESPONSIBLE) for our team.',
        baseWord: 'RESPONSIBLE',
      },
      answerConfig: { acceptedAnswers: ['responsibility'] },
      explanation: 'Sau "a huge" cần 1 danh từ → responsible (tính từ) + -ity → responsibility (danh từ).',
      difficulty: 'MEDIUM' as ElDifficulty,
      points: 1,
      sortOrder: 0,
    },
    update: {},
  });

  // ---------------------------------------------------------------------
  // REVIEW - tong hop ca 2 Unit
  // ---------------------------------------------------------------------
  await prisma.elReview.upsert({
    where: { id: 'seed-review-1' },
    create: {
      id: 'seed-review-1',
      courseId: course.id,
      title: 'Review 1: Units 1-2',
      description: 'Ôn tập tổng hợp thì Present Perfect/Past Simple và từ vựng công việc.',
      coveredUnitIds: [unit1.id, unit2.id],
      exerciseIds: [ex1.id, ex2.id, ex3.id, ex4.id, ex5.id, ex6.id, ex7.id],
      sortOrder: 0,
    },
    update: {
      coveredUnitIds: [unit1.id, unit2.id],
      exerciseIds: [ex1.id, ex2.id, ex3.id, ex4.id, ex5.id, ex6.id, ex7.id],
    },
  });

  console.log('English Learner seed done:');
  console.log(`  Course: ${course.title} (${course.slug})`);
  console.log(`  Units: ${unit1.title}, ${unit2.title}`);
  console.log(`  Vocabulary items: ${[vocab2a1].length + 7}`);
  console.log(`  Exercises: 7`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
