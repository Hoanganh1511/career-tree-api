import { Module } from '@nestjs/common';
import { EnglishLearnerService } from './english-learner.service';
import { EnglishLearnerController } from './english-learner.controller';

@Module({
  providers: [EnglishLearnerService],
  controllers: [EnglishLearnerController],
})
export class EnglishLearnerModule {}
