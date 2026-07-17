import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private workspaceService: WorkspaceService) {}

  @Get()
  async findAll() {
    return this.workspaceService.findAll();
  }

  @Post()
  async create(@Body('name') name: string) {
    return this.workspaceService.create(name || 'My Career Tree');
  }

  @Get(':workspaceId')
  async findOne(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.findOne(workspaceId);
  }
}
