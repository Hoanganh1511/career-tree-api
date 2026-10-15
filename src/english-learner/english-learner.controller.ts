import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EnglishLearnerService } from './english-learner.service';
import { CurrentUserId } from '../auth/current-user.decorator';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { CompleteSessionDto } from './dto/complete-session.dto';

@Controller('english-learner')
export class EnglishLearnerController {
  constructor(private englishLearnerService: EnglishLearnerService) {}

  @Get('today')
  getToday(@CurrentUserId() userId: string) {
    return this.englishLearnerService.getToday(userId);
  }

  @Post('sessions')
  startSession(@CurrentUserId() userId: string) {
    return this.englishLearnerService.startSession(userId);
  }

  @Post('sessions/:id/answers')
  submitAnswer(
    @CurrentUserId() userId: string,
    @Param('id') sessionId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.englishLearnerService.submitAnswer(userId, sessionId, dto);
  }

  @Post('sessions/:id/complete')
  completeSession(
    @CurrentUserId() userId: string,
    @Param('id') sessionId: string,
    @Body() dto: CompleteSessionDto,
  ) {
    return this.englishLearnerService.completeSession(userId, sessionId, dto);
  }
}
