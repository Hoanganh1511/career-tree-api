import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CardService } from './card.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class CardController {
  constructor(private cardService: CardService) {}

  @Get('nodes/:nodeId/cards')
  findAll(
    @CurrentUserId() userId: string,
    @Param('nodeId') nodeId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cardService.findAllForNode(userId, nodeId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post('nodes/:nodeId/cards')
  create(
    @CurrentUserId() userId: string,
    @Param('nodeId') nodeId: string,
    @Body() dto: CreateCardDto,
  ) {
    return this.cardService.create(userId, nodeId, dto);
  }

  @Patch('cards/:cardId')
  update(
    @CurrentUserId() userId: string,
    @Param('cardId') cardId: string,
    @Body() dto: UpdateCardDto,
  ) {
    return this.cardService.update(userId, cardId, dto);
  }

  @Delete('cards/:cardId')
  remove(@CurrentUserId() userId: string, @Param('cardId') cardId: string) {
    return this.cardService.remove(userId, cardId);
  }
}
