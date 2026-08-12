import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { KnowledgeGroupCollaboratorService } from './knowledge-group-collaborator.service';
import { RequestCollabDto } from './dto/request-collab.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('knowledge-groups/:groupId')
export class KnowledgeGroupCollaboratorController {
  constructor(private collabService: KnowledgeGroupCollaboratorService) {}

  @Post('collab')
  requestCollab(
    @CurrentUserId() userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: RequestCollabDto,
  ) {
    return this.collabService.requestCollab(userId, groupId, dto.reason);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('collab')
  leave(@CurrentUserId() userId: string, @Param('groupId') groupId: string) {
    return this.collabService.leave(userId, groupId);
  }

  @Get('collaborators')
  listCollaborators(
    @CurrentUserId() userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.collabService.listCollaborators(userId, groupId);
  }

  @Patch('collaborators/:collabId/approve')
  approve(
    @CurrentUserId() userId: string,
    @Param('groupId') groupId: string,
    @Param('collabId') collabId: string,
  ) {
    return this.collabService.approve(userId, groupId, collabId);
  }

  @Patch('collaborators/:collabId/reject')
  reject(
    @CurrentUserId() userId: string,
    @Param('groupId') groupId: string,
    @Param('collabId') collabId: string,
  ) {
    return this.collabService.reject(userId, groupId, collabId);
  }
}
