import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  EnglishConcept,
  EnglishConceptMastery,
  EnglishDailyCheckSession,
  EnglishDayType,
  EnglishKnowledgeStatus,
  EnglishMasteryLevel,
  EnglishQuestion,
  EnglishQuestionType,
  EnglishResultStatus,
  EnglishSessionStatus,
  EnglishUnitStatus,
} from '../../generated/prisma/client';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';

// [2026-10-15] Daily English Learning Tracker - Phase 1 MVP. Xem banner day
// du trong schema.prisma (model EnglishDailyCheckSession) ve cac don gian
// hoa CHOT so voi spec goc (khong co spaced-repetition D+N day du, D2 dung
// lai 3 loai cau hoi cua D1 thay vi Recall/Production).

export interface EnglishOptionApi {
  id: string;
  text: string;
}

export interface EnglishPublicQuestionApi {
  id: string;
  unit: number;
  conceptTags: string[];
  questionType: string;
  difficulty: string;
  stem: string;
  options: EnglishOptionApi[];
  minTimeSeconds: number;
  timeLimitSeconds: number;
  isRetentionQuestion: boolean;
}

export interface EnglishSessionApi {
  id: string;
  unit: number;
  dayType: string;
  status: string;
  isFirstAttempt: boolean;
  startedAt: string;
  questions: EnglishPublicQuestionApi[];
}

export interface EnglishAnswerResultApi {
  isCorrect: boolean;
  belowMinTime: boolean;
  correctOptionId: string;
  explanation: string;
  distractorExplanations: Record<string, string>;
}

export interface EnglishCompleteResultApi {
  resultStatus: string;
  flagSuspicious: boolean;
  recommendation: string;
}

export interface EnglishTodayApi {
  unit: number;
  dayType: string;
  alreadyCompletedFirstAttemptToday: boolean;
  microSummary: string | null;
  assessmentCurrentStreak: number;
  learningCurrentStreak: number;
}

interface RawOption {
  id: string;
  text: string;
  errorType: string | null;
}

// Ty le cau hoi "new learning" cho 1 Unit (D1 VA D2 - xem banner schema.prisma
// ve viec D2 dung lai dung 3 loai nay thay vi Recall/Production).
const NEW_LEARNING_COUNTS: Record<EnglishQuestionType, number> = {
  RECOGNITION: 2,
  APPLICATION: 2,
  ERROR_DETECTION: 1,
};
const MAX_RETENTION_QUESTIONS = 3;
// <50% so cau tra loi -> no_assessment (section 7 cua spec).
const MIN_COMPLETION_RATIO = 0.5;
// >=50% sai (new-learning + retention) -> needs_reinforcement.
const NEEDS_REINFORCEMENT_WRONG_RATIO = 0.5;
// Toc do toi thieu hop ly - duoi muc nay (giay/cau) la bat thuong (section 2
// "Hoan thanh 8 cau duoi 30 giay -> flag bat thuong").
const MIN_SECONDS_PER_QUESTION = 3;

function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

@Injectable()
export class EnglishLearnerService {
  constructor(private prisma: PrismaService) {}

  private async assertOwnerSession(
    userId: string,
    sessionId: string,
  ): Promise<EnglishDailyCheckSession> {
    const session = await this.prisma.englishDailyCheckSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) {
      throw new NotFoundException(`Session ${sessionId} không tồn tại`);
    }
    return session;
  }

  private toPublicQuestion(
    q: EnglishQuestion,
    isRetentionQuestion: boolean,
  ): EnglishPublicQuestionApi {
    const options = (q.options as unknown as RawOption[]).map((o) => ({
      id: o.id,
      text: o.text,
    }));
    return {
      id: q.id,
      unit: q.unit,
      conceptTags: q.conceptTags,
      questionType: q.questionType,
      difficulty: q.difficulty,
      stem: q.stem,
      options,
      minTimeSeconds: q.minTimeSeconds,
      timeLimitSeconds: q.timeLimitSeconds,
      isRetentionQuestion,
    };
  }

  // -------------------------------------------------------------------------
  // GET /english-learner/today
  // -------------------------------------------------------------------------
  async getToday(userId: string): Promise<EnglishTodayApi> {
    const { unit, dayType } = await this.determineCurrentUnitAndDayType(userId);
    const today = startOfDay();

    const todaySession = await this.prisma.englishDailyCheckSession.findFirst({
      where: { userId, date: today, isFirstAttempt: true, status: 'COMPLETED' },
    });

    const yesterdayRecords = await this.prisma.englishKnowledgeRecord.findMany({
      where: { userId, date: addDays(today, -1), status: 'VERIFIED' },
    });
    let microSummary: string | null = null;
    if (yesterdayRecords.length > 0) {
      const concepts = await this.prisma.englishConcept.findMany({
        where: { id: { in: yesterdayRecords.map((r) => r.conceptId) } },
      });
      microSummary = `Hôm qua bạn đã xác minh được: ${concepts.map((c) => c.name).join(', ')}. Hôm nay hệ thống sẽ kiểm tra lại.`;
    }

    const streak = await this.prisma.englishDailyStreak.findUnique({ where: { userId } });

    return {
      unit,
      dayType,
      alreadyCompletedFirstAttemptToday: !!todaySession,
      microSummary,
      assessmentCurrentStreak: streak?.assessmentCurrentStreak ?? 0,
      learningCurrentStreak: streak?.learningCurrentStreak ?? 0,
    };
  }

  // Unit/dayType hom nay cua user - xem UnitProgress.status: NOT_STARTED -> D1,
  // D1_DONE -> D2, D2_DONE -> chuyen qua Unit tiep theo (tao row moi NOT_STARTED).
  private async determineCurrentUnitAndDayType(
    userId: string,
  ): Promise<{ unit: number; dayType: EnglishDayType }> {
    const rows = await this.prisma.englishUnitProgress.findMany({
      where: { userId },
      orderBy: { unit: 'asc' },
    });
    const pending = rows.find((r) => r.status !== 'D2_DONE');
    if (pending) {
      return {
        unit: pending.unit,
        dayType: pending.status === 'NOT_STARTED' ? 'D1' : 'D2',
      };
    }
    const nextUnit = rows.length > 0 ? Math.max(...rows.map((r) => r.unit)) + 1 : 1;
    await this.prisma.englishUnitProgress.create({
      data: { userId, unit: nextUnit, status: 'NOT_STARTED' },
    });
    return { unit: nextUnit, dayType: 'D1' };
  }

  // -------------------------------------------------------------------------
  // POST /english-learner/sessions
  // -------------------------------------------------------------------------
  async startSession(userId: string): Promise<EnglishSessionApi> {
    const { unit, dayType } = await this.determineCurrentUnitAndDayType(userId);
    const today = startOfDay();

    const inProgress = await this.prisma.englishDailyCheckSession.findFirst({
      where: { userId, date: today, unit, dayType, status: 'IN_PROGRESS' },
    });
    if (inProgress) {
      return this.toSessionApi(inProgress);
    }

    const bank = await this.prisma.englishQuestion.findMany({ where: { unit } });
    if (bank.length === 0) {
      throw new BadRequestException(`Chưa có nội dung cho Unit ${unit}`);
    }

    const newLearning = await this.selectNewLearningQuestions(userId, unit, bank);
    const retention = await this.selectRetentionQuestions(
      userId,
      unit,
      newLearning.map((q) => q.id),
    );

    const attemptsToday = await this.prisma.englishDailyCheckSession.count({
      where: { userId, date: today, unit, dayType },
    });

    const session = await this.prisma.englishDailyCheckSession.create({
      data: {
        userId,
        date: today,
        unit,
        dayType,
        questionIds: [...newLearning, ...retention].map((q) => q.id),
        retentionQuestionIds: retention.map((q) => q.id),
        status: 'IN_PROGRESS',
        isFirstAttempt: attemptsToday === 0,
      },
    });

    return this.toSessionApi(session);
  }

  private async toSessionApi(session: EnglishDailyCheckSession): Promise<EnglishSessionApi> {
    const questions = await this.prisma.englishQuestion.findMany({
      where: { id: { in: session.questionIds } },
    });
    const byId = new Map(questions.map((q) => [q.id, q]));
    const retentionSet = new Set(session.retentionQuestionIds);
    return {
      id: session.id,
      unit: session.unit,
      dayType: session.dayType,
      status: session.status,
      isFirstAttempt: session.isFirstAttempt,
      startedAt: session.startedAt.toISOString(),
      questions: session.questionIds
        .map((id) => byId.get(id))
        .filter((q): q is EnglishQuestion => !!q)
        .map((q) => this.toPublicQuestion(q, retentionSet.has(q.id))),
    };
  }

  private async selectNewLearningQuestions(
    userId: string,
    unit: number,
    bank: EnglishQuestion[],
  ): Promise<EnglishQuestion[]> {
    const bankIds = bank.map((q) => q.id);
    const askedRows = await this.prisma.englishDailyAnswer.findMany({
      where: { userId, questionId: { in: bankIds }, isRetentionQuestion: false },
      select: { questionId: true },
    });
    const askedIds = new Set(askedRows.map((r) => r.questionId));

    const pick = (type: EnglishQuestionType, count: number): EnglishQuestion[] => {
      const ofType = bank.filter((q) => q.questionType === type);
      const unseen = ofType.filter((q) => !askedIds.has(q.id));
      // Het cau chua hoi -> cho phep hoi lai (khong chan nguoi dung lai, chi
      // uu tien cau moi truoc).
      const pool = unseen.length >= count ? unseen : ofType;
      return pool.slice(0, count);
    };

    return [
      ...pick('RECOGNITION', NEW_LEARNING_COUNTS.RECOGNITION),
      ...pick('APPLICATION', NEW_LEARNING_COUNTS.APPLICATION),
      ...pick('ERROR_DETECTION', NEW_LEARNING_COUNTS.ERROR_DETECTION),
    ];
  }

  private async selectRetentionQuestions(
    userId: string,
    maxUnit: number,
    excludeQuestionIds: string[],
  ): Promise<EnglishQuestion[]> {
    const masteries = await this.prisma.englishConceptMastery.findMany({
      where: { userId },
      orderBy: [{ lastReviewedAt: 'asc' }],
    });
    if (masteries.length === 0) return [];

    const concepts = await this.prisma.englishConcept.findMany({
      where: { id: { in: masteries.map((m) => m.conceptId) }, unit: { lte: maxUnit } },
    });
    const conceptById = new Map(concepts.map((c) => [c.id, c]));
    const usedIds = new Set(excludeQuestionIds);
    const picked: EnglishQuestion[] = [];

    for (const m of masteries) {
      if (picked.length >= MAX_RETENTION_QUESTIONS) break;
      const concept = conceptById.get(m.conceptId);
      if (!concept) continue;
      const candidates = await this.prisma.englishQuestion.findMany({
        where: { unit: concept.unit, conceptTags: { has: concept.name } },
      });
      const unused = candidates.find((c) => !usedIds.has(c.id));
      if (!unused) continue;
      picked.push(unused);
      usedIds.add(unused.id);
    }
    return picked;
  }

  // -------------------------------------------------------------------------
  // POST /english-learner/sessions/:id/answers
  // -------------------------------------------------------------------------
  async submitAnswer(
    userId: string,
    sessionId: string,
    dto: SubmitAnswerDto,
  ): Promise<EnglishAnswerResultApi> {
    const session = await this.assertOwnerSession(userId, sessionId);
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Session đã kết thúc');
    }
    if (!session.questionIds.includes(dto.questionId)) {
      throw new BadRequestException('Câu hỏi không thuộc session này');
    }
    const question = await this.prisma.englishQuestion.findUnique({
      where: { id: dto.questionId },
    });
    if (!question) {
      throw new NotFoundException(`Question ${dto.questionId} không tồn tại`);
    }

    const isCorrect = dto.selectedOptionId === question.correctOptionId;
    const belowMinTime = dto.timeSpentSeconds < question.minTimeSeconds;
    const isRetentionQuestion = session.retentionQuestionIds.includes(dto.questionId);

    const priorAttempts = await this.prisma.englishDailyAnswer.count({
      where: { userId, questionId: dto.questionId },
    });

    await this.prisma.englishDailyAnswer.create({
      data: {
        sessionId,
        questionId: dto.questionId,
        userId,
        selectedOptionId: dto.selectedOptionId,
        isCorrect,
        timeSpentSeconds: dto.timeSpentSeconds,
        belowMinTime,
        isRetentionQuestion,
        attemptNumber: priorAttempts + 1,
      },
    });

    if (belowMinTime && !session.flagSuspicious) {
      await this.prisma.englishDailyCheckSession.update({
        where: { id: sessionId },
        data: { flagSuspicious: true },
      });
    }

    const distractorExplanations = question.distractorExplanations as Record<string, string>;
    return {
      isCorrect,
      belowMinTime,
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
      distractorExplanations,
    };
  }

  // -------------------------------------------------------------------------
  // POST /english-learner/sessions/:id/complete
  // -------------------------------------------------------------------------
  async completeSession(
    userId: string,
    sessionId: string,
    dto: CompleteSessionDto,
  ): Promise<EnglishCompleteResultApi> {
    const session = await this.assertOwnerSession(userId, sessionId);
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Session đã kết thúc');
    }

    const answers = await this.prisma.englishDailyAnswer.findMany({ where: { sessionId } });
    const totalQuestions = session.questionIds.length;
    const completionRatio = totalQuestions === 0 ? 0 : answers.length / totalQuestions;

    let flagSuspicious =
      session.flagSuspicious || dto.totalTimeSeconds < totalQuestions * MIN_SECONDS_PER_QUESTION;

    if (completionRatio < MIN_COMPLETION_RATIO) {
      await this.prisma.englishDailyCheckSession.update({
        where: { id: sessionId },
        data: {
          status: 'NO_ASSESSMENT',
          resultStatus: 'NO_ASSESSMENT',
          completedAt: new Date(),
          totalTimeSeconds: dto.totalTimeSeconds,
          flagSuspicious,
        },
      });
      return {
        resultStatus: 'NO_ASSESSMENT',
        flagSuspicious,
        recommendation: 'Bạn chưa hoàn thành đủ số câu để ghi nhận kết quả hôm nay.',
      };
    }

    const resultStatus = await this.computeResultStatus(userId, session, answers);

    await this.prisma.englishDailyCheckSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        resultStatus,
        completedAt: new Date(),
        totalTimeSeconds: dto.totalTimeSeconds,
        flagSuspicious,
      },
    });

    if (session.isFirstAttempt) {
      await this.applyFirstAttemptSideEffects(userId, session, resultStatus);
    }

    return {
      resultStatus,
      flagSuspicious,
      recommendation: this.recommendationFor(resultStatus),
    };
  }

  private async computeResultStatus(
    userId: string,
    session: EnglishDailyCheckSession,
    answers: { questionId: string; isCorrect: boolean; belowMinTime: boolean; isRetentionQuestion: boolean }[],
  ): Promise<EnglishResultStatus> {
    const totalQuestions = session.questionIds.length;
    const wrongCount = totalQuestions - answers.filter((a) => a.isCorrect).length;
    if (totalQuestions > 0 && wrongCount / totalQuestions >= NEEDS_REINFORCEMENT_WRONG_RATIO) {
      return 'NEEDS_REINFORCEMENT';
    }

    const newLearningAnswers = answers.filter((a) => !a.isRetentionQuestion);
    const newLearningQuestionIds = session.questionIds.filter(
      (id) => !session.retentionQuestionIds.includes(id),
    );
    if (newLearningAnswers.length < newLearningQuestionIds.length) {
      // Thieu cau new-learning (bo cuoc giua chung, nhung van >=50% tong the)
      // -> khong du du lieu de noi "verified", coi nhu developing.
      return 'NEW_KNOWLEDGE_DEVELOPING';
    }

    const questions = await this.prisma.englishQuestion.findMany({
      where: { id: { in: newLearningAnswers.map((a) => a.questionId) } },
    });
    const questionById = new Map(questions.map((q) => [q.id, q]));

    const allNewCorrect = newLearningAnswers.every((a) => a.isCorrect);
    const passedApplicationOrError = newLearningAnswers.some((a) => {
      const q = questionById.get(a.questionId);
      return (
        a.isCorrect &&
        !a.belowMinTime &&
        (q?.questionType === 'APPLICATION' || q?.questionType === 'ERROR_DETECTION')
      );
    });

    const conceptNames = Array.from(
      new Set(questions.flatMap((q) => q.conceptTags)),
    );
    const concepts = await this.prisma.englishConcept.findMany({
      where: { unit: session.unit, name: { in: conceptNames } },
    });
    const masteries = await this.prisma.englishConceptMastery.findMany({
      where: { userId, conceptId: { in: concepts.map((c) => c.id) } },
    });
    const masteryByConceptId = new Map(masteries.map((m) => [m.conceptId, m]));
    const alreadyAppliedBeforeToday =
      concepts.length > 0 &&
      concepts.every((c) => masteryByConceptId.get(c.id)?.masteryLevel === 'APPLIED');

    if (allNewCorrect && passedApplicationOrError && !alreadyAppliedBeforeToday) {
      return 'NEW_KNOWLEDGE_VERIFIED';
    }
    if (alreadyAppliedBeforeToday && allNewCorrect) {
      return 'REVIEW_ONLY';
    }
    return 'NEW_KNOWLEDGE_DEVELOPING';
  }

  private recommendationFor(resultStatus: EnglishResultStatus): string {
    switch (resultStatus) {
      case 'NEW_KNOWLEDGE_VERIFIED':
        return 'Kiến thức này sẽ được kiểm tra lại sau vài ngày.';
      case 'NEW_KNOWLEDGE_DEVELOPING':
        return 'Bạn nhận diện đúng nhưng chưa vận dụng được. Hãy xem lại phần ngữ pháp/từ vựng của Unit này.';
      case 'REVIEW_ONLY':
        return 'Có củng cố, chưa xác nhận học mới.';
      case 'NEEDS_REINFORCEMENT':
        return 'Bạn cần xem lại Unit này. Hãy ôn lại trước khi làm bài tiếp theo.';
      default:
        return 'Bạn chưa hoàn thành đủ số câu để ghi nhận kết quả hôm nay.';
    }
  }

  private async applyFirstAttemptSideEffects(
    userId: string,
    session: EnglishDailyCheckSession,
    resultStatus: EnglishResultStatus,
  ): Promise<void> {
    const answers = await this.prisma.englishDailyAnswer.findMany({ where: { sessionId: session.id } });
    const questions = await this.prisma.englishQuestion.findMany({
      where: { id: { in: answers.map((a) => a.questionId) } },
    });
    const questionById = new Map(questions.map((q) => [q.id, q]));

    const conceptNames = Array.from(new Set(questions.flatMap((q) => q.conceptTags)));
    const concepts = await this.prisma.englishConcept.findMany({
      where: { name: { in: conceptNames } },
    });
    const conceptByName = new Map(concepts.map((c) => [c.name, c]));

    const knowledgeStatus: EnglishKnowledgeStatus | null =
      resultStatus === 'NEW_KNOWLEDGE_VERIFIED' || resultStatus === 'REVIEW_ONLY'
        ? 'VERIFIED'
        : resultStatus === 'NEW_KNOWLEDGE_DEVELOPING'
          ? 'DEVELOPING'
          : resultStatus === 'NEEDS_REINFORCEMENT'
            ? 'NEEDS_REINFORCEMENT'
            : null;

    const nextMasteryLevel: EnglishMasteryLevel | null =
      resultStatus === 'NEW_KNOWLEDGE_VERIFIED'
        ? 'APPLIED'
        : resultStatus === 'NEW_KNOWLEDGE_DEVELOPING'
          ? 'RECOGNIZED'
          : null;

    for (const concept of concepts) {
      const conceptAnswers = answers.filter((a) => {
        const q = questionById.get(a.questionId);
        return q?.conceptTags.includes(concept.name);
      });
      if (conceptAnswers.length === 0) continue;

      const existing = await this.prisma.englishConceptMastery.findUnique({
        where: { userId_conceptId: { userId, conceptId: concept.id } },
      });
      const correctCount = conceptAnswers.filter((a) => a.isCorrect).length;

      await this.prisma.englishConceptMastery.upsert({
        where: { userId_conceptId: { userId, conceptId: concept.id } },
        create: {
          userId,
          conceptId: concept.id,
          masteryLevel: nextMasteryLevel ?? 'NEW',
          totalAttempts: conceptAnswers.length,
          correctAttempts: correctCount,
          lastReviewedAt: new Date(),
        },
        update: {
          masteryLevel: this.bumpMastery(existing?.masteryLevel, nextMasteryLevel),
          totalAttempts: { increment: conceptAnswers.length },
          correctAttempts: { increment: correctCount },
          lastReviewedAt: new Date(),
        },
      });

      if (knowledgeStatus) {
        await this.prisma.englishKnowledgeRecord.create({
          data: { userId, conceptId: concept.id, date: session.date, status: knowledgeStatus },
        });
      }
    }

    await this.advanceUnitProgress(userId, session, resultStatus);
    await this.updateStreaks(userId, session.date, resultStatus);
  }

  // Khong ha cap masteryLevel - chi tien len (NEW -> RECOGNIZED -> APPLIED).
  private bumpMastery(
    current: EnglishMasteryLevel | undefined,
    next: EnglishMasteryLevel | null,
  ): EnglishMasteryLevel {
    const rank: Record<EnglishMasteryLevel, number> = { NEW: 0, RECOGNIZED: 1, APPLIED: 2 };
    const currentLevel = current ?? 'NEW';
    if (!next) return currentLevel;
    return rank[next] > rank[currentLevel] ? next : currentLevel;
  }

  private async advanceUnitProgress(
    userId: string,
    session: EnglishDailyCheckSession,
    resultStatus: EnglishResultStatus,
  ): Promise<void> {
    const status: EnglishUnitStatus = session.dayType === 'D1' ? 'D1_DONE' : 'D2_DONE';
    const data =
      session.dayType === 'D1'
        ? { status, d1Date: session.date, d1Result: resultStatus }
        : { status, d2Date: session.date, d2Result: resultStatus };
    await this.prisma.englishUnitProgress.update({
      where: { userId_unit: { userId, unit: session.unit } },
      data,
    });
  }

  private async updateStreaks(
    userId: string,
    date: Date,
    resultStatus: EnglishResultStatus,
  ): Promise<void> {
    const streak = await this.prisma.englishDailyStreak.findUnique({ where: { userId } });
    const yesterday = addDays(date, -1);

    const nextAssessmentCurrent =
      streak?.assessmentLastDate && isSameDay(streak.assessmentLastDate, yesterday)
        ? streak.assessmentCurrentStreak + 1
        : 1;
    const nextAssessmentLongest = Math.max(streak?.assessmentLongestStreak ?? 0, nextAssessmentCurrent);

    let nextLearningCurrent = streak?.learningCurrentStreak ?? 0;
    let nextLearningLongest = streak?.learningLongestStreak ?? 0;
    let learningLastDate = streak?.learningLastDate ?? null;
    if (resultStatus === 'NEW_KNOWLEDGE_VERIFIED') {
      nextLearningCurrent =
        streak?.learningLastDate && isSameDay(streak.learningLastDate, yesterday)
          ? nextLearningCurrent + 1
          : 1;
      nextLearningLongest = Math.max(nextLearningLongest, nextLearningCurrent);
      learningLastDate = date;
    }

    await this.prisma.englishDailyStreak.upsert({
      where: { userId },
      create: {
        userId,
        assessmentCurrentStreak: nextAssessmentCurrent,
        assessmentLongestStreak: nextAssessmentLongest,
        assessmentLastDate: date,
        learningCurrentStreak: nextLearningCurrent,
        learningLongestStreak: nextLearningLongest,
        learningLastDate,
      },
      update: {
        assessmentCurrentStreak: nextAssessmentCurrent,
        assessmentLongestStreak: nextAssessmentLongest,
        assessmentLastDate: date,
        learningCurrentStreak: nextLearningCurrent,
        learningLongestStreak: nextLearningLongest,
        learningLastDate,
      },
    });
  }
}
