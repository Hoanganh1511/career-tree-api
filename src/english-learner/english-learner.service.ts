import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ElExercise,
  ElExerciseType,
  ElProgressStatus,
  Prisma,
} from '../../generated/prisma/client';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

// [2026-10-15] ENGLISH LEARNER - domain service. Day la NOI DUY NHAT cham
// diem (scoreExercise) va tinh tien do (recomputeProgress) - controller chi
// goi xuong, component FE KHONG BAO GIO tu cham/tu suy trang thai. Moi
// Exercise gui ra FE qua `toPublicExercise()` (KHONG bao gio chua
// answerConfig/explanation - xem spec muc 6 "Không tiết lộ đáp án trước khi
// submit"), chi tiet lo sau khi submitAttempt() tra ve.

// ---------------------------------------------------------------------------
// Scoring - 1 ham DUY NHAT cho moi loai bai, KHONG rai rac trong component.
// ---------------------------------------------------------------------------

function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:]+$/g, '');
}

function matchesAny(input: string, accepted: string[]): boolean {
  const n = normalizeAnswer(input);
  return accepted.some((a) => normalizeAnswer(a) === n);
}

type ScoreResult = {
  isCorrect: boolean;
  score: number;
  /** Dap an dung, dang doc duoc - CHI tra ve SAU khi submit, dung de FE
   *  hien "Đáp án đúng: ..." trong AnswerFeedback/ExplanationPanel. */
  correctAnswerDisplay: string;
};

function scoreExercise(
  exercise: Pick<ElExercise, 'type' | 'answerConfig' | 'points'>,
  submitted: Record<string, unknown>,
): ScoreResult {
  const points = exercise.points;
  const cfg = exercise.answerConfig as Record<string, unknown>;

  switch (exercise.type) {
    case ElExerciseType.MULTIPLE_CHOICE: {
      const correctOptionId = String(cfg.correctOptionId ?? '');
      const selected = String(submitted.selectedOptionId ?? '');
      const isCorrect = selected !== '' && selected === correctOptionId;
      return { isCorrect, score: isCorrect ? points : 0, correctAnswerDisplay: correctOptionId };
    }

    case ElExerciseType.GAP_FILL: {
      const blankCfgs = (cfg.blanks ?? []) as { id: string; acceptedAnswers: string[] }[];
      const submittedBlanks = (submitted.blanks ?? {}) as Record<string, string>;
      const results = blankCfgs.map((b) =>
        matchesAny(submittedBlanks[b.id] ?? '', b.acceptedAnswers),
      );
      const isCorrect = results.length > 0 && results.every(Boolean);
      const display = blankCfgs.map((b) => b.acceptedAnswers[0]).join(' / ');
      return { isCorrect, score: isCorrect ? points : 0, correctAnswerDisplay: display };
    }

    case ElExerciseType.SENTENCE_TRANSFORMATION:
    case ElExerciseType.ERROR_CORRECTION:
    case ElExerciseType.WORD_FORMATION: {
      // 3 loai nay CUNG shape: 1 o nhap van ban tu do, nhieu dap an duoc
      // chap nhan (spec muc 6: "không chỉ sử dụng so sánh chuỗi đơn giản...
      // hỗ trợ accepted answers"). normalizeAnswer() bo qua hoa/thuong,
      // khoang trang thua, dau cau cuoi cau - KHONG phai so sanh === tho.
      const accepted = (cfg.acceptedAnswers ?? []) as string[];
      const text = String(submitted.text ?? '');
      const isCorrect = text.trim() !== '' && matchesAny(text, accepted);
      return {
        isCorrect,
        score: isCorrect ? points : 0,
        correctAnswerDisplay: accepted[0] ?? '',
      };
    }

    case ElExerciseType.MATCHING: {
      const correctPairs = (cfg.correctPairs ?? []) as { leftId: string; rightId: string }[];
      const submittedPairs = (submitted.pairs ?? {}) as Record<string, string>;
      const isCorrect =
        correctPairs.length > 0 &&
        correctPairs.every((p) => submittedPairs[p.leftId] === p.rightId);
      const display = correctPairs.map((p) => `${p.leftId} → ${p.rightId}`).join(', ');
      return { isCorrect, score: isCorrect ? points : 0, correctAnswerDisplay: display };
    }

    default:
      return { isCorrect: false, score: 0, correctAnswerDisplay: '' };
  }
}

// ---------------------------------------------------------------------------
// Public DTO - KHONG BAO GIO chua answerConfig/explanation (xem comment dau
// file). Dung chung cho list bai trong Lesson/Practice/Unit Test/Review.
// ---------------------------------------------------------------------------

function toPublicExercise(e: ElExercise) {
  return {
    id: e.id,
    conceptId: e.conceptId,
    unitId: e.unitId,
    type: e.type,
    instruction: e.instruction,
    prompt: e.prompt,
    options: e.options,
    difficulty: e.difficulty,
    points: e.points,
    hint: e.hint,
    sortOrder: e.sortOrder,
  };
}

const PROGRESS_INCLUDE_ORDER = ['CONCEPT', 'LESSON', 'SECTION', 'UNIT', 'COURSE'] as const;

@Injectable()
export class EnglishLearnerService {
  constructor(private prisma: PrismaService) {}

  // --- Content: doc (ai cung xem duoc cau truc, tien do thi gan userId) ----

  async listCourses() {
    const courses = await this.prisma.elCourse.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { units: true } } },
    });
    return courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      level: c.level,
      coverImageUrl: c.coverImageUrl,
      objectives: c.objectives,
      isDemo: c.isDemo,
      unitCount: c._count.units,
    }));
  }

  async getCourseOverview(courseSlug: string, userId?: string) {
    const course = await this.prisma.elCourse.findUnique({
      where: { slug: courseSlug },
      include: {
        units: {
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { sections: true, exercises: true } } },
        },
        reviews: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!course) throw new NotFoundException(`Course "${courseSlug}" not found`);

    const unitProgress = userId
      ? await this.getProgressMap(
          userId,
          'UNIT',
          course.units.map((u) => u.id),
        )
      : new Map<string, { status: ElProgressStatus; progressPercent: number }>();

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      level: course.level,
      coverImageUrl: course.coverImageUrl,
      objectives: course.objectives,
      isDemo: course.isDemo,
      units: course.units.map((u) => ({
        id: u.id,
        slug: u.slug,
        number: u.number,
        title: u.title,
        type: u.type,
        topic: u.topic,
        description: u.description,
        estimatedMinutes: u.estimatedMinutes,
        sectionCount: u._count.sections,
        exerciseCount: u._count.exercises,
        status: unitProgress.get(u.id)?.status ?? 'NOT_STARTED',
        progressPercent: unitProgress.get(u.id)?.progressPercent ?? 0,
      })),
      reviews: course.reviews.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        coveredUnitIds: r.coveredUnitIds,
      })),
    };
  }

  async getUnitOverview(courseSlug: string, unitSlug: string, userId?: string) {
    const course = await this.prisma.elCourse.findUnique({ where: { slug: courseSlug } });
    if (!course) throw new NotFoundException(`Course "${courseSlug}" not found`);
    const unit = await this.prisma.elUnit.findUnique({
      where: { courseId_slug: { courseId: course.id, slug: unitSlug } },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              include: { _count: { select: { concepts: true } } },
            },
          },
        },
        _count: { select: { exercises: true } },
      },
    });
    if (!unit) throw new NotFoundException(`Unit "${unitSlug}" not found`);

    const allLessonIds = unit.sections.flatMap((s) => s.lessons.map((l) => l.id));
    const lessonProgress = userId
      ? await this.getProgressMap(userId, 'LESSON', allLessonIds)
      : new Map<string, { status: ElProgressStatus; progressPercent: number }>();

    return {
      id: unit.id,
      slug: unit.slug,
      courseSlug,
      number: unit.number,
      title: unit.title,
      type: unit.type,
      topic: unit.topic,
      description: unit.description,
      objectives: unit.objectives,
      estimatedMinutes: unit.estimatedMinutes,
      exerciseCount: unit._count.exercises,
      sections: unit.sections.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        type: s.type,
        description: s.description,
        lessons: s.lessons.map((l) => ({
          id: l.id,
          slug: l.slug,
          title: l.title,
          conceptCount: l._count.concepts,
          status: lessonProgress.get(l.id)?.status ?? 'NOT_STARTED',
          progressPercent: lessonProgress.get(l.id)?.progressPercent ?? 0,
        })),
      })),
    };
  }

  async getLesson(courseSlug: string, unitSlug: string, lessonSlug: string) {
    const unit = await this.findUnitBySlug(courseSlug, unitSlug);
    // `sectionId_slug` can khop 1 sectionId CU THE - Lesson slug la unique
    // THEO SECTION, khong phai global, nen tim qua section cua chinh unit
    // nay truoc (1 unit co nhieu section, moi section co the co 1 lesson
    // trung slug voi section khac - hiem nhung schema cho phep).
    const section = await this.prisma.elSection.findFirst({
      where: { unitId: unit.id, lessons: { some: { slug: lessonSlug } } },
    });
    if (!section) throw new NotFoundException(`Lesson "${lessonSlug}" not found`);
    const found = await this.prisma.elLesson.findUnique({
      where: { sectionId_slug: { sectionId: section.id, slug: lessonSlug } },
      include: {
        concepts: {
          orderBy: { sortOrder: 'asc' },
          include: {
            vocabularyItems: { orderBy: { sortOrder: 'asc' } },
            exercises: { orderBy: { sortOrder: 'asc' } },
          },
        },
        section: { include: { unit: true } },
      },
    });
    if (!found) throw new NotFoundException(`Lesson "${lessonSlug}" not found`);

    // Dieu huong Previous/Next - theo thu tu TOAN BO Lesson trong Unit (xuyen
    // qua cac Section), khong chi trong 1 Section.
    const siblings = await this.prisma.elLesson.findMany({
      where: { section: { unitId: unit.id } },
      orderBy: [{ section: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      select: { id: true, slug: true, title: true },
    });
    const idx = siblings.findIndex((l) => l.id === found.id);

    return {
      id: found.id,
      slug: found.slug,
      title: found.title,
      objectives: found.objectives,
      unitSlug,
      courseSlug,
      sectionTitle: found.section.title,
      sectionType: found.section.type,
      previous: idx > 0 ? siblings[idx - 1] : null,
      next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null,
      concepts: found.concepts.map((c) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        explanation: c.explanation,
        formula: c.formula,
        examples: c.examples,
        commonMistakes: c.commonMistakes,
        usageNotes: c.usageNotes,
        relatedConceptIds: c.relatedConceptIds,
        vocabularyItems: c.vocabularyItems,
        exercises: c.exercises.map(toPublicExercise),
      })),
    };
  }

  async listUnitExercises(courseSlug: string, unitSlug: string) {
    const unit = await this.findUnitBySlug(courseSlug, unitSlug);
    const exercises = await this.prisma.elExercise.findMany({
      where: { unitId: unit.id },
      orderBy: [{ concept: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
    return exercises.map(toPublicExercise);
  }

  private async findUnitBySlug(courseSlug: string, unitSlug: string) {
    const course = await this.prisma.elCourse.findUnique({ where: { slug: courseSlug } });
    if (!course) throw new NotFoundException(`Course "${courseSlug}" not found`);
    const unit = await this.prisma.elUnit.findUnique({
      where: { courseId_slug: { courseId: course.id, slug: unitSlug } },
    });
    if (!unit) throw new NotFoundException(`Unit "${unitSlug}" not found`);
    return unit;
  }

  // --- Attempt: cham + luu + cap nhat tien do -------------------------------

  async submitAttempt(userId: string, dto: SubmitAttemptDto) {
    const exercise = await this.prisma.elExercise.findUnique({
      where: { id: dto.exerciseId },
    });
    if (!exercise) throw new NotFoundException(`Exercise ${dto.exerciseId} not found`);

    const result = scoreExercise(exercise, dto.submittedAnswer);

    const attempt = await this.prisma.elExerciseAttempt.create({
      data: {
        userId,
        exerciseId: exercise.id,
        submittedAnswer: dto.submittedAnswer as Prisma.InputJsonValue,
        isCorrect: result.isCorrect,
        score: result.score,
        context: dto.context ?? 'PRACTICE',
        reviewId: dto.reviewId,
        durationMs: dto.durationMs,
      },
    });

    await this.recomputeProgress(userId, exercise.conceptId);

    return {
      attemptId: attempt.id,
      isCorrect: result.isCorrect,
      score: result.score,
      correctAnswerDisplay: result.correctAnswerDisplay,
      explanation: exercise.explanation,
    };
  }

  // Tinh lai trang thai tu Concept len toi Course - BOTTOM-UP (Concept truoc,
  // roi Lesson doc tu ket qua Concept VUA GHI, roi Section...) de moi cap tren
  // luon dua tren du lieu MOI NHAT cua cap duoi, khong bi lech 1 nhip.
  private async recomputeProgress(userId: string, conceptId: string) {
    const concept = await this.prisma.elConcept.findUnique({
      where: { id: conceptId },
      include: { lesson: { include: { section: { include: { unit: true } } } } },
    });
    if (!concept) return;

    await this.recomputeConcept(userId, concept.id);
    await this.recomputeAggregate(userId, 'LESSON', concept.lessonId, 'CONCEPT', (lessonId) =>
      this.prisma.elConcept.findMany({ where: { lessonId }, select: { id: true } }),
    );
    await this.recomputeAggregate(
      userId,
      'SECTION',
      concept.lesson.sectionId,
      'LESSON',
      (sectionId) => this.prisma.elLesson.findMany({ where: { sectionId }, select: { id: true } }),
    );
    await this.recomputeAggregate(
      userId,
      'UNIT',
      concept.lesson.section.unitId,
      'SECTION',
      (unitId) => this.prisma.elSection.findMany({ where: { unitId }, select: { id: true } }),
    );
    await this.recomputeAggregate(
      userId,
      'COURSE',
      concept.lesson.section.unit.courseId,
      'UNIT',
      (courseId) => this.prisma.elUnit.findMany({ where: { courseId }, select: { id: true } }),
    );
  }

  // Concept: MASTERED/COMPLETED/NEEDS_REVIEW dua tren lan tra loi GAN NHAT
  // cho TUNG Exercise cua Concept (khong phai trung binh moi lan tra loi tu
  // truoc - 1 cau tung sai roi sau sua dung thi tinh la dung, dung tinh than
  // spec muc 7.1: trang thai phan anh kien thuc HIEN TAI, khong phai lich su).
  private async recomputeConcept(userId: string, conceptId: string) {
    const exercises = await this.prisma.elExercise.findMany({
      where: { conceptId },
      select: { id: true },
    });
    if (exercises.length === 0) return;

    const latestByExercise = await Promise.all(
      exercises.map((e) =>
        this.prisma.elExerciseAttempt.findFirst({
          where: { userId, exerciseId: e.id, context: { not: 'UNIT_TEST' } },
          orderBy: { attemptedAt: 'desc' },
          select: { isCorrect: true },
        }),
      ),
    );
    const attempted = latestByExercise.filter((a) => a !== null);
    const correctCount = attempted.filter((a) => a!.isCorrect).length;
    const progressPercent =
      exercises.length === 0 ? 0 : Math.round((correctCount / exercises.length) * 100);

    let status: ElProgressStatus;
    if (attempted.length === 0) status = 'NOT_STARTED';
    else if (attempted.length < exercises.length) status = 'IN_PROGRESS';
    else if (correctCount === exercises.length) status = 'MASTERED';
    else status = 'NEEDS_REVIEW';

    await this.upsertProgress(userId, 'CONCEPT', conceptId, status, progressPercent);
  }

  // Lesson/Section/Unit/Course: TRUNG BINH progressPercent cua cac con, status
  // suy tu trung binh do + co con nao NEEDS_REVIEW khong.
  private async recomputeAggregate(
    userId: string,
    entityType: (typeof PROGRESS_INCLUDE_ORDER)[number],
    entityId: string,
    childType: (typeof PROGRESS_INCLUDE_ORDER)[number],
    listChildren: (parentId: string) => Promise<{ id: string }[]>,
  ) {
    const children = await listChildren(entityId);
    if (children.length === 0) return;
    const childProgress = await this.getProgressMap(
      userId,
      childType,
      children.map((c) => c.id),
    );
    const percents = children.map((c) => childProgress.get(c.id)?.progressPercent ?? 0);
    const avg = Math.round(percents.reduce((a, b) => a + b, 0) / children.length);
    const statuses = children.map((c) => childProgress.get(c.id)?.status ?? 'NOT_STARTED');

    let status: ElProgressStatus;
    if (statuses.every((s) => s === 'NOT_STARTED')) status = 'NOT_STARTED';
    else if (statuses.some((s) => s === 'NEEDS_REVIEW')) status = 'NEEDS_REVIEW';
    else if (statuses.every((s) => s === 'MASTERED')) status = 'MASTERED';
    else if (statuses.every((s) => s === 'COMPLETED' || s === 'MASTERED')) status = 'COMPLETED';
    else status = 'IN_PROGRESS';

    await this.upsertProgress(userId, entityType, entityId, status, avg);
  }

  private async upsertProgress(
    userId: string,
    entityType: (typeof PROGRESS_INCLUDE_ORDER)[number],
    entityId: string,
    status: ElProgressStatus,
    progressPercent: number,
  ) {
    await this.prisma.elLearningProgress.upsert({
      where: { userId_entityType_entityId: { userId, entityType, entityId } },
      create: { userId, entityType, entityId, status, progressPercent },
      update: { status, progressPercent },
    });
  }

  private async getProgressMap(
    userId: string,
    entityType: (typeof PROGRESS_INCLUDE_ORDER)[number],
    entityIds: string[],
  ) {
    if (entityIds.length === 0) return new Map();
    const rows = await this.prisma.elLearningProgress.findMany({
      where: { userId, entityType, entityId: { in: entityIds } },
    });
    return new Map(rows.map((r) => [r.entityId, r]));
  }

  async getCourseProgress(userId: string, courseSlug: string) {
    const course = await this.prisma.elCourse.findUnique({ where: { slug: courseSlug } });
    if (!course) throw new NotFoundException(`Course "${courseSlug}" not found`);
    const overview = await this.getCourseOverview(courseSlug, userId);
    const courseProgress = await this.prisma.elLearningProgress.findUnique({
      where: { userId_entityType_entityId: { userId, entityType: 'COURSE', entityId: course.id } },
    });
    const completedUnits = overview.units.filter(
      (u) => u.status === 'COMPLETED' || u.status === 'MASTERED',
    ).length;
    return {
      courseSlug,
      status: courseProgress?.status ?? 'NOT_STARTED',
      progressPercent: courseProgress?.progressPercent ?? 0,
      totalUnits: overview.units.length,
      completedUnits,
      units: overview.units.map((u) => ({
        slug: u.slug,
        title: u.title,
        status: u.status,
        progressPercent: u.progressPercent,
      })),
    };
  }

  // --- So loi sai: danh sach bai tap ma LAN TRA LOI GAN NHAT cua user la SAI
  // (khong phai moi lan sai tung xay ra - 1 cau da sua dung thi khong con
  // trong so nay, xem comment recomputeConcept). ---------------------------

  async listMistakes(userId: string, limit = 30) {
    const recentWrong = await this.prisma.elExerciseAttempt.findMany({
      where: { userId, isCorrect: false },
      orderBy: { attemptedAt: 'desc' },
      take: limit * 3, // lay du de loc trung Exercise (nhieu lan sai cung 1 cau).
      include: {
        exercise: { include: { concept: { include: { lesson: { include: { section: { include: { unit: true } } } } } } } },
      },
    });

    const seen = new Set<string>();
    const items: {
      attemptId: string;
      exerciseId: string;
      exercise: ReturnType<typeof toPublicExercise>;
      submittedAnswer: unknown;
      attemptedAt: Date;
      conceptTitle: string;
      unitTitle: string;
      unitSlug: string;
      stillWrong: boolean;
    }[] = [];
    for (const attempt of recentWrong) {
      if (seen.has(attempt.exerciseId)) continue;
      // Kiem tra day co phai lan tra loi GAN NHAT cho cau nay khong - neu sau
      // do da tra loi lai VA DUNG thi KHONG con la "loi hien tai" nua.
      const latest = await this.prisma.elExerciseAttempt.findFirst({
        where: { userId, exerciseId: attempt.exerciseId },
        orderBy: { attemptedAt: 'desc' },
        select: { isCorrect: true },
      });
      seen.add(attempt.exerciseId);
      if (latest?.isCorrect) continue; // da sua dung, bo khoi so loi.
      items.push({
        attemptId: attempt.id,
        exerciseId: attempt.exerciseId,
        exercise: toPublicExercise(attempt.exercise),
        submittedAnswer: attempt.submittedAnswer,
        attemptedAt: attempt.attemptedAt,
        conceptTitle: attempt.exercise.concept.title,
        unitTitle: attempt.exercise.concept.lesson.section.unit.title,
        unitSlug: attempt.exercise.concept.lesson.section.unit.slug,
        stillWrong: true,
      });
      if (items.length >= limit) break;
    }
    return items;
  }

  // --- Thu vien tu vung (/vocabulary) - FLAT TOAN BO ElVocabularyItem cua 1
  // Course, kem ten Unit/Concept de biet tu nay thuoc bai nao. ---------------

  async listVocabulary(courseSlug: string) {
    const course = await this.prisma.elCourse.findUnique({ where: { slug: courseSlug } });
    if (!course) throw new NotFoundException(`Course "${courseSlug}" not found`);
    const items = await this.prisma.elVocabularyItem.findMany({
      where: { concept: { lesson: { section: { unit: { courseId: course.id } } } } },
      orderBy: [{ concept: { lesson: { section: { unit: { sortOrder: 'asc' } } } } }, { sortOrder: 'asc' }],
      include: {
        concept: {
          include: { lesson: { include: { section: { include: { unit: true } } } } },
        },
      },
    });
    return items.map((v) => ({
      id: v.id,
      term: v.term,
      partOfSpeech: v.partOfSpeech,
      meaningVi: v.meaningVi,
      definitionEn: v.definitionEn,
      ipa: v.ipa,
      audioUrl: v.audioUrl,
      examples: v.examples,
      collocations: v.collocations,
      wordPatterns: v.wordPatterns,
      wordFamily: v.wordFamily,
      confusableTerms: v.confusableTerms,
      conceptTitle: v.concept.title,
      unitTitle: v.concept.lesson.section.unit.title,
      unitSlug: v.concept.lesson.section.unit.slug,
    }));
  }

  // --- Review: tron bai tu nhieu Unit, uu tien cau NGUOI DUNG DANG SAI trong
  // pham vi coveredUnitIds, bu them tu exerciseIds neu con thieu cho du so
  // luong - xem comment dau model ElReview (schema.prisma). -----------------

  async listReviews(courseSlug: string) {
    const course = await this.prisma.elCourse.findUnique({ where: { slug: courseSlug } });
    if (!course) throw new NotFoundException(`Course "${courseSlug}" not found`);
    const reviews = await this.prisma.elReview.findMany({
      where: { courseId: course.id },
      orderBy: { sortOrder: 'asc' },
    });
    return reviews.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      coveredUnitIds: r.coveredUnitIds,
      exerciseCount: r.exerciseIds.length,
    }));
  }

  async generateReviewSession(userId: string, reviewId: string) {
    const review = await this.prisma.elReview.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException(`Review ${reviewId} not found`);

    const candidateExercises = await this.prisma.elExercise.findMany({
      where: { id: { in: review.exerciseIds } },
    });
    const byId = new Map(candidateExercises.map((e) => [e.id, e]));

    // Uu tien cau dang SAI (lan gan nhat) trong chinh danh sach cua Review.
    const wrongLatest = await this.prisma.elExerciseAttempt.findMany({
      where: { userId, exerciseId: { in: review.exerciseIds } },
      orderBy: { attemptedAt: 'desc' },
      select: { exerciseId: true, isCorrect: true },
    });
    const latestByExercise = new Map<string, boolean>();
    for (const a of wrongLatest) {
      if (!latestByExercise.has(a.exerciseId)) latestByExercise.set(a.exerciseId, a.isCorrect);
    }
    const mistakeIds = review.exerciseIds.filter((id) => latestByExercise.get(id) === false);
    const restIds = review.exerciseIds.filter((id) => !mistakeIds.includes(id));

    const orderedIds = [...mistakeIds, ...restIds];
    const exercises = orderedIds.map((id) => byId.get(id)).filter((e): e is ElExercise => !!e);

    return {
      reviewId: review.id,
      title: review.title,
      exercises: exercises.map(toPublicExercise),
      mistakeCount: mistakeIds.length,
    };
  }
}
