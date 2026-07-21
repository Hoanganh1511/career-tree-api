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

import { NodeService } from './node.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class NodeController {
  constructor(private nodeService: NodeService) {}

  @Get('workspaces/:workspaceId/nodes')
  findTree(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.nodeService.findTreeForWorkspace(userId, workspaceId);
  }

  @Get('workspaces/:workspaceId/nodes/:nodeId')
  findOne(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.nodeService.findOne(userId, workspaceId, nodeId);
  }

  @Post('workspaces/:workspaceId/nodes')
  create(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateNodeDto,
  ) {
    return this.nodeService.create(userId, workspaceId, dto);
  }
  @Patch('workspaces/:workspaceId/nodes/reset-layout')
  @HttpCode(HttpStatus.NO_CONTENT)
  resetLayout(
    @CurrentUserId() userId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.nodeService.resetLayout(userId, workspaceId);
  }

  @Patch('workspaces/:workspaceId/nodes/:nodeId')
  update(
    @CurrentUserId() userId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: UpdateNodeDto,
  ) {
    return this.nodeService.update(userId, nodeId, dto);
  }

  @Delete('workspaces/:workspaceId/nodes/:nodeId')
  remove(@CurrentUserId() userId: string, @Param('nodeId') nodeId: string) {
    return this.nodeService.remove(userId, nodeId);
  }
}
