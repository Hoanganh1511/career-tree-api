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
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Get('users/:username/workspaces')
  listByOwner(
    @CurrentUserId() userId: string,
    @Param('username') username: string,
  ) {
    return this.workspaceService.listByOwnerWithGroups(userId, username);
  }

  @Post('workspaces')
  create(@CurrentUserId() userId: string, @Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.create(userId, dto);
  }

  @Patch('workspaces/:id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspaceService.update(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('workspaces/:id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.workspaceService.remove(userId, id);
  }
}
