import { Module } from '@nestjs/common';
import { GifService } from './gif.service';
import { GifController } from './gif.controller';

@Module({
  providers: [GifService],
  controllers: [GifController],
})
export class GifModule {}
