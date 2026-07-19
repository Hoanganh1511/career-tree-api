import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ResourceService } from './resource.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Controller()
export class ResourceController {
  constructor(private resourceService: ResourceService) {}

  @Get('nodes/:nodeId/resources')
  findAll(@Param('nodeId') nodeId: string) {
    return this.resourceService.findAllForNode(nodeId);
  }

  @Post('nodes/:nodeId/resources')
  create(@Param('nodeId') nodeId: string, @Body() dto: CreateResourceDto) {
    return this.resourceService.create(nodeId, dto);
  }
  @Patch('resources/:resourceId')
  update(
    @Param('resourceId') resourceId: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.resourceService.update(resourceId, dto);
  }
  @Delete('resources/:resourceId')
  remove(@Param('resourceId') resourceId: string) {
    return this.resourceService.remove(resourceId);
  }
}
