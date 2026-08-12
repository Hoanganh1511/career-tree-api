import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller()
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Get('users/:username/documents')
  listByAuthor(
    @CurrentUserId() userId: string,
    @Param('username') username: string,
  ) {
    return this.documentService.listByAuthor(userId, username);
  }

  @Get('users/:username/documents/:slug')
  async findBySlug(
    @CurrentUserId() userId: string,
    @Param('username') username: string,
    @Param('slug') slug: string,
  ) {
    const doc = await this.documentService.findBySlug(userId, username, slug);
    if (!doc) throw new NotFoundException();
    return doc;
  }

  @Get('knowledge-groups/:groupId/documents')
  listByGroup(
    @CurrentUserId() userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.documentService.listByGroup(userId, groupId);
  }

  @Post('documents')
  create(@CurrentUserId() userId: string, @Body() dto: CreateDocumentDto) {
    return this.documentService.create(userId, dto);
  }

  @Patch('documents/:id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentService.update(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('documents/:id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.documentService.remove(userId, id);
  }

  @Post('documents/:id/pin')
  pin(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.documentService.setPinned(userId, id, true);
  }

  @Delete('documents/:id/pin')
  unpin(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.documentService.setPinned(userId, id, false);
  }

  @Post('documents/:id/share')
  share(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.documentService.shareToFeed(userId, id);
  }
}
