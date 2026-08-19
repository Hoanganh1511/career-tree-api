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
import { ObjectiveService } from './objective.service';
import { CreateObjectiveDto } from './dto/create-objective.dto';
import { UpdateObjectiveDto } from './dto/update-objective.dto';
import { CreateObjectiveItemDto } from './dto/create-objective-item.dto';
import { UpdateObjectiveItemDto } from './dto/update-objective-item.dto';
import { UpdateObjectiveItemStatusDto } from './dto/update-objective-item-status.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class ObjectiveController {
  constructor(private objectiveService: ObjectiveService) {}

  @Get('knowledge-groups/:groupId/objectives')
  list(@CurrentUserId() userId: string, @Param('groupId') groupId: string) {
    return this.objectiveService.list(userId, groupId);
  }

  @Post('knowledge-groups/:groupId/objectives')
  create(
    @CurrentUserId() userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: CreateObjectiveDto,
  ) {
    return this.objectiveService.create(userId, groupId, dto);
  }

  @Patch('objectives/:id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateObjectiveDto,
  ) {
    return this.objectiveService.update(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('objectives/:id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.objectiveService.remove(userId, id);
  }

  @Post('objectives/:id/items')
  addItem(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: CreateObjectiveItemDto,
  ) {
    return this.objectiveService.addItem(userId, id, dto);
  }

  @Patch('objective-items/:id')
  updateItem(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateObjectiveItemDto,
  ) {
    return this.objectiveService.updateItem(userId, id, dto);
  }

  @Patch('objective-items/:id/status')
  updateItemStatus(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateObjectiveItemStatusDto,
  ) {
    return this.objectiveService.updateItemStatus(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('objective-items/:id')
  removeItem(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.objectiveService.removeItem(userId, id);
  }
}
