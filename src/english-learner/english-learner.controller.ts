import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EnglishLearnerService } from './english-learner.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

// [2026-10-15] English Learner - toan bo route doi dang nhap (cung tinh than
// voi Planner/Tracking, KHONG @Public() nhu ContentSeries) vi MOI man hinh
// o day deu tron noi dung VOI tien do ca nhan (unit overview co progress
// percent, lesson co trang thai da hoc...) - JwtAuthGuard return true NGAY
// cho route @Public() ma KHONG gan req.userId du co Bearer token hop le (xem
// jwt-auth.guard.ts), nen "public nhung van hien tien do that neu dang
// nhap" KHONG kha thi voi co che guard hien tai ma khong sua file auth
// dung chung - don gian hoa bang cach doi dang nhap xuyen suot.
@Controller('english-learner/courses')
export class EnglishLearnerCourseController {
  constructor(private service: EnglishLearnerService) {}

  @Get()
  listCourses() {
    return this.service.listCourses();
  }

  @Get(':courseSlug')
  getCourseOverview(
    @CurrentUserId() userId: string,
    @Param('courseSlug') courseSlug: string,
  ) {
    return this.service.getCourseOverview(courseSlug, userId);
  }

  @Get(':courseSlug/units/:unitSlug')
  getUnitOverview(
    @CurrentUserId() userId: string,
    @Param('courseSlug') courseSlug: string,
    @Param('unitSlug') unitSlug: string,
  ) {
    return this.service.getUnitOverview(courseSlug, unitSlug, userId);
  }

  @Get(':courseSlug/units/:unitSlug/lessons/:lessonSlug')
  getLesson(
    @Param('courseSlug') courseSlug: string,
    @Param('unitSlug') unitSlug: string,
    @Param('lessonSlug') lessonSlug: string,
  ) {
    return this.service.getLesson(courseSlug, unitSlug, lessonSlug);
  }

  @Get(':courseSlug/units/:unitSlug/exercises')
  listUnitExercises(
    @Param('courseSlug') courseSlug: string,
    @Param('unitSlug') unitSlug: string,
  ) {
    return this.service.listUnitExercises(courseSlug, unitSlug);
  }

  @Get(':courseSlug/progress')
  getCourseProgress(
    @CurrentUserId() userId: string,
    @Param('courseSlug') courseSlug: string,
  ) {
    return this.service.getCourseProgress(userId, courseSlug);
  }

  @Get(':courseSlug/reviews')
  listReviews(@Param('courseSlug') courseSlug: string) {
    return this.service.listReviews(courseSlug);
  }

  @Get(':courseSlug/vocabulary')
  listVocabulary(@Param('courseSlug') courseSlug: string) {
    return this.service.listVocabulary(courseSlug);
  }
}

@Controller('english-learner/attempts')
export class EnglishLearnerAttemptController {
  constructor(private service: EnglishLearnerService) {}

  @Post()
  submit(@CurrentUserId() userId: string, @Body() dto: SubmitAttemptDto) {
    return this.service.submitAttempt(userId, dto);
  }
}

@Controller('english-learner/mistakes')
export class EnglishLearnerMistakeController {
  constructor(private service: EnglishLearnerService) {}

  @Get()
  list(@CurrentUserId() userId: string, @Query('limit') limit?: string) {
    return this.service.listMistakes(userId, limit ? Number(limit) : undefined);
  }
}

@Controller('english-learner/reviews')
export class EnglishLearnerReviewController {
  constructor(private service: EnglishLearnerService) {}

  @Post(':reviewId/session')
  generateSession(
    @CurrentUserId() userId: string,
    @Param('reviewId') reviewId: string,
  ) {
    return this.service.generateReviewSession(userId, reviewId);
  }
}
