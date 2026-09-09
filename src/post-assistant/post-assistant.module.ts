import { Module } from '@nestjs/common';
import { PostAssistantService } from './post-assistant.service';
import { PostAssistantController } from './post-assistant.controller';

@Module({
  providers: [PostAssistantService],
  controllers: [PostAssistantController],
})
export class PostAssistantModule {}
