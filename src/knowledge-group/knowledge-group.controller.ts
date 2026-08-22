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
import { KnowledgeGroupService } from './knowledge-group.service';
import { CreateKnowledgeGroupDto } from './dto/create-knowledge-group.dto';
import { UpdateKnowledgeGroupDto } from './dto/update-knowledge-group.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class KnowledgeGroupController {
  constructor(private groupService: KnowledgeGroupService) {}

  @Get('workspaces/:workspaceId/groups')
  findForWorkspace(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.groupService.findForWorkspace(userId, workspaceId);
  }

  @Post('workspaces/:workspaceId/groups')
  create(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateKnowledgeGroupDto,
  ) {
    return this.groupService.create(userId, workspaceId, dto);
  }

  @Patch('knowledge-groups/:id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeGroupDto,
  ) {
    return this.groupService.update(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('knowledge-groups/:id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.groupService.remove(userId, id);
  }

  @Get('knowledge-groups/:id/progress')
  getProgress(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.groupService.getProgress(userId, id);
  }

  @Get('knowledge-groups/journey')
  getJourney(@CurrentUserId() userId: string) {
    return this.groupService.getJourney(userId);
  }
}
