import { Module } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { AiAssistantController } from './ai-assistant.controller';

@Module({
  providers: [AiAssistantService],
  controllers: [AiAssistantController],
})
export class AiAssistantModule {}
