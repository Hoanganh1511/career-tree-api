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
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class ResourceController {
  constructor(private resourceService: ResourceService) {}

  @Get('nodes/:nodeId/resources')
  findAll(@CurrentUserId() userId: string, @Param('nodeId') nodeId: string) {
    return this.resourceService.findAllForNode(userId, nodeId);
  }

  @Post('nodes/:nodeId/resources')
  create(
    @CurrentUserId() userId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: CreateResourceDto,
  ) {
    return this.resourceService.create(userId, nodeId, dto);
  }

  @Patch('resources/:resourceId')
  update(
    @CurrentUserId() userId: string,
    @Param('resourceId') resourceId: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.resourceService.update(userId, resourceId, dto);
  }

  @Delete('resources/:resourceId')
  remove(
    @CurrentUserId() userId: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.resourceService.remove(userId, resourceId);
  }
}
