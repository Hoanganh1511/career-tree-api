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
import { Public } from '../auth/public.decorator';
import { BooksService } from './books.service';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreatePageDto } from './dto/create-page.dto';

// GL Life Book (Phase 1) - CHUA co auth that (@Public() tren ca 4 route,
// khong dung @CurrentUserId()) - hardcode 1 "demo user" duy nhat theo dung
// yeu cau Phase 1. Se doi @Public() -> JwtAuthGuard that + @CurrentUserId()
// khi noi tinh nang nay voi he thong tai khoan that o phase sau (chi can
// doi DEMO_USER_ID thanh @CurrentUserId() userId trong tung handler, service
// da nhan userId lam tham so san).
const DEMO_USER_ID = 'demo-user';

@Public()
@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(DEMO_USER_ID, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.booksService.update(DEMO_USER_ID, id, dto);
  }

  @Post(':id/pages')
  addPage(@Param('id') id: string, @Body() dto: CreatePageDto) {
    return this.booksService.addPage(DEMO_USER_ID, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id/pages/:pageId')
  removePage(@Param('id') id: string, @Param('pageId') pageId: string) {
    return this.booksService.removePage(DEMO_USER_ID, id, pageId);
  }
}
