import { Module } from '@nestjs/common';
import { EnglishLearnerService } from './english-learner.service';
import {
  EnglishLearnerCourseController,
  EnglishLearnerAttemptController,
  EnglishLearnerMistakeController,
  EnglishLearnerReviewController,
} from './english-learner.controller';

@Module({
  providers: [EnglishLearnerService],
  controllers: [
    EnglishLearnerCourseController,
    EnglishLearnerAttemptController,
    EnglishLearnerMistakeController,
    EnglishLearnerReviewController,
  ],
})
export class EnglishLearnerModule {}
