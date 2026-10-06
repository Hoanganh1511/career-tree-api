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
import { NotesService } from './notes.service';
import { CurrentUserId } from '../auth/current-user.decorator';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

// Ghi chu ca nhan gan vao 1 doan text trong Series Entry - xem comment day du
// o schema.prisma (model Note) va notes.service.ts.
@Controller('notes')
export class NotesController {
  constructor(private notesService: NotesService) {}

  @Get()
  list(
    @CurrentUserId() userId: string,
    @Query('entryId') entryId?: string,
    @Query('seriesSlug') seriesSlug?: string,
  ) {
    return this.notesService.list(userId, entryId, seriesSlug);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateNoteDto) {
    return this.notesService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(userId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.notesService.remove(userId, id);
  }
}
