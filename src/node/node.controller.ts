import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { NodeService } from './node.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';

@Controller()
export class NodeController {
  constructor(private nodeService: NodeService) {}

  @Get('workspaces/:workspaceId/nodes')
  findTree(@Param('workspaceId') workspaceId: string) {
    return this.nodeService.findTreeForWorkspace(workspaceId);
  }

  @Post('workspaces/:workspaceId/nodes')
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateNodeDto,
  ) {
    return this.nodeService.create(workspaceId, dto);
  }

  @Patch('workspaces/:workspaceId/nodes/:nodeId')
  update(@Param('nodeId') nodeId: string, @Body() dto: UpdateNodeDto) {
    return this.nodeService.update(nodeId, dto);
  }

  @Delete('workspaces/:workspaceId/nodes/:nodeId')
  remove(@Param('nodeId') nodeId: string) {
    return this.nodeService.remove(nodeId);
  }
}
