import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

const KIND_TO_FOLDER = {
  image: 'chat-images',
  file: 'chat-files',
  voice: 'chat-voice',
} as const;
type UploadKind = keyof typeof KIND_TO_FOLDER;

@Controller('uploads')
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('kind') kind?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu file');
    }
    if (!kind || !(kind in KIND_TO_FOLDER)) {
      throw new BadRequestException('kind phải là image, file hoặc voice');
    }
    return this.uploadService.upload(file, KIND_TO_FOLDER[kind as UploadKind]);
  }
}
