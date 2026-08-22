import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatSearchService } from './chat-search.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateConversationSettingsDto } from './dto/update-conversation-settings.dto';
import { SearchMessagesQueryDto } from './dto/search-messages-query.dto';
import { MessageContextQueryDto } from './dto/message-context-query.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('conversations')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatSearchService: ChatSearchService,
  ) {}

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

  // Full-text search - toan bo hoi thoai nguoi dung tham gia, hoac 1 hoi
  // thoai neu truyen conversationId trong query (dung cho ca popup search
  // trong 1 hoi thoai dang mo lan trang "xem tat ca ket qua"). Xem
  // docs/chat-search-architecture.md.
  @Get('messages/search')
  searchAllMessages(
    @CurrentUserId() userId: string,
    @Query() query: SearchMessagesQueryDto,
  ) {
    return this.chatSearchService.search(userId, query);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateConversationDto) {
    return this.chatService.createOrGetConversation(userId, dto.username);
  }

  @Post('group')
  createGroup(
    @CurrentUserId() userId: string,
    @Body() dto: CreateGroupConversationDto,
  ) {
    return this.chatService.createGroupConversation(userId, dto);
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

  @Post(':id/messages/:messageId/recall')
  recallMessage(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.recallMessage(userId, id, messageId);
  }

  // "Nhay toi" 1 ket qua tim kiem - tra N tin nhan truoc/sau messageId de FE
  // co du du lieu render ngay tai vi tri do trong khung chat (xem
  // ChatSearchService.getMessageContext()).
  @Get(':id/messages/:messageId/context')
  getMessageContext(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
    @Query() query: MessageContextQueryDto,
  ) {
    return this.chatSearchService.getMessageContext(
      userId,
      id,
      messageId,
      query.before ?? 15,
      query.after ?? 15,
    );
  }

  @Post(':id/read')
  markRead(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.chatService.markRead(userId, id);
  }

  @Post(':id/mark-unread')
  markUnread(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.chatService.markUnread(userId, id);
  }

  @Patch(':id/settings')
  updateSettings(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConversationSettingsDto,
  ) {
    return this.chatService.updateSettings(userId, id, dto);
  }
}
