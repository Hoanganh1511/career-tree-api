import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { PostModule } from '../post/post.module';

@Module({
  imports: [PostModule],
  providers: [DocumentService],
  controllers: [DocumentController],
})
export class DocumentModule {}
