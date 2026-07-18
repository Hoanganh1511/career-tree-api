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

@Controller()
export class CardController {
  constructor(private cardService: CardService) {}

  @Get('nodes/:nodeId/cards')
  findAll(
    @Param('nodeId') nodeId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cardService.findAllForNode(nodeId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }
  /* 
  Query string trên URL luôn là text, NestJS không tự ép kiểu number trừ khi bạn dùng parseIntPipe - ở đây làm tay cho đơn giản, k cần thêm pipe
  
  */

  @Post('nodes/:nodeId/cards')
  create(@Param('nodeId') nodeId: string, @Body() dto: CreateCardDto) {
    return this.cardService.create(nodeId, dto);
  }

  @Patch('cards/:cardId')
  update(@Param('cardId') cardId: string, @Body() dto: UpdateCardDto) {
    return this.cardService.update(cardId, dto);
  }

  @Delete('cards/:cardId')
  remove(@Param('cardId') cardId: string) {
    return this.cardService.remove(cardId);
  }
}
