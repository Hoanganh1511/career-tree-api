import { Module } from '@nestjs/common';
import { ObjectiveService } from './objective.service';
import { ObjectiveController } from './objective.controller';

@Module({
  providers: [ObjectiveService],
  controllers: [ObjectiveController],
})
export class ObjectiveModule {}
