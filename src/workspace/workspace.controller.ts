import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Get()
  findAll(@CurrentUserId() userId: string) {
    return this.workspaceService.findAll(userId);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(userId, dto.name || 'My Career Tree');
  }

  @Get(':workspaceId')
  findOne(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.workspaceService.findOne(userId, workspaceId);
  }
}
