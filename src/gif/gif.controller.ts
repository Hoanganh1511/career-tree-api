import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { GifService } from './gif.service';

@Controller('gifs')
export class GifController {
  constructor(private gifService: GifService) {}

  @Get('search')
  search(@Query('q') q?: string, @Query('limit') limit?: string) {
    if (!q?.trim()) {
      throw new BadRequestException('Thiếu tham số q');
    }
    return this.gifService.search(q, limit ? Number(limit) : undefined);
  }

  @Get('trending')
  trending(@Query('limit') limit?: string) {
    return this.gifService.trending(limit ? Number(limit) : undefined);
  }
}
