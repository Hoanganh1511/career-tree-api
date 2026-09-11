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
  Query,
} from '@nestjs/common';
import { PostCollectionService } from './post-collection.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddItemDto } from './dto/add-item.dto';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('post-collections')
export class PostCollectionController {
  constructor(private collectionService: PostCollectionService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateCollectionDto) {
    return this.collectionService.create(userId, dto);
  }

  // Trang kham pha /collections - root path (khong tham so), khong trung
  // voi ':id' (khac so segment) nen khong can luu y thu tu khai bao.
  @Get()
  listPublic(
    @CurrentUserId() viewerId: string,
    @Query('scope') scope?: 'all' | 'following',
    @Query('topic') topic?: string,
    @Query('sort') sort?: 'newest' | 'most-posts' | 'az',
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.collectionService.listPublic(viewerId, {
      scope,
      topic,
      sort,
      search,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // 'mine' la path co dinh, khac tien to voi ':id' (khong phai wildcard
  // chung) nen khong can khai bao truoc/sau nhu user/post controller.
  @Get('mine')
  listMine(@CurrentUserId() userId: string) {
    return this.collectionService.listMine(userId);
  }

  @Get('user/:username')
  listByUsername(
    @CurrentUserId() viewerId: string,
    @Param('username') username: string,
  ) {
    return this.collectionService.listByUsername(viewerId, username);
  }

  @Get('membership/:postId')
  getMembership(
    @CurrentUserId() userId: string,
    @Param('postId') postId: string,
  ) {
    return this.collectionService.getMembership(userId, postId);
  }

  @Get(':id')
  getDetail(@CurrentUserId() viewerId: string, @Param('id') id: string) {
    return this.collectionService.getDetail(viewerId, id);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionService.update(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.collectionService.remove(userId, id);
  }

  @Post(':id/items')
  addItem(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ) {
    return this.collectionService.addItem(userId, id, dto.postId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/items/:postId')
  removeItem(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('postId') postId: string,
  ) {
    return this.collectionService.removeItem(userId, id, postId);
  }
}
