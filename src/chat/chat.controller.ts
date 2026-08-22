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
import { ChatService } from './chat.service';
import { ChatSearchService } from './chat-search.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto';
import { UpdateGroupInfoDto } from './dto/update-group-info.dto';
import { AddGroupMembersDto } from './dto/add-group-members.dto';
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

  @Patch(':id/group')
  updateGroupInfo(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGroupInfoDto,
  ) {
    return this.chatService.updateGroupInfo(userId, id, dto);
  }

  @Post(':id/leave')
  leaveGroup(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.chatService.leaveGroup(userId, id);
  }

  @Post(':id/members')
  addGroupMembers(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: AddGroupMembersDto,
  ) {
    return this.chatService.addGroupMembers(userId, id, dto.memberIds);
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

  @Get(':id/media')
  listMedia(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.listMedia(
      userId,
      id,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':id/pinned-messages')
  listPinnedMessages(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.chatService.listPinnedMessages(userId, id);
  }

  @Post(':id/messages/:messageId/pin')
  pinMessage(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.pinMessage(userId, id, messageId);
  }

  @Delete(':id/messages/:messageId/pin')
  unpinMessage(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.unpinMessage(userId, id, messageId);
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

  @Get(':id/read-receipts')
  listReadReceipts(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.chatService.listReadReceipts(userId, id);
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
