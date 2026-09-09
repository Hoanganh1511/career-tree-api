import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TrackingGoal,
  TrackingGoalStep,
  TrackingMilestone,
} from '../../../generated/prisma/client';
import { CreateTrackingGoalDto } from './dto/create-tracking-goal.dto';
import { UpdateTrackingGoalDto } from './dto/update-tracking-goal.dto';
import { CreateTrackingGoalStepDto } from './dto/create-tracking-goal-step.dto';
import { UpdateTrackingGoalStepDto } from './dto/update-tracking-goal-step.dto';
import { CreateTrackingMilestoneDto } from './dto/create-tracking-milestone.dto';
import { UpdateTrackingMilestoneDto } from './dto/update-tracking-milestone.dto';
import { UpsertTrackingSettingsDto } from './dto/upsert-tracking-settings.dto';

const DEFAULT_WEEKLY_AVAILABLE_HOURS = 20;

type MilestoneWithSteps = TrackingMilestone & { steps: TrackingGoalStep[] };
type GoalWithNested = TrackingGoal & {
  milestones: MilestoneWithSteps[];
  steps: TrackingGoalStep[]; // steps CHUA gan milestone (milestoneId null)
};

// Goal Compass - CRUD Goal -> Milestone -> Step (Action) long nhau, cung
// khuon voi diary.service.ts (assertXOwner throw NotFoundException thay vi
// Forbidden, tranh lo ton tai cho nguoi khong phai chu). Khong can
// AdminGuard - moi user tu quan ly goal cua chinh minh.
@Injectable()
export class TrackingGoalService {
  constructor(private prisma: PrismaService) {}

  private async assertGoalOwner(userId: string, goalId: string): Promise<TrackingGoal> {
    const goal = await this.prisma.trackingGoal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) {
      throw new NotFoundException(`TrackingGoal ${goalId} not found`);
    }
    return goal;
  }

  private async assertMilestoneOwner(
    userId: string,
    milestoneId: string,
  ): Promise<TrackingMilestone> {
    const milestone = await this.prisma.trackingMilestone.findUnique({
      where: { id: milestoneId },
      include: { goal: true },
    });
    if (!milestone || milestone.goal.userId !== userId) {
      throw new NotFoundException(`TrackingMilestone ${milestoneId} not found`);
    }
    return milestone;
  }

  private async assertStepOwner(userId: string, stepId: string): Promise<TrackingGoalStep> {
    const step = await this.prisma.trackingGoalStep.findUnique({
      where: { id: stepId },
      include: { goal: true },
    });
    if (!step || step.goal.userId !== userId) {
      throw new NotFoundException(`TrackingGoalStep ${stepId} not found`);
    }
    return step;
  }

  async list(userId: string) {
    const goals = await this.prisma.trackingGoal.findMany({
      where: { userId },
      include: {
        milestones: {
          orderBy: { orderIndex: 'asc' },
          include: { steps: { orderBy: { orderIndex: 'asc' } } },
        },
        // Step CHUA gan milestone (du lieu cu truoc khi co tang Milestone,
        // hoac nguoi dung co tinh khong gan) - xem TrackingGoalStep.milestoneId.
        steps: { where: { milestoneId: null }, orderBy: { orderIndex: 'asc' } },
      },
      orderBy: { targetDate: 'asc' },
    });
    return goals.map((g) => this.toApi(g));
  }

  async create(userId: string, dto: CreateTrackingGoalDto) {
    const goal = await this.prisma.trackingGoal.create({
      data: {
        userId,
        title: dto.title,
        category: dto.category,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        important: dto.important,
        controllable: dto.controllable,
        why: dto.why,
        estimatedHoursPerWeek: dto.estimatedHoursPerWeek,
      },
      include: { milestones: { include: { steps: true } }, steps: true },
    });
    return this.toApi(goal);
  }

  async update(userId: string, goalId: string, dto: UpdateTrackingGoalDto) {
    await this.assertGoalOwner(userId, goalId);
    const goal = await this.prisma.trackingGoal.update({
      where: { id: goalId },
      data: {
        title: dto.title,
        category: dto.category,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        important: dto.important,
        controllable: dto.controllable,
        why: dto.why,
        estimatedHoursPerWeek: dto.estimatedHoursPerWeek,
      },
      include: {
        milestones: {
          orderBy: { orderIndex: 'asc' },
          include: { steps: { orderBy: { orderIndex: 'asc' } } },
        },
        steps: { where: { milestoneId: null }, orderBy: { orderIndex: 'asc' } },
      },
    });
    return this.toApi(goal);
  }

  async remove(userId: string, goalId: string) {
    await this.assertGoalOwner(userId, goalId);
    // Cascade xoa het milestone + step ben trong qua onDelete: Cascade
    // trong schema.
    await this.prisma.trackingGoal.delete({ where: { id: goalId } });
  }

  async createMilestone(userId: string, goalId: string, dto: CreateTrackingMilestoneDto) {
    await this.assertGoalOwner(userId, goalId);
    const last = await this.prisma.trackingMilestone.findFirst({
      where: { goalId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const milestone = await this.prisma.trackingMilestone.create({
      data: { goalId, title: dto.title, orderIndex: (last?.orderIndex ?? -1) + 1 },
    });
    return this.milestoneToApi({ ...milestone, steps: [] });
  }

  async updateMilestone(userId: string, milestoneId: string, dto: UpdateTrackingMilestoneDto) {
    await this.assertMilestoneOwner(userId, milestoneId);
    const milestone = await this.prisma.trackingMilestone.update({
      where: { id: milestoneId },
      data: {
        title: dto.title,
        orderIndex: dto.orderIndex,
        weeklyGoalNote: dto.weeklyGoalNote,
      },
      include: { steps: { orderBy: { orderIndex: 'asc' } } },
    });
    return this.milestoneToApi(milestone);
  }

  async removeMilestone(userId: string, milestoneId: string) {
    await this.assertMilestoneOwner(userId, milestoneId);
    // Cascade xoa het step ben trong qua onDelete: Cascade trong schema.
    await this.prisma.trackingMilestone.delete({ where: { id: milestoneId } });
  }

  // Tao step TRUC TIEP duoi goal (khong qua milestone) - giu de tuong thich
  // nguoc, van dung khi nguoi dung chua can chia milestone.
  async createStep(userId: string, goalId: string, dto: CreateTrackingGoalStepDto) {
    await this.assertGoalOwner(userId, goalId);
    const last = await this.prisma.trackingGoalStep.findFirst({
      where: { goalId, milestoneId: null },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const step = await this.prisma.trackingGoalStep.create({
      data: {
        goalId,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedMinutes: dto.estimatedMinutes,
        orderIndex: (last?.orderIndex ?? -1) + 1,
      },
    });
    return this.stepToApi(step);
  }

  // Tao step DUOI 1 milestone cu the (Decompose stage - "De dat muc tieu
  // nay, nhung moc nao can hoan thanh?").
  async createStepUnderMilestone(
    userId: string,
    milestoneId: string,
    dto: CreateTrackingGoalStepDto,
  ) {
    const milestone = await this.assertMilestoneOwner(userId, milestoneId);
    const last = await this.prisma.trackingGoalStep.findFirst({
      where: { milestoneId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const step = await this.prisma.trackingGoalStep.create({
      data: {
        goalId: milestone.goalId,
        milestoneId,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedMinutes: dto.estimatedMinutes,
        orderIndex: (last?.orderIndex ?? -1) + 1,
      },
    });
    return this.stepToApi(step);
  }

  async updateStep(userId: string, stepId: string, dto: UpdateTrackingGoalStepDto) {
    await this.assertStepOwner(userId, stepId);
    const step = await this.prisma.trackingGoalStep.update({
      where: { id: stepId },
      data: {
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        done: dto.done,
        orderIndex: dto.orderIndex,
        estimatedMinutes: dto.estimatedMinutes,
      },
    });
    return this.stepToApi(step);
  }

  async removeStep(userId: string, stepId: string) {
    await this.assertStepOwner(userId, stepId);
    await this.prisma.trackingGoalStep.delete({ where: { id: stepId } });
  }

  // Reality Check - tong gio CAN (moi TrackingGoalStep chua xong, ke ca
  // trong milestone lan chua gan) so voi gio user tu khai bao la CO
  // (TrackingSettings.weeklyAvailableHours, mac dinh 20 neu chua tung cai
  // dat). Don gian hoa co chu dich: khong chia theo tung tuan cu the (can mo
  // hinh phan bo nhieu tuan phuc tap hon) - chi la 1 con so "dang treo" tong
  // quat, dung tinh than "canh bao qua tai" cua brief hon la lich tuan chi
  // tiet.
  async realityCheck(userId: string) {
    const steps = await this.prisma.trackingGoalStep.findMany({
      where: { goal: { userId }, done: false },
      select: { estimatedMinutes: true },
    });
    const neededMinutes = steps.reduce((sum, s) => sum + (s.estimatedMinutes ?? 0), 0);
    const neededHours = Math.round((neededMinutes / 60) * 10) / 10;
    const settings = await this.prisma.trackingSettings.findUnique({ where: { userId } });
    const availableHours = settings?.weeklyAvailableHours ?? DEFAULT_WEEKLY_AVAILABLE_HOURS;
    return {
      neededHours,
      availableHours,
      overloadHours: Math.max(0, Math.round((neededHours - availableHours) * 10) / 10),
    };
  }

  async upsertSettings(userId: string, dto: UpsertTrackingSettingsDto) {
    const settings = await this.prisma.trackingSettings.upsert({
      where: { userId },
      create: { userId, weeklyAvailableHours: dto.weeklyAvailableHours },
      update: { weeklyAvailableHours: dto.weeklyAvailableHours },
    });
    return { weeklyAvailableHours: settings.weeklyAvailableHours };
  }

  private toApi(goal: GoalWithNested) {
    return {
      id: goal.id,
      title: goal.title,
      category: goal.category,
      startDate: goal.startDate ? goal.startDate.toISOString().slice(0, 10) : null,
      targetDate: goal.targetDate ? goal.targetDate.toISOString().slice(0, 10) : null,
      important: goal.important,
      controllable: goal.controllable,
      why: goal.why,
      estimatedHoursPerWeek: goal.estimatedHoursPerWeek,
      milestones: goal.milestones.map((m) => this.milestoneToApi(m)),
      // Step CHUA gan milestone - FE gom vao nhom "Khac" cuoi card.
      steps: goal.steps.map((s) => this.stepToApi(s)),
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }

  // Tuan hien tai (Thu 2 -> CN, so theo ngay UTC vi dueDate luu @db.Date).
  private currentWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = today.getUTCDay(); // 0=CN .. 6=T7
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() + mondayOffset);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return { start, end };
  }

  private milestoneToApi(milestone: MilestoneWithSteps) {
    const { start, end } = this.currentWeekRange();
    const stepsThisWeek = milestone.steps.filter(
      (s) => s.dueDate && s.dueDate >= start && s.dueDate <= end,
    );
    const weeklyProgress =
      stepsThisWeek.length > 0
        ? { done: stepsThisWeek.filter((s) => s.done).length, total: stepsThisWeek.length }
        : null;
    return {
      id: milestone.id,
      goalId: milestone.goalId,
      title: milestone.title,
      orderIndex: milestone.orderIndex,
      weeklyGoalNote: milestone.weeklyGoalNote,
      weeklyProgress,
      steps: milestone.steps.map((s) => this.stepToApi(s)),
    };
  }

  private stepToApi(step: TrackingGoalStep) {
    return {
      id: step.id,
      goalId: step.goalId,
      milestoneId: step.milestoneId,
      title: step.title,
      dueDate: step.dueDate ? step.dueDate.toISOString().slice(0, 10) : null,
      done: step.done,
      orderIndex: step.orderIndex,
      estimatedMinutes: step.estimatedMinutes,
    };
  }
}
