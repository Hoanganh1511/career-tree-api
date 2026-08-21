import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('conversations')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.chatService.listConversations(userId);
  }

  // Dat TRUOC ':id/...' o duoi - giu quy uoc route co ten cu the truoc route
  // co param (xem NotificationController).
  @Get('unread-count')
  unreadCount(@CurrentUserId() userId: string) {
    return this.chatService.unreadCount(userId);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateConversationDto) {
    return this.chatService.createOrGetConversation(userId, dto.username);
  }

  @Get(':id/messages')
  listMessages(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.listMessages(
      userId,
      id,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, id, dto);
  }

  @Post(':id/read')
  markRead(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.chatService.markRead(userId, id);
  }
}
